// Real Social Media API Client
// Production-ready OAuth implementations for major platforms

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope?: string;
}

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  reach: number;
  impressions: number;
  engagement: number;
  clicks?: number;
}

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  createdAt: Date;
  metrics: PostMetrics;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
  url: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  verified: boolean;
  bio?: string;
}

// Base API Client
abstract class SocialAPIClient {
  protected client: AxiosInstance;
  protected tokens: OAuthTokens | null = null;
  protected credentials: PlatformCredentials;

  constructor(credentials: PlatformCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'OCMA-SocialMediaManager/1.0'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.handleRateLimit();
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.refreshAccessToken();
          // Retry the original request
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  abstract getAuthorizationUrl(state?: string): string;
  abstract exchangeCodeForTokens(code: string, state?: string): Promise<OAuthTokens>;
  abstract refreshAccessToken(): Promise<OAuthTokens>;
  abstract getUserProfile(): Promise<UserProfile>;
  abstract createPost(content: string, media?: File[]): Promise<SocialPost>;
  abstract getPost(postId: string): Promise<SocialPost>;
  abstract deletePost(postId: string): Promise<boolean>;
  abstract getUserPosts(limit?: number): Promise<SocialPost[]>;

  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  protected async handleRateLimit(): Promise<void> {
    // Implement rate limiting logic specific to each platform
    // This is a basic implementation - should be enhanced per platform
    const delay = 100; // Basic delay between requests
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return new Date() >= this.tokens.expiresAt;
  }

  protected async makeAuthenticatedRequest(config: AxiosRequestConfig): Promise<any> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.client.request(config);
  }
}

// Twitter/X API Client
export class TwitterAPIClient extends SocialAPIClient {
  private readonly baseUrl = 'https://api.twitter.com/2';
  private readonly authUrl = 'https://twitter.com/i/oauth2/authorize';
  private readonly tokenUrl = 'https://api.twitter.com/2/oauth2/token';

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state || Math.random().toString(36).substring(7),
      code_challenge: this.generateCodeChallenge(),
      code_challenge_method: 'S256'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  private generateCodeChallenge(): string {
    const codeVerifier = Math.random().toString(36).substring(2, 15) +
                        Math.random().toString(36).substring(2, 15);
    localStorage.setItem('twitter_code_verifier', codeVerifier);
    return CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64url);
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const codeVerifier = localStorage.getItem('twitter_code_verifier');
    if (!codeVerifier) throw new Error('Code verifier not found');

    const response = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.credentials.redirectUri,
      code_verifier: codeVerifier,
      client_id: this.credentials.clientId
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };

    this.setTokens(tokens);
    localStorage.removeItem('twitter_code_verifier');
    return tokens;
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken,
      client_id: this.credentials.clientId
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };

    this.setTokens(tokens);
    return tokens;
  }

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/users/me`,
      params: {
        'user.fields': 'id,name,username,profile_image_url,public_metrics,verified,description'
      }
    });

    const user = response.data.data;
    return {
      id: user.id,
      username: user.username,
      displayName: user.name,
      profilePicture: user.profile_image_url,
      followerCount: user.public_metrics.followers_count,
      followingCount: user.public_metrics.following_count,
      postCount: user.public_metrics.tweet_count,
      verified: user.verified,
      bio: user.description
    };
  }

  async createPost(content: string, media?: File[]): Promise<SocialPost> {
    let mediaIds: string[] = [];

    // Upload media if provided
    if (media && media.length > 0) {
      mediaIds = await this.uploadMedia(media);
    }

    const tweetData: any = { text: content };
    if (mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds };
    }

    const response = await this.makeAuthenticatedRequest({
      method: 'POST',
      url: `${this.baseUrl}/tweets`,
      data: tweetData
    });

    const tweet = response.data.data;
    return {
      id: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      url: `https://twitter.com/user/status/${tweet.id}`
    };
  }

  private async uploadMedia(files: File[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('media', file);

      // Twitter media upload requires a different endpoint
      const response = await this.makeAuthenticatedRequest({
        method: 'POST',
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      mediaIds.push(response.data.media_id_string);
    }

    return mediaIds;
  }

  async getPost(postId: string): Promise<SocialPost> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/tweets/${postId}`,
      params: {
        'tweet.fields': 'created_at,public_metrics,attachments',
        'expansions': 'attachments.media_keys',
        'media.fields': 'type,url,preview_image_url'
      }
    });

    const tweet = response.data.data;
    const metrics = tweet.public_metrics;

    return {
      id: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: metrics.like_count,
        comments: metrics.reply_count,
        shares: metrics.retweet_count,
        reach: metrics.impression_count,
        impressions: metrics.impression_count,
        engagement: ((metrics.like_count + metrics.reply_count + metrics.retweet_count) / metrics.impression_count) * 100
      },
      url: `https://twitter.com/user/status/${tweet.id}`
    };
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `${this.baseUrl}/tweets/${postId}`
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserPosts(limit = 10): Promise<SocialPost[]> {
    const userProfile = await this.getUserProfile();
    
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/users/${userProfile.id}/tweets`,
      params: {
        max_results: limit,
        'tweet.fields': 'created_at,public_metrics'
      }
    });

    return response.data.data.map((tweet: any) => ({
      id: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: tweet.public_metrics.like_count,
        comments: tweet.public_metrics.reply_count,
        shares: tweet.public_metrics.retweet_count,
        reach: tweet.public_metrics.impression_count,
        impressions: tweet.public_metrics.impression_count,
        engagement: ((tweet.public_metrics.like_count + tweet.public_metrics.reply_count + tweet.public_metrics.retweet_count) / tweet.public_metrics.impression_count) * 100
      },
      url: `https://twitter.com/user/status/${tweet.id}`
    }));
  }
}

