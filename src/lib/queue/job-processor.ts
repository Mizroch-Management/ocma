import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { platformManager } from '@/lib/integrations/social-platforms';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ScheduledPost {
  id: string;
  userId: string;
  organizationId: string;
  content: string;
  platforms: string[];
  mediaUrls?: string[];
  scheduledAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  metadata?: {
    hashtags?: string[];
    mentions?: string[];
    location?: {
      id: string;
      name: string;
    };
  };
}

export interface JobResult {
  success: boolean;
  postId?: string;
  platform: string;
  url?: string;
  error?: string;
}

export class JobProcessor {
  private isProcessing = false;
  private pollInterval = 30000; // 30 seconds

  constructor() {
    this.startPolling();
  }

  private startPolling() {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processScheduledPosts();
      }
    }, this.pollInterval);
  }

  async processScheduledPosts(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      console.log('Processing scheduled posts...');
      
      // Get posts that are ready to be published
      const { data: posts, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching scheduled posts:', error);
        return;
      }

      if (!posts || posts.length === 0) {
        console.log('No posts ready for publishing');
        return;
      }

      console.log(`Found ${posts.length} posts ready for publishing`);

      for (const post of posts) {
        await this.processPost(post);
      }
    } catch (error) {
      console.error('Error in processScheduledPosts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processPost(post: ScheduledPost): Promise<void> {
    try {
      console.log(`Processing post ${post.id} for platforms: ${post.platforms.join(', ')}`);
      
      // Mark as processing
      await this.updatePostStatus(post.id, 'processing');

      // Load user's connected accounts
      await platformManager.loadAccounts();

      // Publish to each platform
      const results: JobResult[] = [];
      
      for (const platformName of post.platforms) {
        try {
          const result = await this.publishToPlatform(post, platformName);
          results.push(result);
          
          // Store individual platform result
          await supabase
            .from('post_results')
            .insert({
              scheduled_post_id: post.id,
              platform: platformName,
              success: result.success,
              post_id: result.postId,
              url: result.url,
              error: result.error,
              published_at: new Date().toISOString()
            });
            
        } catch (error) {
          console.error(`Failed to publish to ${platformName}:`, error);
          results.push({
            success: false,
            platform: platformName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Determine overall status
      const successCount = results.filter(r => r.success).length;
      const hasFailures = results.some(r => !r.success);
      
      if (successCount === 0) {
        // All platforms failed
        await this.handlePostFailure(post, 'All platforms failed');
      } else if (hasFailures) {
        // Partial success
        await this.updatePostStatus(post.id, 'completed', 
          `Published to ${successCount}/${post.platforms.length} platforms`);
      } else {
        // Full success
        await this.updatePostStatus(post.id, 'completed');
      }

      // Send notifications if configured
      await this.sendNotifications(post, results);
      
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
      await this.handlePostFailure(post, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async publishToPlatform(post: ScheduledPost, platformName: string): Promise<JobResult> {
    // Get user's connected accounts for this platform
    const { data: accounts } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('user_id', post.userId)
      .eq('platform', platformName)
      .eq('is_active', true)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      throw new Error(`No active ${platformName} account found`);
    }

    const account = accounts[0];

    // Prepare content for publishing
    const postContent = {
      text: post.content,
      media: post.mediaUrls ? post.mediaUrls.map(url => ({
        url,
        type: 'image' as const // Determine actual type based on URL
      })) : undefined,
      hashtags: post.metadata?.hashtags,
      mentions: post.metadata?.mentions,
      location: post.metadata?.location
    };

    // Use platform manager to publish
    const results = await platformManager.publishToMultiplePlatforms(
      postContent,
      [account.id]
    );

    if (results.length === 0) {
      throw new Error('No publish results returned');
    }

    const result = results[0];
    
    return {
      success: result.success,
      postId: result.postId,
      platform: platformName,
      url: result.url,
      error: result.error
    };
  }

  private async updatePostStatus(
    postId: string, 
    status: ScheduledPost['status'], 
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.last_error = errorMessage;
    }

    if (status === 'completed') {
      updateData.published_at = new Date().toISOString();
    }

    await supabase
      .from('scheduled_posts')
      .update(updateData)
      .eq('id', postId);
  }

  private async handlePostFailure(post: ScheduledPost, errorMessage: string): Promise<void> {
    const newAttempts = (post.attempts || 0) + 1;
    
    if (newAttempts >= post.maxAttempts) {
      // Max attempts reached, mark as failed
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          last_error: errorMessage,
          attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      console.log(`Post ${post.id} failed after ${newAttempts} attempts`);
    } else {
      // Schedule retry
      const retryAt = new Date(Date.now() + this.getRetryDelay(newAttempts));
      
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'pending',
          scheduled_at: retryAt.toISOString(),
          last_error: errorMessage,
          attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      console.log(`Post ${post.id} scheduled for retry at ${retryAt.toISOString()}`);
    }
  }

  private getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1min, 5min, 15min, 30min
    const delays = [60000, 300000, 900000, 1800000];
    return delays[Math.min(attemptNumber - 1, delays.length - 1)];
  }

  private async sendNotifications(post: ScheduledPost, results: JobResult[]): Promise<void> {
    try {
      // Get user preferences for notifications
      const { data: user } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', post.userId)
        .single();

      if (!user?.notification_preferences?.post_publishing) {
        return; // User doesn't want post publishing notifications
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      let message: string;
      let type: 'success' | 'warning' | 'error';
      
      if (successCount === totalCount) {
        message = `Your post was successfully published to all ${totalCount} platforms!`;
        type = 'success';
      } else if (successCount > 0) {
        message = `Your post was published to ${successCount} out of ${totalCount} platforms. Check details for failed platforms.`;
        type = 'warning';
      } else {
        message = `Failed to publish your post to any platforms. Please check your account connections.`;
        type = 'error';
      }

      // Store notification
      await supabase
        .from('notifications')
        .insert({
          user_id: post.userId,
          type: 'post_publishing',
          title: 'Post Publishing Update',
          message,
          severity: type,
          data: {
            postId: post.id,
            results
          },
          created_at: new Date().toISOString()
        });

      // Send push notification if configured
      // Implementation would depend on your push notification service
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Add a post to the queue
  async schedulePost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
    const postId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('scheduled_posts')
      .insert({
        id: postId,
        user_id: post.userId,
        organization_id: post.organizationId,
        content: post.content,
        platforms: post.platforms,
        media_urls: post.mediaUrls,
        scheduled_at: post.scheduledAt.toISOString(),
        status: 'pending',
        max_attempts: post.maxAttempts || 3,
        attempts: 0,
        metadata: post.metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to schedule post: ${error.message}`);
    }

    console.log(`Post ${postId} scheduled for ${post.scheduledAt.toISOString()}`);
    return postId;
  }

  // Cancel a scheduled post
  async cancelPost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('scheduled_posts')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    return !error;
  }

  // Get user's scheduled posts
  async getUserScheduledPosts(userId: string, limit = 50): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        post_results (
          platform,
          success,
          post_id,
          url,
          error,
          published_at
        )
      `)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scheduled posts: ${error.message}`);
    }

    return data || [];
  }

  // Update Redis cache for real-time updates
  private async updateCache(key: string, data: any, ttl = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Redis cache update failed:', error);
    }
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis cache read failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor();