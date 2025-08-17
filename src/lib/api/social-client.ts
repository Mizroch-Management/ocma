// Real Social Media API Client Implementation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface SocialMetrics {
  followers: number;
  following: number;
  posts: number;
  engagement: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
  publishedAt: Date;
  metrics: SocialMetrics;
  url: string;
}

export class TwitterClient {
  private bearerToken: string;
  private apiUrl = 'https://api.twitter.com/2';

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  async getMetrics(userId: string): Promise<SocialMetrics> {
    const response = await fetch(
      `${this.apiUrl}/users/${userId}?user.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter metrics');
    }

    const data = await response.json();
    const metrics = data.data.public_metrics;

    return {
      followers: metrics.followers_count,
      following: metrics.following_count,
      posts: metrics.tweet_count,
      engagement: metrics.listed_count,
      impressions: 0, // Requires Twitter Analytics API
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
  }

  async postTweet(content: string, mediaIds?: string[]): Promise<string> {
    const body: any = { text: content };
    if (mediaIds?.length) {
      body.media = { media_ids: mediaIds };
    }

    const response = await fetch(`${this.apiUrl}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to post tweet');
    }

    const data = await response.json();
    return data.data.id;
  }

  async getTweetMetrics(tweetId: string): Promise<Partial<SocialMetrics>> {
    const response = await fetch(
      `${this.apiUrl}/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tweet metrics');
    }

    const data = await response.json();
    const metrics = data.data.public_metrics;

    return {
      impressions: metrics.impression_count,
      likes: metrics.like_count,
      comments: metrics.reply_count,
      shares: metrics.retweet_count,
      saves: metrics.bookmark_count,
    };
  }
}

export class InstagramClient {
  private accessToken: string;
  private apiUrl = 'https://graph.instagram.com/v18.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getMetrics(userId: string): Promise<SocialMetrics> {
    const response = await fetch(
      `${this.apiUrl}/${userId}?fields=followers_count,follows_count,media_count&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram metrics');
    }

    const data = await response.json();

    return {
      followers: data.followers_count,
      following: data.follows_count,
      posts: data.media_count,
      engagement: 0,
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
  }

  async getMediaInsights(mediaId: string): Promise<Partial<SocialMetrics>> {
    const response = await fetch(
      `${this.apiUrl}/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch media insights');
    }

    const data = await response.json();
    const insights: any = {};

    data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0].value;
    });

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      shares: insights.shares || 0,
      saves: insights.saved || 0,
    };
  }

  async createPost(
    caption: string,
    imageUrl: string,
    userId: string
  ): Promise<string> {
    // Create media container
    const containerResponse = await fetch(
      `${this.apiUrl}/${userId}/media?caption=${encodeURIComponent(
        caption
      )}&image_url=${encodeURIComponent(imageUrl)}&access_token=${
        this.accessToken
      }`,
      { method: 'POST' }
    );

    if (!containerResponse.ok) {
      throw new Error('Failed to create media container');
    }

    const container = await containerResponse.json();

    // Publish the container
    const publishResponse = await fetch(
      `${this.apiUrl}/${userId}/media_publish?creation_id=${container.id}&access_token=${this.accessToken}`,
      { method: 'POST' }
    );

    if (!publishResponse.ok) {
      throw new Error('Failed to publish Instagram post');
    }

    const published = await publishResponse.json();
    return published.id;
  }
}

export class LinkedInClient {
  private accessToken: string;
  private apiUrl = 'https://api.linkedin.com/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getProfile(): Promise<any> {
    const response = await fetch(`${this.apiUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    return response.json();
  }

  async getMetrics(organizationId: string): Promise<SocialMetrics> {
    const response = await fetch(
      `${this.apiUrl}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${organizationId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn metrics');
    }

    const data = await response.json();

    return {
      followers: data.elements[0]?.followerCounts?.total || 0,
      following: 0,
      posts: 0,
      engagement: 0,
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
  }

  async createPost(content: string, authorUrn: string): Promise<string> {
    const response = await fetch(`${this.apiUrl}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create LinkedIn post');
    }

    const data = await response.json();
    return data.id;
  }
}

// Unified Social Media Manager
export class SocialMediaManager {
  private supabase: ReturnType<typeof createClient>;
  private clients: Map<string, any> = new Map();

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async initializeClient(platform: string, userId: string) {
    // Get stored tokens from database
    const { data: connection } = await this.supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (!connection) {
      throw new Error(`No ${platform} connection found`);
    }

    switch (platform) {
      case 'twitter':
        this.clients.set(
          `${platform}_${userId}`,
          new TwitterClient(connection.access_token)
        );
        break;
      case 'instagram':
        this.clients.set(
          `${platform}_${userId}`,
          new InstagramClient(connection.access_token)
        );
        break;
      case 'linkedin':
        this.clients.set(
          `${platform}_${userId}`,
          new LinkedInClient(connection.access_token)
        );
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  getClient(platform: string, userId: string) {
    const key = `${platform}_${userId}`;
    if (!this.clients.has(key)) {
      throw new Error(`Client not initialized for ${platform}`);
    }
    return this.clients.get(key);
  }

  async fetchAllMetrics(userId: string): Promise<Record<string, SocialMetrics>> {
    const { data: connections } = await this.supabase
      .from('social_connections')
      .select('platform, account_id')
      .eq('user_id', userId);

    const metrics: Record<string, SocialMetrics> = {};

    for (const connection of connections || []) {
      try {
        await this.initializeClient(connection.platform, userId);
        const client = this.getClient(connection.platform, userId);
        
        if (connection.platform === 'twitter') {
          metrics[connection.platform] = await client.getMetrics(connection.account_id);
        } else if (connection.platform === 'instagram') {
          metrics[connection.platform] = await client.getMetrics(connection.account_id);
        } else if (connection.platform === 'linkedin') {
          metrics[connection.platform] = await client.getMetrics(connection.account_id);
        }
      } catch (error) {
        console.error(`Failed to fetch ${connection.platform} metrics:`, error);
      }
    }

    return metrics;
  }

  async postToAllPlatforms(
    userId: string,
    content: string,
    mediaUrls?: string[]
  ): Promise<Record<string, string>> {
    const { data: connections } = await this.supabase
      .from('social_connections')
      .select('platform, account_id')
      .eq('user_id', userId);

    const results: Record<string, string> = {};

    for (const connection of connections || []) {
      try {
        await this.initializeClient(connection.platform, userId);
        const client = this.getClient(connection.platform, userId);
        
        if (connection.platform === 'twitter') {
          results[connection.platform] = await client.postTweet(content);
        } else if (connection.platform === 'instagram' && mediaUrls?.[0]) {
          results[connection.platform] = await client.createPost(
            content,
            mediaUrls[0],
            connection.account_id
          );
        } else if (connection.platform === 'linkedin') {
          results[connection.platform] = await client.createPost(
            content,
            connection.account_id
          );
        }
      } catch (error) {
        console.error(`Failed to post to ${connection.platform}:`, error);
      }
    }

    return results;
  }
}

export const socialMediaManager = new SocialMediaManager();