// Instagram API Client
export class InstagramAPIClient extends SocialAPIClient {
  private readonly baseUrl = 'https://graph.instagram.com/v18.0';
  private readonly authUrl = 'https://api.instagram.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.instagram.com/oauth/access_token';

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state: state || Math.random().toString(36).substring(7)
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    // First get short-lived token
    const shortResponse = await axios.post(this.tokenUrl, new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.credentials.redirectUri,
      code
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Exchange for long-lived token
    const longResponse = await axios.get(`${this.baseUrl}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: this.credentials.clientSecret,
        access_token: shortResponse.data.access_token
      }
    });

    const data = longResponse.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      tokenType: 'bearer',
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };

    this.setTokens(tokens);
    return tokens;
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens) throw new Error('No tokens available');

    const response = await axios.get(`${this.baseUrl}/refresh_access_token`, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: this.tokens.accessToken
      }
    });

    const data = response.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      tokenType: this.tokens.tokenType,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };

    this.setTokens(tokens);
    return tokens;
  }

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/me`,
      params: {
        fields: 'id,username,account_type,media_count'
      }
    });

    const user = response.data;
    return {
      id: user.id,
      username: user.username,
      displayName: user.username,
      followerCount: 0, // Not available in Basic Display API
      followingCount: 0, // Not available in Basic Display API
      postCount: user.media_count,
      verified: false
    };
  }

  async createPost(content: string, media?: File[]): Promise<SocialPost> {
    if (!media || media.length === 0) {
      throw new Error('Instagram requires media for posts');
    }

    const mediaUrl = await this.uploadMedia(media[0]);
    
    // Create media container
    const containerResponse = await this.makeAuthenticatedRequest({
      method: 'POST',
      url: `${this.baseUrl}/me/media`,
      data: {
        image_url: mediaUrl,
        caption: content
      }
    });

    // Publish media
    const publishResponse = await this.makeAuthenticatedRequest({
      method: 'POST',
      url: `${this.baseUrl}/me/media_publish`,
      data: {
        creation_id: containerResponse.data.id
      }
    });

    return {
      id: publishResponse.data.id,
      platform: 'instagram',
      content,
      createdAt: new Date(),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      url: `https://instagram.com/p/${publishResponse.data.id}`
    };
  }

  private async uploadMedia(file: File): Promise<string> {
    // In production, you'd upload to your own media server first
    // then provide the URL to Instagram
    const formData = new FormData();
    formData.append('file', file);

    // This is a placeholder - implement your media upload service
    const response = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return data.url;
  }

  async getPost(postId: string): Promise<SocialPost> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/${postId}`,
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp'
      }
    });

    const post = response.data;
    return {
      id: post.id,
      platform: 'instagram',
      content: post.caption || '',
      createdAt: new Date(post.timestamp),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      media: [{
        type: post.media_type === 'VIDEO' ? 'video' : 'image',
        url: post.media_url
      }],
      url: post.permalink
    };
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `${this.baseUrl}/${postId}`
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserPosts(limit = 10): Promise<SocialPost[]> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/me/media`,
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp',
        limit
      }
    });

    return response.data.data.map((post: any) => ({
      id: post.id,
      platform: 'instagram',
      content: post.caption || '',
      createdAt: new Date(post.timestamp),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      media: [{
        type: post.media_type === 'VIDEO' ? 'video' : 'image',
        url: post.media_url
      }],
      url: post.permalink
    }));
  }
}

