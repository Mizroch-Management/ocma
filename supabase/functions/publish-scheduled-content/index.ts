import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Publishing scheduled content function called');

  try {
    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time
    const now = new Date();
    console.log('Current time:', now.toISOString());

    // Find content that should be published now
    const { data: contentToPublish, error: fetchError } = await supabase
      .from('generated_content')
      .select('*')
      .eq('is_scheduled', true)
      .eq('publication_status', 'scheduled')
      .lte('scheduled_date', now.toISOString());

    if (fetchError) {
      console.error('Error fetching content to publish:', fetchError);
      throw new Error(`Failed to fetch content: ${fetchError.message}`);
    }

    console.log(`Found ${contentToPublish?.length || 0} content pieces to publish`);

    if (!contentToPublish || contentToPublish.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No content ready for publishing',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let successfulPublications = 0;
    let failedPublications = 0;

    // Process each content piece
    for (const content of contentToPublish) {
      console.log(`Processing content: ${content.id} - ${content.title}`);
      
      // Update content status to 'publishing'
      await supabase
        .from('generated_content')
        .update({ publication_status: 'publishing' })
        .eq('id', content.id);

      // Process each scheduled platform
      const platforms = content.scheduled_platforms || content.platforms || [];
      
      for (const platform of platforms) {
        try {
          console.log(`Publishing to ${platform} for content ${content.id}`);
          
          // Publish to platform using real API
          const publishResult = await publishToPlatform(platform, content, supabase);
          
          if (publishResult.success) {
            // Log successful publication
            await supabase
              .from('publication_logs')
              .insert({
                content_id: content.id,
                platform: platform,
                status: 'success',
                published_at: new Date().toISOString(),
                platform_post_id: publishResult.postId,
                metrics: publishResult.metrics || {}
              });
            
            console.log(`Successfully published to ${platform}`);
          } else {
            // Log failed publication
            await supabase
              .from('publication_logs')
              .insert({
                content_id: content.id,
                platform: platform,
                status: 'failed',
                error_message: publishResult.error || 'Unknown error',
                metrics: {}
              });
            
            console.log(`Failed to publish to ${platform}: ${publishResult.error}`);
            failedPublications++;
          }
        } catch (error) {
          console.error(`Error publishing to ${platform}:`, error);
          
          // Log error
          await supabase
            .from('publication_logs')
            .insert({
              content_id: content.id,
              platform: platform,
              status: 'failed',
              error_message: error.message,
              metrics: {}
            });
          
          failedPublications++;
        }
      }

      // Check if all platforms were processed successfully
      const { data: logs } = await supabase
        .from('publication_logs')
        .select('status')
        .eq('content_id', content.id);

      const allSuccessful = logs?.every(log => log.status === 'success');
      const hasFailures = logs?.some(log => log.status === 'failed');

      // Update final content status
      const finalStatus = allSuccessful ? 'published' : hasFailures ? 'failed' : 'publishing';
      
      await supabase
        .from('generated_content')
        .update({ publication_status: finalStatus })
        .eq('id', content.id);

      if (allSuccessful) {
        successfulPublications++;
      }
    }

    const response = {
      message: 'Content publishing completed',
      processed: contentToPublish.length,
      successful: successfulPublications,
      failed: failedPublications,
      timestamp: new Date().toISOString()
    };

    console.log('Publishing results:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in publish-scheduled-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to publish scheduled content'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Publish to different platforms using real APIs
async function publishToPlatform(platform: string, content: any, supabase: any) {
  console.log(`Publishing to ${platform} for content ${content.id}`);
  
  try {
    // Get platform credentials from system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `${platform}_integration`)
      .single();

    if (settingsError || !settingsData?.setting_value?.connected) {
      throw new Error(`${platform} integration not configured or not connected`);
    }

    const credentials = settingsData.setting_value.credentials;
    const optimizedContent = content.platform_optimizations?.[platform] || {};
    const postContent = optimizedContent.content || content.content;

    switch (platform.toLowerCase()) {
      case 'facebook':
        return await publishToFacebook(credentials, postContent, content);
      case 'instagram':
        return await publishToInstagram(credentials, postContent, content);
      case 'twitter':
        return await publishToTwitter(credentials, postContent, content);
      case 'linkedin':
        return await publishToLinkedIn(credentials, postContent, content);
      case 'youtube':
        return await publishToYouTube(credentials, postContent, content);
      case 'tiktok':
        return await publishToTikTok(credentials, postContent, content);
      case 'pinterest':
        return await publishToPinterest(credentials, postContent, content);
      case 'snapchat':
        return await publishToSnapchat(credentials, postContent, content);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  } catch (error) {
    console.error(`Error publishing to ${platform}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Facebook Publishing
async function publishToFacebook(credentials: any, content: string, postData: any) {
  try {
    console.log('Publishing to Facebook with page ID:', credentials.page_id);
    console.log('Access token type:', credentials.access_token?.substring(0, 20) + '...');
    
    // First, let's verify what type of token we have by checking the token info
    const tokenInfoResponse = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${credentials.access_token}`);
    const tokenInfo = await tokenInfoResponse.json();
    
    if (!tokenInfoResponse.ok) {
      console.error('Token verification failed:', tokenInfo);
      throw new Error(`Invalid Facebook token: ${tokenInfo.error?.message || 'Token verification failed'}`);
    }
    
    console.log('Token belongs to:', tokenInfo.name || tokenInfo.id);
    
    // Try to get pages that this token can access
    const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${credentials.access_token}`);
    const pagesResult = await pagesResponse.json();
    
    if (!pagesResponse.ok) {
      console.error('Failed to get pages:', pagesResult);
      throw new Error(`Cannot access Facebook pages: ${pagesResult.error?.message || 'Failed to retrieve pages'}`);
    }
    
    console.log('Available pages:', pagesResult.data?.map((p: any) => ({ id: p.id, name: p.name, access_token: p.access_token ? 'Yes' : 'No' })));
    
    // Check if the configured page is in the available pages
    const targetPage = pagesResult.data?.find((page: any) => page.id === credentials.page_id);
    
    if (!targetPage) {
      const availablePages = pagesResult.data?.map((p: any) => `${p.name} (${p.id})`).join(', ') || 'none';
      throw new Error(`Page ID ${credentials.page_id} not found. Available pages: ${availablePages}. Please update your Facebook page ID in settings.`);
    }
    
    console.log('Found target page:', targetPage.name, 'with page token:', targetPage.access_token ? 'Yes' : 'No');
    
    // Use the page access token to post
    const pageToken = targetPage.access_token || credentials.access_token;
    const response = await fetch(`https://graph.facebook.com/v19.0/${credentials.page_id}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
        access_token: pageToken
      })
    });

    const result = await response.json();
    console.log('Facebook post response:', result);

    if (!response.ok) {
      throw new Error(result.error?.message || `Facebook API error: ${response.status}`);
    }

    return {
      success: true,
      postId: result.id,
      metrics: {
        platform_post_id: result.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Facebook publishing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Instagram Publishing (Updated for current API)
async function publishToInstagram(credentials: any, content: string, postData: any) {
  try {
    console.log('Publishing to Instagram with user ID:', credentials.user_id);
    
    // Use Instagram Basic Display API or Instagram Graph API
    // For text posts, we need to use the newer Instagram Content Publishing API
    const response = await fetch(`https://graph.facebook.com/v19.0/${credentials.user_id}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caption: content,
        access_token: credentials.access_token
      })
    });

    const containerResult = await response.json();
    console.log('Instagram container response:', containerResult);

    if (!response.ok) {
      throw new Error(containerResult.error?.message || `Instagram API error: ${response.status}`);
    }

    // Publish the media
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${credentials.user_id}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerResult.id,
        access_token: credentials.access_token
      })
    });

    const publishResult = await publishResponse.json();
    console.log('Instagram publish response:', publishResult);

    if (!publishResponse.ok) {
      throw new Error(publishResult.error?.message || `Instagram publish error: ${publishResponse.status}`);
    }

    return {
      success: true,
      postId: publishResult.id,
      metrics: {
        platform_post_id: publishResult.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Instagram publishing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Twitter Publishing
async function publishToTwitter(credentials: any, content: string, postData: any) {
  try {
    const { createHmac } = await import("node:crypto");

    // Generate OAuth 1.0a signature
    const oauthParams = {
      oauth_consumer_key: credentials.api_key,
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: credentials.access_token,
      oauth_version: "1.0",
    };

    const signatureBaseString = `POST&${encodeURIComponent('https://api.twitter.com/2/tweets')}&${encodeURIComponent(
      Object.entries(oauthParams)
        .sort()
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
    )}`;

    const signingKey = `${encodeURIComponent(credentials.api_secret)}&${encodeURIComponent(credentials.access_token_secret)}`;
    const hmacSha1 = createHmac("sha1", signingKey);
    const signature = hmacSha1.update(signatureBaseString).digest("base64");

    const signedOAuthParams = {
      ...oauthParams,
      oauth_signature: signature,
    };

    const authHeader = "OAuth " + Object.entries(signedOAuthParams)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ");

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to publish to Twitter');
    }

    const result = await response.json();
    return {
      success: true,
      postId: result.data.id,
      metrics: {
        platform_post_id: result.data.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// LinkedIn Publishing
async function publishToLinkedIn(credentials: any, content: string, postData: any) {
  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:organization:${credentials.organization_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish to LinkedIn');
    }

    const result = await response.json();
    return {
      success: true,
      postId: result.id,
      metrics: {
        platform_post_id: result.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// YouTube Publishing (Community Post)
async function publishToYouTube(credentials: any, content: string, postData: any) {
  try {
    // First, get a fresh access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh YouTube access token');
    }

    const tokenData = await tokenResponse.json();

    // Create community post
    const response = await fetch('https://youtube.googleapis.com/youtube/v3/activities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        part: 'snippet',
        snippet: {
          type: 'upload',
          description: content,
          channelId: credentials.channel_id
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to publish to YouTube');
    }

    const result = await response.json();
    return {
      success: true,
      postId: result.id,
      metrics: {
        platform_post_id: result.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// TikTok Publishing
async function publishToTikTok(credentials: any, content: string, postData: any) {
  try {
    // Note: TikTok requires video content, text-only posts are not supported
    // This is a placeholder implementation
    throw new Error('TikTok publishing requires video content - text-only posts not supported');
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Pinterest Publishing
async function publishToPinterest(credentials: any, content: string, postData: any) {
  try {
    const response = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: credentials.business_id,
        description: content,
        link: postData.link || '',
        title: postData.title || content.substring(0, 100)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish to Pinterest');
    }

    const result = await response.json();
    return {
      success: true,
      postId: result.id,
      metrics: {
        platform_post_id: result.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Snapchat Publishing
async function publishToSnapchat(credentials: any, content: string, postData: any) {
  try {
    // Note: Snapchat Ads API is primarily for advertising, not organic content
    // This would require the Marketing API and specific ad account setup
    throw new Error('Snapchat organic content publishing not available through public API');
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}