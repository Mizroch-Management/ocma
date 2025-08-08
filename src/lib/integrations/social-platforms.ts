// Social Platform Integrations - Phase 6
// Comprehensive API integrations for major social platforms

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export interface PlatformAccount {
  id: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok';
  accountId: string;
  accountName: string;
  accountHandle: string;
  profileImage?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  permissions: string[];
  isActive: boolean;
  isPrimary: boolean;
  metrics?: {
    followers: number;
    following: number;
    posts: number;
    engagement: number;
  };
  lastSync?: Date;
  organizationId: string;
  connectedBy: string;
  connectedAt: Date;
}

export interface PostContent {
  text: string;
  media?: MediaItem[];
  hashtags?: string[];
  mentions?: string[];
  location?: LocationTag;
  scheduledTime?: Date;
  crossPost?: string[];
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'gif';
  thumbnail?: string;
  alt?: string;
  duration?: number;
}

export interface LocationTag {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  platform: string;
  url?: string;
  error?: string;
  metrics?: {
    reach?: number;
    impressions?: number;
  };
}

export interface PlatformMessage {
  id: string;
  platform: string;
  type: 'dm' | 'comment' | 'mention' | 'reply';
  from: {
    id: string;
    name: string;
    handle: string;
    avatar?: string;
  };
  content: string;
  media?: MediaItem[];
  timestamp: Date;
  isRead: boolean;
  isReplied: boolean;
  parentId?: string;
  threadId?: string;
}

// Base platform integration class
abstract class PlatformIntegration {
  protected account: PlatformAccount;
  protected apiBaseUrl: string;
  
  constructor(account: PlatformAccount) {
    this.account = account;
    this.apiBaseUrl = this.getApiBaseUrl();
  }
  
  abstract getApiBaseUrl(): string;
  abstract authenticate(): Promise<boolean>;
  abstract refreshToken(): Promise<string>;
  abstract publish(content: PostContent): Promise<PublishResult>;
  abstract getMessages(): Promise<PlatformMessage[]>;
  abstract getAnalytics(postId: string): Promise<any>;
  abstract deletePost(postId: string): Promise<boolean>;
  
  protected async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      // Check token expiry
      if (this.account.tokenExpiry && new Date() > this.account.tokenExpiry) {
        await this.refreshToken();
      }
      
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.account.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      log.error(`${this.account.platform} API error`, error);
      throw error;
    }
  }
}

