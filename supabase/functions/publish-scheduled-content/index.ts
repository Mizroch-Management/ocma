import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SocialAPIClient, prepareCredentials } from '../_shared/social-api-client.ts';

interface PlatformOptimization {
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  timing?: string;
  [key: string]: unknown;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  scheduled_platforms?: string[];
  platforms?: string[];
  platform_optimizations?: Record<string, PlatformOptimization>;
  media_urls?: string[];
  link?: string;
}

// Use the proper Supabase client type from the imported createClient
type SupabaseClient = ReturnType<typeof createClient>;

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  metrics?: Record<string, string | number | boolean>;
}

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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error(`Error publishing to ${platform}:`, error);
          
          // Log error
          await supabase
            .from('publication_logs')
            .insert({
              content_id: content.id,
              platform: platform,
              status: 'failed',
              error_message: errorMessage,
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in publish-scheduled-content function:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Failed to publish scheduled content'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Publish to different platforms using real APIs
async function publishToPlatform(platform: string, content: ContentItem, supabase: SupabaseClient): Promise<PublishResult> {
  console.log(`Publishing to ${platform} for content ${content.id}`);
  
  try {
    // Get platform credentials from system settings
    console.log(`Looking for ${platform}_integration in system_settings...`);
    
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `${platform}_integration`)
      .single();

    console.log('Settings query result:', { settingsData, settingsError });

    if (settingsError) {
      console.error(`Settings error for ${platform}:`, settingsError);
      throw new Error(`${platform} integration not found in settings: ${settingsError.message}`);
    }

    if (!settingsData?.setting_value?.connected) {
      console.error(`${platform} integration not connected:`, settingsData);
      throw new Error(`${platform} integration not configured or not connected`);
    }

    console.log(`${platform} credentials found and connected`);

    const credentials = settingsData.setting_value.credentials;
    const optimizedContent = content.platform_optimizations?.[platform] || {};
    const postContent = optimizedContent.content || content.content;
    
    // Use the new unified API client
    const preparedCredentials = prepareCredentials(credentials, platform);
    const apiClient = new SocialAPIClient(preparedCredentials);
    
    // Extract media URLs if present
    const mediaUrls = content.media_urls || [];

    switch (platform.toLowerCase()) {
      case 'facebook': {
        return await apiClient.publishToFacebook(postContent, mediaUrls);
      }
      case 'instagram': {
        // Instagram requires at least one media item
        const instagramMediaUrl = mediaUrls[0] || 'https://via.placeholder.com/1080x1080.png?text=OCMA+Post';
        return await apiClient.publishToInstagram(postContent, instagramMediaUrl);
      }
      case 'twitter': {
        return await apiClient.publishToTwitter(postContent, mediaUrls);
      }
      case 'linkedin': {
        return await apiClient.publishToLinkedIn(postContent, mediaUrls);
      }
      case 'youtube': {
        return await apiClient.publishToYouTube(postContent);
      }
      case 'tiktok': {
        return await publishToTikTok(credentials, postContent, content);
      }
      case 'pinterest': {
        return await publishToPinterest(credentials, postContent, content);
      }
      case 'snapchat': {
        return await publishToSnapchat(credentials, postContent, content);
      }
      default: {
        throw new Error(`Platform ${platform} not supported`);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error publishing to ${platform}:`, error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

// These platform functions remain as they don't have full implementations yet

// TikTok Publishing
interface TikTokCredentials {
  access_token?: string;
  open_id?: string;
  [key: string]: unknown;
}

async function publishToTikTok(credentials: TikTokCredentials, content: string, postData: ContentItem): Promise<PublishResult> {
  try {
    // Note: TikTok requires video content, text-only posts are not supported
    // This is a placeholder implementation
    throw new Error('TikTok publishing requires video content - text-only posts not supported');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Pinterest Publishing
interface PinterestCredentials {
  access_token?: string;
  business_id?: string;
  [key: string]: unknown;
}

interface PinterestApiResponse {
  id: string;
  [key: string]: unknown;
}

interface PinterestErrorResponse {
  message?: string;
  [key: string]: unknown;
}

async function publishToPinterest(credentials: PinterestCredentials, content: string, postData: ContentItem): Promise<PublishResult> {
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
      const error: PinterestErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to publish to Pinterest');
    }

    const result: PinterestApiResponse = await response.json();
    return {
      success: true,
      postId: result.id,
      metrics: {
        platform_post_id: result.id,
        published_at: new Date().toISOString()
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Snapchat Publishing
interface SnapchatCredentials {
  access_token?: string;
  ad_account_id?: string;
  [key: string]: unknown;
}

async function publishToSnapchat(credentials: SnapchatCredentials, content: string, postData: ContentItem): Promise<PublishResult> {
  try {
    // Note: Snapchat Ads API is primarily for advertising, not organic content
    // This would require the Marketing API and specific ad account setup
    throw new Error('Snapchat organic content publishing not available through public API');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage
    };
  }
}