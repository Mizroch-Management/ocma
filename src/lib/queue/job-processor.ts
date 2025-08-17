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
      console.log(`Processing post ${post.id} for platforms: ${post.platforms.join(', ')}`);\n      \n      // Mark as processing\n      await this.updatePostStatus(post.id, 'processing');\n\n      // Load user's connected accounts\n      await platformManager.loadAccounts();\n\n      // Publish to each platform\n      const results: JobResult[] = [];\n      \n      for (const platformName of post.platforms) {\n        try {\n          const result = await this.publishToPlatform(post, platformName);\n          results.push(result);\n          \n          // Store individual platform result\n          await supabase\n            .from('post_results')\n            .insert({\n              scheduled_post_id: post.id,\n              platform: platformName,\n              success: result.success,\n              post_id: result.postId,\n              url: result.url,\n              error: result.error,\n              published_at: new Date().toISOString()\n            });\n            \n        } catch (error) {\n          console.error(`Failed to publish to ${platformName}:`, error);\n          results.push({\n            success: false,\n            platform: platformName,\n            error: error instanceof Error ? error.message : 'Unknown error'\n          });\n        }\n      }\n\n      // Determine overall status\n      const successCount = results.filter(r => r.success).length;\n      const hasFailures = results.some(r => !r.success);\n      \n      if (successCount === 0) {\n        // All platforms failed\n        await this.handlePostFailure(post, 'All platforms failed');\n      } else if (hasFailures) {\n        // Partial success\n        await this.updatePostStatus(post.id, 'completed', \n          `Published to ${successCount}/${post.platforms.length} platforms`);\n      } else {\n        // Full success\n        await this.updatePostStatus(post.id, 'completed');\n      }\n\n      // Send notifications if configured\n      await this.sendNotifications(post, results);\n      \n    } catch (error) {\n      console.error(`Error processing post ${post.id}:`, error);\n      await this.handlePostFailure(post, error instanceof Error ? error.message : 'Unknown error');\n    }\n  }\n\n  private async publishToPlatform(post: ScheduledPost, platformName: string): Promise<JobResult> {\n    // Get user's connected accounts for this platform\n    const { data: accounts } = await supabase\n      .from('platform_accounts')\n      .select('*')\n      .eq('user_id', post.userId)\n      .eq('platform', platformName)\n      .eq('is_active', true)\n      .limit(1);\n\n    if (!accounts || accounts.length === 0) {\n      throw new Error(`No active ${platformName} account found`);\n    }\n\n    const account = accounts[0];\n\n    // Prepare content for publishing\n    const postContent = {\n      text: post.content,\n      media: post.mediaUrls ? post.mediaUrls.map(url => ({\n        url,\n        type: 'image' as const // Determine actual type based on URL\n      })) : undefined,\n      hashtags: post.metadata?.hashtags,\n      mentions: post.metadata?.mentions,\n      location: post.metadata?.location\n    };\n\n    // Use platform manager to publish\n    const results = await platformManager.publishToMultiplePlatforms(\n      postContent,\n      [account.id]\n    );\n\n    if (results.length === 0) {\n      throw new Error('No publish results returned');\n    }\n\n    const result = results[0];\n    \n    return {\n      success: result.success,\n      postId: result.postId,\n      platform: platformName,\n      url: result.url,\n      error: result.error\n    };\n  }\n\n  private async updatePostStatus(\n    postId: string, \n    status: ScheduledPost['status'], \n    errorMessage?: string\n  ): Promise<void> {\n    const updateData: any = {\n      status,\n      updated_at: new Date().toISOString()\n    };\n\n    if (errorMessage) {\n      updateData.last_error = errorMessage;\n    }\n\n    if (status === 'completed') {\n      updateData.published_at = new Date().toISOString();\n    }\n\n    await supabase\n      .from('scheduled_posts')\n      .update(updateData)\n      .eq('id', postId);\n  }\n\n  private async handlePostFailure(post: ScheduledPost, errorMessage: string): Promise<void> {\n    const newAttempts = (post.attempts || 0) + 1;\n    \n    if (newAttempts >= post.maxAttempts) {\n      // Max attempts reached, mark as failed\n      await supabase\n        .from('scheduled_posts')\n        .update({\n          status: 'failed',\n          last_error: errorMessage,\n          attempts: newAttempts,\n          updated_at: new Date().toISOString()\n        })\n        .eq('id', post.id);\n\n      console.log(`Post ${post.id} failed after ${newAttempts} attempts`);\n    } else {\n      // Schedule retry\n      const retryAt = new Date(Date.now() + this.getRetryDelay(newAttempts));\n      \n      await supabase\n        .from('scheduled_posts')\n        .update({\n          status: 'pending',\n          scheduled_at: retryAt.toISOString(),\n          last_error: errorMessage,\n          attempts: newAttempts,\n          updated_at: new Date().toISOString()\n        })\n        .eq('id', post.id);\n\n      console.log(`Post ${post.id} scheduled for retry at ${retryAt.toISOString()}`);\n    }\n  }\n\n  private getRetryDelay(attemptNumber: number): number {\n    // Exponential backoff: 1min, 5min, 15min, 30min\n    const delays = [60000, 300000, 900000, 1800000];\n    return delays[Math.min(attemptNumber - 1, delays.length - 1)];\n  }\n\n  private async sendNotifications(post: ScheduledPost, results: JobResult[]): Promise<void> {\n    try {\n      // Get user preferences for notifications\n      const { data: user } = await supabase\n        .from('profiles')\n        .select('notification_preferences')\n        .eq('id', post.userId)\n        .single();\n\n      if (!user?.notification_preferences?.post_publishing) {\n        return; // User doesn't want post publishing notifications\n      }\n\n      const successCount = results.filter(r => r.success).length;\n      const totalCount = results.length;\n\n      let message: string;\n      let type: 'success' | 'warning' | 'error';\n      \n      if (successCount === totalCount) {\n        message = `Your post was successfully published to all ${totalCount} platforms!`;\n        type = 'success';\n      } else if (successCount > 0) {\n        message = `Your post was published to ${successCount} out of ${totalCount} platforms. Check details for failed platforms.`;\n        type = 'warning';\n      } else {\n        message = `Failed to publish your post to any platforms. Please check your account connections.`;\n        type = 'error';\n      }\n\n      // Store notification\n      await supabase\n        .from('notifications')\n        .insert({\n          user_id: post.userId,\n          type: 'post_publishing',\n          title: 'Post Publishing Update',\n          message,\n          severity: type,\n          data: {\n            postId: post.id,\n            results\n          },\n          created_at: new Date().toISOString()\n        });\n\n      // Send push notification if configured\n      // Implementation would depend on your push notification service\n      \n    } catch (error) {\n      console.error('Error sending notifications:', error);\n    }\n  }\n\n  // Add a post to the queue\n  async schedulePost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'attempts'>): Promise<string> {\n    const postId = crypto.randomUUID();\n    \n    const { error } = await supabase\n      .from('scheduled_posts')\n      .insert({\n        id: postId,\n        user_id: post.userId,\n        organization_id: post.organizationId,\n        content: post.content,\n        platforms: post.platforms,\n        media_urls: post.mediaUrls,\n        scheduled_at: post.scheduledAt.toISOString(),\n        status: 'pending',\n        max_attempts: post.maxAttempts || 3,\n        attempts: 0,\n        metadata: post.metadata,\n        created_at: new Date().toISOString()\n      });\n\n    if (error) {\n      throw new Error(`Failed to schedule post: ${error.message}`);\n    }\n\n    console.log(`Post ${postId} scheduled for ${post.scheduledAt.toISOString()}`);\n    return postId;\n  }\n\n  // Cancel a scheduled post\n  async cancelPost(postId: string, userId: string): Promise<boolean> {\n    const { error } = await supabase\n      .from('scheduled_posts')\n      .update({\n        status: 'cancelled',\n        updated_at: new Date().toISOString()\n      })\n      .eq('id', postId)\n      .eq('user_id', userId)\n      .eq('status', 'pending');\n\n    return !error;\n  }\n\n  // Get user's scheduled posts\n  async getUserScheduledPosts(userId: string, limit = 50): Promise<ScheduledPost[]> {\n    const { data, error } = await supabase\n      .from('scheduled_posts')\n      .select(`\n        *,\n        post_results (\n          platform,\n          success,\n          post_id,\n          url,\n          error,\n          published_at\n        )\n      `)\n      .eq('user_id', userId)\n      .order('scheduled_at', { ascending: false })\n      .limit(limit);\n\n    if (error) {\n      throw new Error(`Failed to fetch scheduled posts: ${error.message}`);\n    }\n\n    return data || [];\n  }\n\n  // Update Redis cache for real-time updates\n  private async updateCache(key: string, data: any, ttl = 3600): Promise<void> {\n    try {\n      await redis.setex(key, ttl, JSON.stringify(data));\n    } catch (error) {\n      console.error('Redis cache update failed:', error);\n    }\n  }\n\n  private async getFromCache(key: string): Promise<any> {\n    try {\n      const data = await redis.get(key);\n      return data ? JSON.parse(data) : null;\n    } catch (error) {\n      console.error('Redis cache read failed:', error);\n      return null;\n    }\n  }\n}\n\n// Export singleton instance\nexport const jobProcessor = new JobProcessor();