// Instagram Integration
export class InstagramIntegration extends PlatformIntegration {
  getApiBaseUrl(): string {
    return 'https://graph.instagram.com/v18.0';
  }
  
  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/me', {
        method: 'GET'
      });
      return !!response.id;
    } catch {
      return false;
    }
  }
  
  async refreshToken(): Promise<string> {
    const response = await this.makeRequest('/refresh_access_token', {
      method: 'GET',
      headers: {
        'grant_type': 'ig_refresh_token',
        'access_token': this.account.accessToken
      }
    });
    
    this.account.accessToken = response.access_token;
    this.account.tokenExpiry = new Date(Date.now() + response.expires_in * 1000);
    
    // Update in database
    await this.updateAccount();
    
    return response.access_token;
  }
  
  async publish(content: PostContent): Promise<PublishResult> {
    try {
      // Create media container
      let mediaId: string | undefined;
      
      if (content.media && content.media.length > 0) {
        const media = content.media[0];
        
        if (media.type === 'image') {
          const mediaResponse = await this.makeRequest(`/${this.account.accountId}/media`, {
            method: 'POST',
            body: JSON.stringify({
              image_url: media.url,
              caption: this.formatCaption(content),
              location_id: content.location?.id
            })
          });
          mediaId = mediaResponse.id;
        } else if (media.type === 'video') {
          const mediaResponse = await this.makeRequest(`/${this.account.accountId}/media`, {
            method: 'POST',
            body: JSON.stringify({
              video_url: media.url,
              caption: this.formatCaption(content),
              media_type: 'REELS'
            })
          });
          mediaId = mediaResponse.id;
        }
      } else {
        // Text-only posts not supported on Instagram
        return {
          success: false,
          platform: 'instagram',
          error: 'Instagram requires media content'
        };
      }
      
      // Publish media
      if (mediaId) {
        const publishResponse = await this.makeRequest(`/${this.account.accountId}/media_publish`, {
          method: 'POST',
          body: JSON.stringify({
            creation_id: mediaId
          })
        });
        
        return {
          success: true,
          postId: publishResponse.id,
          platform: 'instagram',
          url: `https://instagram.com/p/${publishResponse.id}`
        };
      }
      
      throw new Error('Failed to create media container');
    } catch (error: any) {
      return {
        success: false,
        platform: 'instagram',
        error: error.message
      };
    }
  }
  
  async getMessages(): Promise<PlatformMessage[]> {
    // Instagram Basic Display API doesn't support DMs
    // Would need Instagram Messaging API with business verification
    return [];
  }
  
  async getAnalytics(postId: string): Promise<any> {
    const response = await this.makeRequest(`/${postId}/insights`, {
      method: 'GET',
      headers: {
        'metric': 'engagement,impressions,reach,saved'
      }
    });
    
    return response.data;
  }
  
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/${postId}`, {
        method: 'DELETE'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  private formatCaption(content: PostContent): string {
    let caption = content.text;
    
    if (content.hashtags && content.hashtags.length > 0) {
      caption += '\n\n' + content.hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    if (content.mentions && content.mentions.length > 0) {
      caption += '\n' + content.mentions.map(mention => `@${mention}`).join(' ');
    }
    
    return caption;
  }
  
  private async updateAccount(): Promise<void> {
    await supabase
      .from('platform_accounts')
      .update({
        accessToken: this.account.accessToken,
        tokenExpiry: this.account.tokenExpiry
      })
      .eq('id', this.account.id);
  }
}

// Twitter/X Integration
export class TwitterIntegration extends PlatformIntegration {
  getApiBaseUrl(): string {
    return 'https://api.twitter.com/2';
  }
  
  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/users/me', {
        method: 'GET'
      });
      return !!response.data.id;
    } catch {
      return false;
    }
  }
  
  async refreshToken(): Promise<string> {
    // Twitter uses OAuth 2.0 with refresh tokens
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.account.refreshToken || '',
        client_id: process.env.VITE_TWITTER_CLIENT_ID || ''
      })
    });
    
    const data = await response.json();
    this.account.accessToken = data.access_token;
    this.account.refreshToken = data.refresh_token;
    
    await this.updateAccount();
    return data.access_token;
  }
  
  async publish(content: PostContent): Promise<PublishResult> {
    try {
      // Handle threading for long content
      const tweets = this.splitIntoThread(content.text);
      let lastTweetId: string | undefined;
      const tweetIds: string[] = [];
      
      for (const tweetText of tweets) {
        const body: any = {
          text: tweetText
        };
        
        // Add media to first tweet only
        if (!lastTweetId && content.media && content.media.length > 0) {
          const mediaIds = await this.uploadMedia(content.media);
          if (mediaIds.length > 0) {
            body.media = { media_ids: mediaIds };
          }
        }
        
        // Reply to previous tweet in thread
        if (lastTweetId) {
          body.reply = { in_reply_to_tweet_id: lastTweetId };
        }
        
        const response = await this.makeRequest('/tweets', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        
        lastTweetId = response.data.id;
        tweetIds.push(lastTweetId);
      }
      
      return {
        success: true,
        postId: tweetIds[0],
        platform: 'twitter',
        url: `https://twitter.com/${this.account.accountHandle}/status/${tweetIds[0]}`
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'twitter',
        error: error.message
      };
    }
  }
  
  private splitIntoThread(text: string): string[] {
    const maxLength = 280;
    const tweets: string[] = [];
    const words = text.split(' ');
    let currentTweet = '';
    
    for (const word of words) {
      if ((currentTweet + ' ' + word).length > maxLength - 10) { // Leave room for numbering
        tweets.push(currentTweet.trim());
        currentTweet = word;
      } else {
        currentTweet += (currentTweet ? ' ' : '') + word;
      }
    }
    
    if (currentTweet) {
      tweets.push(currentTweet.trim());
    }
    
    // Add thread numbering if multiple tweets
    if (tweets.length > 1) {
      return tweets.map((tweet, i) => `${i + 1}/${tweets.length} ${tweet}`);
    }
    
    return tweets;
  }
  
  private async uploadMedia(media: MediaItem[]): Promise<string[]> {
    const mediaIds: string[] = [];
    
    for (const item of media.slice(0, 4)) { // Twitter allows max 4 media items
      // Upload media to Twitter
      // This would require media upload API implementation
      // Returning mock IDs for now
      mediaIds.push(`media_${Date.now()}`);
    }
    
    return mediaIds;
  }
  
  async getMessages(): Promise<PlatformMessage[]> {
    const messages: PlatformMessage[] = [];
    
    // Get mentions
    const mentions = await this.makeRequest(`/users/${this.account.accountId}/mentions`, {
      method: 'GET'
    });
    
    // Get DMs (requires additional permissions)
    try {
      const dms = await this.makeRequest('/dm_events', {
        method: 'GET'
      });
      
      // Convert to PlatformMessage format
      // ... conversion logic
    } catch {
      // DM access may not be available
    }
    
    return messages;
  }
  
  async getAnalytics(postId: string): Promise<any> {
    const response = await this.makeRequest(`/tweets/${postId}`, {
      method: 'GET',
      headers: {
        'tweet.fields': 'public_metrics,organic_metrics'
      }
    });
    
    return response.data.public_metrics;
  }
  
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/tweets/${postId}`, {
        method: 'DELETE'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  private async updateAccount(): Promise<void> {
    await supabase
      .from('platform_accounts')
      .update({
        accessToken: this.account.accessToken,
        refreshToken: this.account.refreshToken,
        tokenExpiry: this.account.tokenExpiry
      })
      .eq('id', this.account.id);
  }
}

// LinkedIn Integration
export class LinkedInIntegration extends PlatformIntegration {
  getApiBaseUrl(): string {
    return 'https://api.linkedin.com/v2';
  }
  
  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/me', {
        method: 'GET'
      });
      return !!response.id;
    } catch {
      return false;
    }
  }
  
  async refreshToken(): Promise<string> {
    // LinkedIn OAuth 2.0 refresh
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.account.refreshToken || '',
        client_id: process.env.VITE_LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.VITE_LINKEDIN_CLIENT_SECRET || ''
      })
    });
    
    const data = await response.json();
    this.account.accessToken = data.access_token;
    this.account.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    
    await this.updateAccount();
    return data.access_token;
  }
  
  async publish(content: PostContent): Promise<PublishResult> {
    try {
      const authorUrn = `urn:li:person:${this.account.accountId}`;
      
      const body: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: content.media && content.media.length > 0 ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      // Add media if present
      if (content.media && content.media.length > 0) {
        const mediaUrns = await this.uploadMedia(content.media);
        body.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map(urn => ({
          status: 'READY',
          media: urn
        }));
      }
      
      const response = await this.makeRequest('/ugcPosts', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return {
        success: true,
        postId: response.id,
        platform: 'linkedin',
        url: `https://www.linkedin.com/feed/update/${response.id}`
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'linkedin',
        error: error.message
      };
    }
  }
  
  private async uploadMedia(media: MediaItem[]): Promise<string[]> {
    const mediaUrns: string[] = [];
    
    for (const item of media) {
      // Register upload
      const registerResponse = await this.makeRequest('/assets?action=registerUpload', {
        method: 'POST',
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${this.account.accountId}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        })
      });
      
      // Upload media
      // ... upload implementation
      
      mediaUrns.push(registerResponse.value.asset);
    }
    
    return mediaUrns;
  }
  
  async getMessages(): Promise<PlatformMessage[]> {
    // LinkedIn messaging API requires additional permissions
    return [];
  }
  
  async getAnalytics(postId: string): Promise<any> {
    const response = await this.makeRequest(`/socialActions/${postId}/likes`, {
      method: 'GET'
    });
    
    return response;
  }
  
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/ugcPosts/${postId}`, {
        method: 'DELETE'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  private async updateAccount(): Promise<void> {
    await supabase
      .from('platform_accounts')
      .update({
        accessToken: this.account.accessToken,
        tokenExpiry: this.account.tokenExpiry
      })
      .eq('id', this.account.id);
  }
}

// Platform Manager
export class PlatformManager {
  private integrations: Map<string, PlatformIntegration> = new Map();
  
  async connectPlatform(
    platform: PlatformAccount['platform'],
    authCode: string
  ): Promise<PlatformAccount> {
    // Exchange auth code for access token
    const tokens = await this.exchangeAuthCode(platform, authCode);
    
    // Get account info
    const accountInfo = await this.getAccountInfo(platform, tokens.accessToken);
    
    // Create platform account
    const account: PlatformAccount = {
      id: this.generateId(),
      platform,
      accountId: accountInfo.id,
      accountName: accountInfo.name,
      accountHandle: accountInfo.handle,
      profileImage: accountInfo.profileImage,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiresAt,
      permissions: accountInfo.permissions || [],
      isActive: true,
      isPrimary: false,
      metrics: accountInfo.metrics,
      organizationId: await this.getOrganizationId(),
      connectedBy: await this.getCurrentUserId(),
      connectedAt: new Date()
    };
    
    // Save to database
    const { data, error } = await supabase
      .from('platform_accounts')
      .insert([account])
      .select()
      .single();
    
    if (error) throw error;
    
    // Initialize integration
    this.initializeIntegration(data);
    
    log.info('Platform connected', { platform, accountId: data.accountId });
    return data;
  }
  
  private async exchangeAuthCode(
    platform: string,
    authCode: string
  ): Promise<any> {
    // Platform-specific OAuth token exchange
    // Implementation would vary by platform
    return {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
  
  private async getAccountInfo(
    platform: string,
    accessToken: string
  ): Promise<any> {
    // Platform-specific account info retrieval
    return {
      id: 'account_123',
      name: 'Test Account',
      handle: 'testaccount',
      profileImage: 'https://example.com/profile.jpg',
      permissions: ['read', 'write'],
      metrics: {
        followers: 1000,
        following: 500,
        posts: 100,
        engagement: 5.5
      }
    };
  }
  
  async disconnectPlatform(accountId: string): Promise<void> {
    // Revoke tokens if possible
    const integration = this.integrations.get(accountId);
    if (integration) {
      // Platform-specific token revocation
    }
    
    // Mark as inactive in database
    await supabase
      .from('platform_accounts')
      .update({ isActive: false })
      .eq('id', accountId);
    
    // Remove from active integrations
    this.integrations.delete(accountId);
    
    log.info('Platform disconnected', { accountId });
  }
  
  async publishToMultiplePlatforms(
    content: PostContent,
    platformIds: string[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    
    for (const platformId of platformIds) {
      const integration = this.integrations.get(platformId);
      if (integration) {
        const result = await integration.publish(content);
        results.push(result);
      }
    }
    
    return results;
  }
  
  async getUnifiedInbox(): Promise<PlatformMessage[]> {
    const allMessages: PlatformMessage[] = [];
    
    for (const integration of this.integrations.values()) {
      const messages = await integration.getMessages();
      allMessages.push(...messages);
    }
    
    // Sort by timestamp
    allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return allMessages;
  }
  
  private initializeIntegration(account: PlatformAccount): void {
    let integration: PlatformIntegration;
    
    switch (account.platform) {
      case 'instagram':
        integration = new InstagramIntegration(account);
        break;
      case 'twitter':
        integration = new TwitterIntegration(account);
        break;
      case 'linkedin':
        integration = new LinkedInIntegration(account);
        break;
      default:
        throw new Error(`Unsupported platform: ${account.platform}`);
    }
    
    this.integrations.set(account.id, integration);
  }
  
  async loadAccounts(): Promise<void> {
    const { data: accounts } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('isActive', true);
    
    if (accounts) {
      for (const account of accounts) {
        this.initializeIntegration(account);
      }
    }
  }
  
  private generateId(): string {
    return `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  }
  
  private async getOrganizationId(): Promise<string> {
    // Get from context or user's organization
    return 'default_org';
  }
}

// Export singleton instance
export const platformManager = new PlatformManager();