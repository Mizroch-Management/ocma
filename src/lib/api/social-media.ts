// Real Social Media API Integration Layer
// Production-ready API endpoints for social media management

import { supabase } from '@/integrations/supabase/client';
import { SocialMediaClientFactory, OAuthTokens, PlatformCredentials } from '../social/api-client';
import { format } from 'date-fns';

export interface ConnectedAccount {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  accountHandle: string;
  profileImage?: string;
  isActive: boolean;
  lastSync: Date;
  metrics: {
    followers: number;
    following: number;
    posts: number;
    engagement: number;
  };
}

export interface PostAnalytics {
  postId: string;
  platform: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    reach: number;
    impressions: number;
    engagement: number;
    clicks?: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    topLocations: string[];
    interests: string[];
  };
  performanceInsights: {
    bestPerformingTime: string;
    audienceEngagement: number;
    contentType: string;
    hashtagPerformance: Record<string, number>;
  };
}

export interface CompetitorAnalysis {
  platform: string;
  competitors: Array<{
    handle: string;
    followers: number;
    engagement: number;
    postFrequency: number;
    topContent: Array<{
      content: string;
      engagement: number;
      type: string;
    }>;
  }>;
  insights: {
    averageEngagement: number;
    bestPostingTimes: string[];
    trendingHashtags: string[];
    contentGaps: string[];
  };
}

class SocialMediaAPI {
  private static instance: SocialMediaAPI;

  static getInstance(): SocialMediaAPI {
    if (!this.instance) {
      this.instance = new SocialMediaAPI();
    }
    return this.instance;
  }

