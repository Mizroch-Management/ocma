// Unified Social Media API Client with proper authentication and error handling

export interface SocialCredentials {
  // Facebook/Meta
  facebook_app_id?: string;
  facebook_app_secret?: string;
  facebook_access_token?: string;
  facebook_page_id?: string;
  facebook_page_token?: string;
  
  // Instagram
  instagram_access_token?: string;
  instagram_user_id?: string;
  instagram_business_account_id?: string;
  
  // Twitter/X
  twitter_api_key?: string;
  twitter_api_secret?: string;
  twitter_access_token?: string;
  twitter_access_token_secret?: string;
  twitter_bearer_token?: string;
  
  // LinkedIn
  linkedin_access_token?: string;
  linkedin_person_id?: string;
  linkedin_organization_id?: string;
  
  // YouTube
  youtube_client_id?: string;
  youtube_client_secret?: string;
  youtube_refresh_token?: string;
  youtube_channel_id?: string;
  youtube_api_key?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export class SocialAPIClient {
  private credentials: SocialCredentials;
  
  constructor(credentials: SocialCredentials) {
    this.credentials = credentials;
  }
  
  // Facebook/Meta Publishing with proper token handling
  async publishToFacebook(content: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const pageId = this.credentials.facebook_page_id;
      let accessToken = this.credentials.facebook_page_token || this.credentials.facebook_access_token;
      
      if (!pageId || !accessToken) {
        throw new Error('Facebook Page ID and Access Token are required');
      }
      
      // If we only have user token, get page token
      if (!this.credentials.facebook_page_token && this.credentials.facebook_access_token) {
        const pageToken = await this.getFacebookPageToken(pageId, this.credentials.facebook_access_token);
        if (pageToken) {
          accessToken = pageToken;
        }
      }
      
      const params = new URLSearchParams({
        message: content,
        access_token: accessToken
      });
      
      // Add media if provided
      if (mediaUrls && mediaUrls.length > 0) {
        for (let i = 0; i < Math.min(mediaUrls.length, 10); i++) {
          params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: await this.uploadFacebookMedia(mediaUrls[i], accessToken) }));
        }
      }
      
      const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        method: 'POST',
        body: params
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to post to Facebook');
      }
      
      return {
        success: true,
        postId: result.id,
        url: `https://facebook.com/${result.id}`
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  private async getFacebookPageToken(pageId: string, userToken: string): Promise<string | null> {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${userToken}`);
      const data = await response.json();
      return data.access_token || null;
    } catch {
      return null;
    }
  }
  
  private async uploadFacebookMedia(mediaUrl: string, accessToken: string): Promise<string> {
    // Implementation for media upload
    // This would upload the media and return the media ID
    return '';
  }
  
  // Instagram Publishing with media handling
  async publishToInstagram(content: string, mediaUrl: string): Promise<PostResult> {
    try {
      const userId = this.credentials.instagram_business_account_id || this.credentials.instagram_user_id;
      const accessToken = this.credentials.instagram_access_token;
      
      if (!userId || !accessToken || !mediaUrl) {
        throw new Error('Instagram User ID, Access Token, and media URL are required');
      }
      
      // Step 1: Create media container
      const containerResponse = await fetch(`https://graph.facebook.com/v19.0/${userId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption: content,
          access_token: accessToken
        })
      });
      
      const containerResult = await containerResponse.json();
      
      if (!containerResponse.ok) {
        throw new Error(containerResult.error?.message || 'Failed to create media container');
      }
      
      // Step 2: Publish the container
      const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${userId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerResult.id,
          access_token: accessToken
        })
      });
      
      const publishResult = await publishResponse.json();
      
      if (!publishResponse.ok) {
        throw new Error(publishResult.error?.message || 'Failed to publish to Instagram');
      }
      
      return {
        success: true,
        postId: publishResult.id,
        url: `https://instagram.com/p/${publishResult.id}`
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  // Twitter/X Publishing with OAuth 2.0
  async publishToTwitter(content: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      // Use OAuth 2.0 with bearer token if available
      if (this.credentials.twitter_bearer_token) {
        return await this.publishToTwitterV2(content, mediaUrls);
      }
      
      // Fallback to OAuth 1.0a
      return await this.publishToTwitterOAuth1(content, mediaUrls);
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  private async publishToTwitterV2(content: string, mediaUrls?: string[]): Promise<PostResult> {
    const bearerToken = this.credentials.twitter_bearer_token;
    
    if (!bearerToken) {
      throw new Error('Twitter Bearer Token is required');
    }
    
    // Twitter API v2 endpoint
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: content.substring(0, 280)
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || result.title || 'Failed to post to Twitter');
    }
    
    return {
      success: true,
      postId: result.data.id,
      url: `https://twitter.com/i/web/status/${result.data.id}`
    };
  }
  
  private async publishToTwitterOAuth1(content: string, mediaUrls?: string[]): Promise<PostResult> {
    const { twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret } = this.credentials;
    
    if (!twitter_api_key || !twitter_api_secret || !twitter_access_token || !twitter_access_token_secret) {
      throw new Error('Twitter OAuth 1.0a credentials are required');
    }
    
    // For OAuth 1.0a, we'll use a simpler approach or bearer token
    // Twitter OAuth 1.0a requires crypto which is complex in Deno
    // Recommend using bearer token instead
    throw new Error('Please use Bearer Token for Twitter authentication. OAuth 1.0a requires server-side implementation.');
  }
  
  // LinkedIn Publishing with proper URN resolution
  async publishToLinkedIn(content: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const accessToken = this.credentials.linkedin_access_token;
      
      if (!accessToken) {
        throw new Error('LinkedIn Access Token is required');
      }
      
      // Get author URN (person or organization)
      let authorUrn = '';
      
      if (this.credentials.linkedin_person_id) {
        authorUrn = `urn:li:person:${this.credentials.linkedin_person_id}`;
      } else if (this.credentials.linkedin_organization_id) {
        authorUrn = `urn:li:organization:${this.credentials.linkedin_organization_id}`;
      } else {
        // Fetch person ID from API
        const personId = await this.getLinkedInPersonId(accessToken);
        if (personId) {
          authorUrn = `urn:li:person:${personId}`;
        } else {
          throw new Error('Unable to determine LinkedIn author URN');
        }
      }
      
      // Use LinkedIn Posts API (v2)
      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202401'
        },
        body: JSON.stringify({
          author: authorUrn,
          commentary: content,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false
        })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to post to LinkedIn';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.message || error.error_description || errorMessage;
        } catch {
          errorMessage = responseText;
        }
        throw new Error(errorMessage);
      }
      
      // LinkedIn returns the post ID in the Location header
      const postId = response.headers.get('x-restli-id') || response.headers.get('location')?.split('/').pop();
      
      return {
        success: true,
        postId: postId || 'success',
        url: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  private async getLinkedInPersonId(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.sub || null;
      }
    } catch {
      // Fallback to legacy endpoint
      try {
        const response = await fetch('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.id || null;
        }
      } catch (error) {
        // Silently handle errors for optional credential validation
        console.debug('Credential validation failed:', error);
      }
    }
    return null;
  }
  
  // YouTube Community Post Publishing
  async publishToYouTube(content: string): Promise<PostResult> {
    try {
      const { youtube_refresh_token, youtube_client_id, youtube_client_secret, youtube_channel_id } = this.credentials;
      
      if (!youtube_refresh_token || !youtube_client_id || !youtube_client_secret) {
        throw new Error('YouTube OAuth credentials are required');
      }
      
      // Get fresh access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: youtube_client_id,
          client_secret: youtube_client_secret,
          refresh_token: youtube_refresh_token,
          grant_type: 'refresh_token'
        })
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh YouTube access token');
      }
      
      const { access_token } = await tokenResponse.json();
      
      // Note: YouTube Data API v3 doesn't support community posts directly
      // This would require YouTube Creator API access which has limited availability
      throw new Error('YouTube community posts require Creator API access (limited availability). Consider uploading a video instead.');
      
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Helper function to validate and prepare credentials
export function prepareCredentials(platformCredentials: Record<string, unknown>, platform: string): SocialCredentials {
  const prepared: SocialCredentials = {};
  
  switch (platform.toLowerCase()) {
    case 'facebook':
      prepared.facebook_app_id = platformCredentials.app_id;
      prepared.facebook_app_secret = platformCredentials.app_secret;
      prepared.facebook_access_token = platformCredentials.access_token;
      prepared.facebook_page_id = platformCredentials.page_id;
      prepared.facebook_page_token = platformCredentials.page_token;
      break;
      
    case 'instagram':
      prepared.instagram_access_token = platformCredentials.access_token;
      prepared.instagram_user_id = platformCredentials.user_id;
      prepared.instagram_business_account_id = platformCredentials.business_account_id;
      break;
      
    case 'twitter':
      prepared.twitter_api_key = platformCredentials.api_key;
      prepared.twitter_api_secret = platformCredentials.api_secret;
      prepared.twitter_access_token = platformCredentials.access_token;
      prepared.twitter_access_token_secret = platformCredentials.access_token_secret;
      prepared.twitter_bearer_token = platformCredentials.bearer_token;
      break;
      
    case 'linkedin':
      prepared.linkedin_access_token = platformCredentials.access_token;
      prepared.linkedin_person_id = platformCredentials.person_id;
      prepared.linkedin_organization_id = platformCredentials.organization_id;
      break;
      
    case 'youtube':
      prepared.youtube_client_id = platformCredentials.client_id;
      prepared.youtube_client_secret = platformCredentials.client_secret;
      prepared.youtube_refresh_token = platformCredentials.refresh_token;
      prepared.youtube_channel_id = platformCredentials.channel_id;
      prepared.youtube_api_key = platformCredentials.api_key;
      break;
  }
  
  return prepared;
}