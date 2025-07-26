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
    console.log('Access token provided:', credentials.access_token ? 'Yes' : 'No');
    
    if (!credentials.access_token) {
      throw new Error('No Facebook access token provided');
    }
    
    if (!credentials.page_id) {
      throw new Error('No Facebook page ID provided');
    }
    
    // Check token validity and get token info
    const debugTokenResponse = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${credentials.access_token}&access_token=${credentials.access_token}`);
    const debugInfo = await debugTokenResponse.json();
    
    if (!debugTokenResponse.ok || debugInfo.data?.is_valid !== true) {
      console.error('Token debug info:', debugInfo);
      throw new Error(`Invalid or expired Facebook access token. Please reconnect your Facebook account. Debug info: ${JSON.stringify(debugInfo.data || debugInfo.error)}`);
    }
    
    console.log('Token is valid. App ID:', debugInfo.data.app_id, 'Scopes:', debugInfo.data.scopes);
    
    // Check if this is already a page access token by trying to post directly first
    let pageToken = credentials.access_token;
    
    // If this fails, we'll try to get a page access token
    let shouldTryPageToken = false;
    
    // First attempt: try posting directly with the provided token
    console.log('Attempting direct post with provided token...');
    const directResponse = await fetch(`https://graph.facebook.com/v19.0/${credentials.page_id}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
        access_token: pageToken
      })
    });

    const directResult = await directResponse.json();
    
    if (directResponse.ok) {
      console.log('Direct post successful:', directResult);
      return {
        success: true,
        postId: directResult.id,
        metrics: {
          platform_post_id: directResult.id,
          published_at: new Date().toISOString()
        }
      };
    }
    
    console.log('Direct post failed:', directResult);
    console.log('Attempting to get page access token...');
    
    // If direct post failed, try to get page access token
    const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${credentials.access_token}`);
    const pagesResult = await pagesResponse.json();
    
    if (!pagesResponse.ok) {
      console.error('Failed to get pages:', pagesResult);
      throw new Error(`Cannot access Facebook pages: ${pagesResult.error?.message || 'Failed to retrieve pages'}. This usually means your access token doesn't have the required permissions. Please regenerate your Facebook access token with 'pages_show_list' and 'pages_manage_posts' permissions, or use a long-lived page access token directly.`);
    }
    
    console.log('Available pages:', pagesResult.data?.map((p: any) => ({ id: p.id, name: p.name })));
    
    // Find the target page
    const targetPage = pagesResult.data?.find((page: any) => page.id === credentials.page_id);
    
    if (!targetPage) {
      const availablePages = pagesResult.data?.map((p: any) => `${p.name} (${p.id})`).join(', ') || 'none';
      throw new Error(`Page ID ${credentials.page_id} not found in your accessible pages. Available pages: ${availablePages}. Please check your page ID in settings.`);
    }
    
    console.log('Found target page:', targetPage.name);
    
    // Use the page access token for posting
    pageToken = targetPage.access_token;
    if (!pageToken) {
      throw new Error(`No page access token available for page ${targetPage.name}. Please use a long-lived page access token or ensure your user token has 'pages_manage_posts' permission.`);
    }
    
    // Post to the page
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

    console.log('Publishing to Twitter with credentials:', {
      api_key: credentials.api_key ? 'present' : 'missing',
      api_secret: credentials.api_secret ? 'present' : 'missing', 
      access_token: credentials.access_token ? 'present' : 'missing',
      access_token_secret: credentials.access_token_secret ? 'present' : 'missing'
    });

    // Validate required credentials
    if (!credentials.api_key || !credentials.api_secret || !credentials.access_token || !credentials.access_token_secret) {
      throw new Error('Missing required Twitter API credentials. Please ensure API Key, API Secret, Access Token, and Access Token Secret are all configured.');
    }

    // Generate OAuth 1.0a signature - Use X.com API endpoint
    const url = 'https://api.x.com/2/tweets';
    const oauthParams = {
      oauth_consumer_key: credentials.api_key,
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: credentials.access_token,
      oauth_version: "1.0",
    };

    console.log('OAuth params:', oauthParams);

    const signatureBaseString = `POST&${encodeURIComponent(url)}&${encodeURIComponent(
      Object.entries(oauthParams)
        .sort()
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
    )}`;

    const signingKey = `${encodeURIComponent(credentials.api_secret)}&${encodeURIComponent(credentials.access_token_secret)}`;
    const hmacSha1 = createHmac("sha1", signingKey);
    const signature = hmacSha1.update(signatureBaseString).digest("base64");

    console.log('Signature base string:', signatureBaseString);
    console.log('Generated signature:', signature);

    const signedOAuthParams = {
      ...oauthParams,
      oauth_signature: signature,
    };

    const authHeader = "OAuth " + Object.entries(signedOAuthParams)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ");

    console.log('Authorization header:', authHeader);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content.substring(0, 280) // Ensure content fits Twitter's limit
      })
    });

    const responseText = await response.text();
    console.log('Twitter API response status:', response.status);
    console.log('Twitter API response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to publish to Twitter';
      try {
        const error = JSON.parse(responseText);
        if (error.detail) {
          errorMessage = error.detail;
        } else if (error.errors && error.errors.length > 0) {
          errorMessage = error.errors[0].message || error.errors[0].detail;
        } else if (error.title) {
          errorMessage = error.title;
        }
        
        // Provide specific guidance for common errors
        if (errorMessage.includes('not permitted')) {
          errorMessage += '. Please check that your Twitter app has "Read and Write" permissions enabled in the Developer Portal, and that you have applied for and received Elevated access if required.';
        }
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${responseText}`;
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('Tweet posted successfully:', result);
    
    return {
      success: true,
      postId: result.data.id,
      metrics: {
        platform_post_id: result.data.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Twitter publishing error:', error);
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