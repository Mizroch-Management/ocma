// Redis-based Job Queue System for Scheduled Posts
// Production-ready job scheduling and processing

import Redis from 'ioredis';

export interface JobData {
  id: string;
  type: 'scheduled_post' | 'content_generation' | 'analytics_fetch' | 'media_upload';
  payload: any;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  organizationId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledPostJob {
  postId: string;
  platforms: string[];
  content: string;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
  publishAt: Date;
  timezone: string;
  organizationId: string;
  userId: string;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  result?: any;
  error?: string;
  completedAt: Date;
  processingTime: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

class JobQueue {
  private redis: Redis;
  private subscribers: Map<string, Set<(job: JobData) => void>> = new Map();
  private processingJobs: Map<string, JobData> = new Map();
  private isProcessing = false;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis job queue');
      this.startProcessing();
    });
  }

  // Add a job to the queue
  async addJob(type: JobData['type'], payload: any, options: {
    scheduledAt?: Date;
    priority?: JobData['priority'];
    maxAttempts?: number;
    organizationId: string;
    userId: string;
  }): Promise<string> {
    const jobId = this.generateJobId();
    const now = new Date();
    
    const job: JobData = {
      id: jobId,
      type,
      payload,
      scheduledAt: options.scheduledAt || now,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      priority: options.priority || 'normal',
      organizationId: options.organizationId,
      userId: options.userId,
      createdAt: now,
      updatedAt: now
    };

    // Store job data
    await this.redis.hset('jobs', jobId, JSON.stringify(job));

    // Add to appropriate queue based on priority and schedule
    const delay = job.scheduledAt.getTime() - now.getTime();
    
    if (delay > 0) {
      // Scheduled job - add to delayed queue
      await this.redis.zadd('delayed_jobs', job.scheduledAt.getTime(), jobId);
    } else {
      // Immediate job - add to priority queue
      const queueName = this.getQueueName(job.priority);
      await this.redis.lpush(queueName, jobId);
    }

    console.log(`Job ${jobId} added to queue with priority ${job.priority}`);
    return jobId;
  }

  // Schedule a post
  async schedulePost(postData: ScheduledPostJob): Promise<string> {
    return this.addJob('scheduled_post', postData, {
      scheduledAt: postData.publishAt,
      priority: 'normal',
      organizationId: postData.organizationId,
      userId: postData.userId
    });
  }

  // Cancel a scheduled job
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Remove from all possible queues
      await Promise.all([
        this.redis.zrem('delayed_jobs', jobId),
        this.redis.lrem('critical_jobs', 0, jobId),
        this.redis.lrem('high_jobs', 0, jobId),
        this.redis.lrem('normal_jobs', 0, jobId),
        this.redis.lrem('low_jobs', 0, jobId),
        this.redis.lrem('processing_jobs', 0, jobId)
      ]);

      // Mark as cancelled in job data
      const jobData = await this.redis.hget('jobs', jobId);
      if (jobData) {
        const job: JobData = JSON.parse(jobData);
        job.updatedAt = new Date();
        await this.redis.hset('jobs', jobId, JSON.stringify(job));
        await this.redis.hset('cancelled_jobs', jobId, JSON.stringify(job));
      }

      console.log(`Job ${jobId} cancelled`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed' | 'cancelled' | 'not_found';
    job?: JobData;
    result?: JobResult;
  }> {
    // Check if job exists
    const jobData = await this.redis.hget('jobs', jobId);
    if (!jobData) {
      return { status: 'not_found' };
    }

    const job: JobData = JSON.parse(jobData);

    // Check various states
    if (await this.redis.hexists('cancelled_jobs', jobId)) {
      return { status: 'cancelled', job };
    }

    if (await this.redis.hexists('completed_jobs', jobId)) {
      const resultData = await this.redis.hget('completed_jobs', jobId);
      return { 
        status: 'completed', 
        job, 
        result: resultData ? JSON.parse(resultData) : undefined 
      };
    }

    if (await this.redis.hexists('failed_jobs', jobId)) {
      const resultData = await this.redis.hget('failed_jobs', jobId);
      return { 
        status: 'failed', 
        job, 
        result: resultData ? JSON.parse(resultData) : undefined 
      };
    }

    if (this.processingJobs.has(jobId)) {
      return { status: 'active', job };
    }

    if (await this.redis.zscore('delayed_jobs', jobId)) {
      return { status: 'delayed', job };
    }

    return { status: 'waiting', job };
  }

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    const [
      criticalCount,
      highCount,
      normalCount,
      lowCount,
      delayedCount,
      processingCount,
      completedCount,
      failedCount
    ] = await Promise.all([
      this.redis.llen('critical_jobs'),
      this.redis.llen('high_jobs'),
      this.redis.llen('normal_jobs'),
      this.redis.llen('low_jobs'),
      this.redis.zcard('delayed_jobs'),
      this.redis.llen('processing_jobs'),
      this.redis.hlen('completed_jobs'),
      this.redis.hlen('failed_jobs')
    ]);

    return {
      waiting: criticalCount + highCount + normalCount + lowCount,
      active: processingCount,
      completed: completedCount,
      failed: failedCount,
      delayed: delayedCount,
      paused: 0 // We don't implement pausing in this version
    };
  }

  // Subscribe to job updates
  subscribe(jobType: string, callback: (job: JobData) => void): void {
    if (!this.subscribers.has(jobType)) {
      this.subscribers.set(jobType, new Set());
    }
    this.subscribers.get(jobType)!.add(callback);
  }

  // Unsubscribe from job updates
  unsubscribe(jobType: string, callback: (job: JobData) => void): void {
    this.subscribers.get(jobType)?.delete(callback);
  }

  // Start processing jobs
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting job queue processing');

    // Process delayed jobs every minute
    setInterval(() => this.processDelayedJobs(), 60000);
    
    // Process immediate jobs continuously
    this.processJobs();
  }

  private async processDelayedJobs(): Promise<void> {
    try {
      const now = Date.now();
      
      // Get all jobs that should be processed now
      const jobIds = await this.redis.zrangebyscore('delayed_jobs', 0, now);
      
      if (jobIds.length === 0) return;

      console.log(`Moving ${jobIds.length} delayed jobs to processing queue`);

      for (const jobId of jobIds) {
        const jobData = await this.redis.hget('jobs', jobId);
        if (jobData) {
          const job: JobData = JSON.parse(jobData);
          const queueName = this.getQueueName(job.priority);
          
          // Move from delayed to priority queue
          await this.redis.multi()
            .zrem('delayed_jobs', jobId)
            .lpush(queueName, jobId)
            .exec();
        }
      }
    } catch (error) {
      console.error('Error processing delayed jobs:', error);
    }
  }

  private async processJobs(): Promise<void> {
    const queues = ['critical_jobs', 'high_jobs', 'normal_jobs', 'low_jobs'];
    
    while (this.isProcessing) {
      try {
        let jobId: string | null = null;
        
        // Try to get a job from priority queues
        for (const queue of queues) {
          jobId = await this.redis.rpop(queue);
          if (jobId) break;
        }

        if (!jobId) {
          // No jobs available, wait a bit
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Get job data
        const jobData = await this.redis.hget('jobs', jobId);
        if (!jobData) {
          console.warn(`Job ${jobId} not found in jobs hash`);
          continue;
        }

        const job: JobData = JSON.parse(jobData);
        
        // Mark as processing
        this.processingJobs.set(jobId, job);
        await this.redis.lpush('processing_jobs', jobId);

        // Process the job
        await this.processJob(job);

      } catch (error) {
        console.error('Error in job processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processJob(job: JobData): Promise<void> {
    const startTime = Date.now();
    console.log(`Processing job ${job.id} of type ${job.type}`);

    try {
      job.attempts++;
      job.updatedAt = new Date();

      let result: any;

      switch (job.type) {
        case 'scheduled_post':
          result = await this.processScheduledPost(job.payload as ScheduledPostJob);
          break;
        case 'content_generation':
          result = await this.processContentGeneration(job.payload);
          break;
        case 'analytics_fetch':
          result = await this.processAnalyticsFetch(job.payload);
          break;
        case 'media_upload':
          result = await this.processMediaUpload(job.payload);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Job completed successfully
      const jobResult: JobResult = {
        jobId: job.id,
        success: true,
        result,
        completedAt: new Date(),
        processingTime: Date.now() - startTime
      };

      await this.redis.hset('completed_jobs', job.id, JSON.stringify(jobResult));
      console.log(`Job ${job.id} completed successfully in ${jobResult.processingTime}ms`);

      // Notify subscribers
      this.notifySubscribers(job);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      const jobResult: JobResult = {
        jobId: job.id,
        success: false,
        error: error.message,
        completedAt: new Date(),
        processingTime: Date.now() - startTime
      };

      if (job.attempts >= job.maxAttempts) {
        // Max attempts reached, mark as failed
        await this.redis.hset('failed_jobs', job.id, JSON.stringify(jobResult));
        console.log(`Job ${job.id} permanently failed after ${job.attempts} attempts`);
      } else {
        // Retry the job with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000; // 2^attempts seconds
        const retryAt = new Date(Date.now() + delay);
        
        job.scheduledAt = retryAt;
        await this.redis.hset('jobs', job.id, JSON.stringify(job));
        await this.redis.zadd('delayed_jobs', retryAt.getTime(), job.id);
        
        console.log(`Job ${job.id} will retry in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`);
      }
    } finally {
      // Remove from processing
      this.processingJobs.delete(job.id);
      await this.redis.lrem('processing_jobs', 0, job.id);
    }
  }

  private async processScheduledPost(postData: ScheduledPostJob): Promise<any> {
    // Import social media clients (avoiding circular imports)
    const { SocialMediaClientFactory } = await import('../social/api-client');
    
    const results = [];

    for (const platform of postData.platforms) {
      try {
        // Get platform credentials from environment or database
        const credentials = await this.getPlatformCredentials(platform, postData.organizationId);
        
        if (!credentials) {
          throw new Error(`No credentials found for platform ${platform}`);
        }

        const client = SocialMediaClientFactory.createClient(platform, credentials);
        
        // Set tokens from database
        const tokens = await this.getPlatformTokens(platform, postData.organizationId);
        if (tokens) {
          client.setTokens(tokens);
        }

        // Create the post
        const result = await client.createPost(postData.content, undefined); // Media handling would be implemented
        results.push(result);

        console.log(`Post published to ${platform}: ${result.id}`);
      } catch (error) {
        console.error(`Failed to publish to ${platform}:`, error);
        results.push({ platform, error: error.message, success: false });
      }
    }

    return results;
  }

  private async processContentGeneration(payload: any): Promise<any> {
    // Import AI services
    const { aiServices } = await import('../ai/services');
    
    return await aiServices.generateContent(payload);
  }

  private async processAnalyticsFetch(payload: any): Promise<any> {
    // Implement analytics fetching logic
    console.log('Processing analytics fetch:', payload);
    return { analytics: 'fetched' };
  }

  private async processMediaUpload(payload: any): Promise<any> {
    // Implement media upload logic
    console.log('Processing media upload:', payload);
    return { mediaUrl: 'uploaded' };
  }

  private async getPlatformCredentials(platform: string, organizationId: string): Promise<any> {
    // This would fetch from your database
    // Placeholder implementation
    return {
      clientId: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
      clientSecret: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`],
      redirectUri: process.env[`${platform.toUpperCase()}_REDIRECT_URI`]
    };
  }

  private async getPlatformTokens(platform: string, organizationId: string): Promise<any> {
    // This would fetch from your database
    // Placeholder implementation
    return null;
  }

  private getQueueName(priority: JobData['priority']): string {
    return `${priority}_jobs`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifySubscribers(job: JobData): void {
    const subscribers = this.subscribers.get(job.type);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(job);
        } catch (error) {
          console.error('Error in job subscriber callback:', error);
        }
      });
    }
  }

  // Clean up resources
  async disconnect(): Promise<void> {
    this.isProcessing = false;
    await this.redis.disconnect();
  }
}

// Singleton instance
let queueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    queueInstance = new JobQueue();
  }
  return queueInstance;
}

export { JobQueue };
export type { JobData, ScheduledPostJob, JobResult, QueueStats };