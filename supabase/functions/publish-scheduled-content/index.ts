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
          
          // Simulate platform publishing (in real implementation, you'd call platform APIs)
          const publishResult = await simulatePublishToPlatform(platform, content);
          
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

// Simulate publishing to different platforms
async function simulatePublishToPlatform(platform: string, content: any) {
  // In a real implementation, you would:
  // 1. Get platform-specific API credentials from secrets
  // 2. Format content according to platform requirements
  // 3. Make actual API calls to publish content
  // 4. Handle platform-specific responses and errors
  
  console.log(`Simulating publication to ${platform}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simulate random success/failure for demo
  const success = Math.random() > 0.1; // 90% success rate
  
  if (success) {
    return {
      success: true,
      postId: `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metrics: {
        initial_reach: Math.floor(Math.random() * 1000) + 100,
        estimated_engagement: Math.floor(Math.random() * 50) + 10
      }
    };
  } else {
    return {
      success: false,
      error: `Failed to publish to ${platform}: ${getRandomError()}`
    };
  }
}

function getRandomError() {
  const errors = [
    'Rate limit exceeded',
    'Authentication failed',
    'Content violates community guidelines',
    'Network timeout',
    'Platform temporarily unavailable'
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}