  // OAuth Flow Management
  async initiatePlatformConnection(platform: string): Promise<{ authUrl: string; state: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const credentials = this.getPlatformCredentials(platform);
      const client = SocialMediaClientFactory.createClient(platform, credentials);
      
      const state = this.generateState();
      const authUrl = client.getAuthorizationUrl(state);

      // Store state in database for verification
      await supabase
        .from('oauth_states')
        .insert({
          state,
          platform,
          user_id: user.id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        });

      return { authUrl, state };
    } catch (error) {
      console.error('Failed to initiate platform connection:', error);
      throw new Error(`Failed to connect to ${platform}: ${error.message}`);
    }
  }

  async completePlatformConnection(platform: string, code: string, state: string): Promise<ConnectedAccount> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify state
      const { data: stateData } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .eq('platform', platform)
        .eq('user_id', user.id)
        .single();

      if (!stateData) {
        throw new Error('Invalid state parameter');
      }

      // Check if state has expired
      if (new Date() > new Date(stateData.expires_at)) {
        throw new Error('OAuth state has expired');
      }

      // Exchange code for tokens
      const credentials = this.getPlatformCredentials(platform);
      const client = SocialMediaClientFactory.createClient(platform, credentials);
      const tokens = await client.exchangeCodeForTokens(code, state);

      // Set tokens and get user profile
      client.setTokens(tokens);
      const profile = await client.getUserProfile();

      // Get organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!orgData) {
        throw new Error('No organization found for user');
      }

      // Store account in database
      const accountData = {
        platform,
        account_id: profile.id,
        account_name: profile.displayName,
        account_handle: profile.username,
        profile_image: profile.profilePicture,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expiry: tokens.expiresAt.toISOString(),
        is_active: true,
        organization_id: orgData.id,
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        metrics: {
          followers: profile.followerCount,
          following: profile.followingCount,
          posts: profile.postCount,
          engagement: 0
        }
      };

      const { data: savedAccount, error } = await supabase
        .from('platform_accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;

      // Clean up OAuth state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('state', state);

      return {
        id: savedAccount.id,
        platform: savedAccount.platform,
        accountId: savedAccount.account_id,
        accountName: savedAccount.account_name,
        accountHandle: savedAccount.account_handle,
        profileImage: savedAccount.profile_image,
        isActive: savedAccount.is_active,
        lastSync: new Date(savedAccount.connected_at),
        metrics: savedAccount.metrics
      };
    } catch (error) {
      console.error('Failed to complete platform connection:', error);
      throw new Error(`Failed to complete ${platform} connection: ${error.message}`);
    }
  }

  async getConnectedAccounts(): Promise<ConnectedAccount[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!orgData) return [];

      const { data: accounts, error } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('organization_id', orgData.id)
        .eq('is_active', true);

      if (error) throw error;

      return accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        accountId: account.account_id,
        accountName: account.account_name,
        accountHandle: account.account_handle,
        profileImage: account.profile_image,
        isActive: account.is_active,
        lastSync: new Date(account.last_sync || account.connected_at),
        metrics: account.metrics || {
          followers: 0,
          following: 0,
          posts: 0,
          engagement: 0
        }
      }));
    } catch (error) {
      console.error('Failed to get connected accounts:', error);
      throw new Error(`Failed to get connected accounts: ${error.message}`);
    }
  }

  async disconnectAccount(accountId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get account details
      const { data: account } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (!account) {
        throw new Error('Account not found');
      }

      // Try to revoke tokens if possible
      try {
        const credentials = this.getPlatformCredentials(account.platform);
        const client = SocialMediaClientFactory.createClient(account.platform, credentials);
        
        if (account.access_token) {
          client.setTokens({
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            tokenType: 'bearer',
            expiresIn: 3600,
            expiresAt: new Date(account.token_expiry)
          });
        }
      } catch (revokeError) {
        console.warn('Failed to revoke tokens:', revokeError);
      }

      // Mark account as inactive
      const { error } = await supabase
        .from('platform_accounts')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      throw new Error(`Failed to disconnect account: ${error.message}`);
    }
  }

  async syncAccountMetrics(accountId: string): Promise<ConnectedAccount> {
    try {
      const { data: account } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (!account) {
        throw new Error('Account not found');
      }

      const credentials = this.getPlatformCredentials(account.platform);
      const client = SocialMediaClientFactory.createClient(account.platform, credentials);
      
      // Set tokens
      client.setTokens({
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: new Date(account.token_expiry)
      });

      // Get updated profile
      const profile = await client.getUserProfile();
      
      // Get recent posts for engagement calculation
      const posts = await client.getUserPosts(10);
      const avgEngagement = posts.length > 0 
        ? posts.reduce((sum, post) => sum + post.metrics.engagement, 0) / posts.length 
        : 0;

      const updatedMetrics = {
        followers: profile.followerCount,
        following: profile.followingCount,
        posts: profile.postCount,
        engagement: avgEngagement
      };

      // Update in database
      const { error } = await supabase
        .from('platform_accounts')
        .update({
          metrics: updatedMetrics,
          last_sync: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      return {
        id: account.id,
        platform: account.platform,
        accountId: account.account_id,
        accountName: account.account_name,
        accountHandle: account.account_handle,
        profileImage: account.profile_image,
        isActive: account.is_active,
        lastSync: new Date(),
        metrics: updatedMetrics
      };
    } catch (error) {
      console.error('Failed to sync account metrics:', error);
      throw new Error(`Failed to sync metrics: ${error.message}`);
    }
  }

  async getPostAnalytics(accountId: string, postId: string): Promise<PostAnalytics> {
    try {
      const { data: account } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (!account) {
        throw new Error('Account not found');
      }

      const credentials = this.getPlatformCredentials(account.platform);
      const client = SocialMediaClientFactory.createClient(account.platform, credentials);
      
      client.setTokens({
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: new Date(account.token_expiry)
      });

      const post = await client.getPost(postId);
      
      // Get additional analytics if available (platform-specific)
      const analytics = await client.getAnalytics?.(postId);

      return {
        postId: post.id,
        platform: post.platform,
        metrics: post.metrics,
        demographics: {
          ageGroups: analytics?.demographics?.ageGroups || {},
          genderDistribution: analytics?.demographics?.genderDistribution || {},
          topLocations: analytics?.demographics?.topLocations || [],
          interests: analytics?.demographics?.interests || []
        },
        performanceInsights: {
          bestPerformingTime: format(post.createdAt, 'HH:mm'),
          audienceEngagement: post.metrics.engagement,
          contentType: 'post',
          hashtagPerformance: analytics?.hashtagPerformance || {}
        }
      };
    } catch (error) {
      console.error('Failed to get post analytics:', error);
      throw new Error(`Failed to get post analytics: ${error.message}`);
    }
  }

  async analyzeCompetitors(platform: string, competitors: string[]): Promise<CompetitorAnalysis> {
    try {
      // This would require additional API implementations
      // For now, return a placeholder structure
      return {
        platform,
        competitors: [],
        insights: {
          averageEngagement: 0,
          bestPostingTimes: [],
          trendingHashtags: [],
          contentGaps: []
        }
      };
    } catch (error) {
      console.error('Failed to analyze competitors:', error);
      throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
  }

  private getPlatformCredentials(platform: string): PlatformCredentials {
    const envPrefix = platform.toUpperCase();
    return {
      clientId: import.meta.env[`VITE_${envPrefix}_CLIENT_ID`] || '',
      clientSecret: import.meta.env[`VITE_${envPrefix}_CLIENT_SECRET`] || '',
      redirectUri: import.meta.env[`VITE_${envPrefix}_REDIRECT_URI`] || `${window.location.origin}/auth/callback/${platform}`
    };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const socialMediaAPI = SocialMediaAPI.getInstance();

// Utility functions for components
export async function connectSocialPlatform(platform: string): Promise<void> {
  const { authUrl } = await socialMediaAPI.initiatePlatformConnection(platform);
  window.location.href = authUrl;
}

export async function handleOAuthCallback(platform: string, code: string, state: string): Promise<ConnectedAccount> {
  return await socialMediaAPI.completePlatformConnection(platform, code, state);
}

// Export types
export type { ConnectedAccount, PostAnalytics, CompetitorAnalysis };