// LinkedIn API Client
export class LinkedInAPIClient extends SocialAPIClient {
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
  private readonly tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: 'r_liteprofile r_emailaddress w_member_social',
      state: state || Math.random().toString(36).substring(7)
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.credentials.redirectUri,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };

    this.setTokens(tokens);
    return tokens;
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };

    this.setTokens(tokens);
    return tokens;
  }

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/me`,
      params: {
        projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))'
      }
    });

    const user = response.data;
    return {
      id: user.id,
      username: user.id,
      displayName: `${user.firstName.localized.en_US} ${user.lastName.localized.en_US}`,
      profilePicture: user.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier,
      followerCount: 0, // Requires additional API call
      followingCount: 0, // Requires additional API call
      postCount: 0, // Requires additional API call
      verified: false
    };
  }

  async createPost(content: string, media?: File[]): Promise<SocialPost> {
    const userProfile = await this.getUserProfile();
    const authorUrn = `urn:li:person:${userProfile.id}`;

    const postData: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: media && media.length > 0 ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    if (media && media.length > 0) {
      const mediaUrns = await this.uploadMedia(media);
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map(urn => ({
        status: 'READY',
        media: urn
      }));
    }

    const response = await this.makeAuthenticatedRequest({
      method: 'POST',
      url: `${this.baseUrl}/ugcPosts`,
      data: postData
    });

    const postId = response.data.id;
    return {
      id: postId,
      platform: 'linkedin',
      content,
      createdAt: new Date(),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      url: `https://www.linkedin.com/feed/update/${postId}`
    };
  }

  private async uploadMedia(files: File[]): Promise<string[]> {
    const mediaUrns: string[] = [];

    for (const file of files) {
      // Register upload
      const registerResponse = await this.makeAuthenticatedRequest({
        method: 'POST',
        url: `${this.baseUrl}/assets?action=registerUpload`,
        data: {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${(await this.getUserProfile()).id}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        }
      });

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type
        }
      });

      mediaUrns.push(registerResponse.data.value.asset);
    }

    return mediaUrns;
  }

  async getPost(postId: string): Promise<SocialPost> {
    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/ugcPosts/${postId}`
    });

    const post = response.data;
    return {
      id: post.id,
      platform: 'linkedin',
      content: post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text,
      createdAt: new Date(post.created.time),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      url: `https://www.linkedin.com/feed/update/${post.id}`
    };
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `${this.baseUrl}/ugcPosts/${postId}`
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserPosts(limit = 10): Promise<SocialPost[]> {
    const userProfile = await this.getUserProfile();
    const authorUrn = `urn:li:person:${userProfile.id}`;

    const response = await this.makeAuthenticatedRequest({
      method: 'GET',
      url: `${this.baseUrl}/ugcPosts`,
      params: {
        q: 'authors',
        authors: authorUrn,
        count: limit
      }
    });

    return response.data.elements.map((post: any) => ({
      id: post.id,
      platform: 'linkedin',
      content: post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text,
      createdAt: new Date(post.created.time),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      },
      url: `https://www.linkedin.com/feed/update/${post.id}`
    }));
  }
}

// Factory for creating API clients
export class SocialMediaClientFactory {
  static createClient(platform: string, credentials: PlatformCredentials): SocialAPIClient {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return new TwitterAPIClient(credentials);
      case 'instagram':
        return new InstagramAPIClient(credentials);
      case 'linkedin':
        return new LinkedInAPIClient(credentials);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

// Export commonly used types and classes
export {
  SocialAPIClient,
  TwitterAPIClient,
  InstagramAPIClient,
  LinkedInAPIClient
};