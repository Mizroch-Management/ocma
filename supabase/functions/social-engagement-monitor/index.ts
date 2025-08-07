import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getApiKey } from '../_shared/api-key-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { platform, action, data, organizationId } = await req.json()

    let result;
    switch (action) {
      case 'monitor_mentions':
        result = await monitorMentions(platform, data, supabase);
        break;
      case 'analyze_sentiment':
        result = await analyzeSentiment(data, supabase, organizationId);
        break;
      case 'discover_influencers':
        result = await discoverInfluencers(platform, data, supabase);
        break;
      case 'get_engagement_opportunities':
        result = await getEngagementOpportunities(platform, data, supabase);
        break;
      case 'track_hashtags':
        result = await trackHashtags(platform, data, supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Social engagement monitor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function monitorMentions(platform: string, data: any, supabase: any) {
  // TODO: Integrate with social media APIs to monitor mentions
  // This requires platform-specific API keys and authentication
  
  console.log(`Monitoring mentions for platform: ${platform}`);
  
  // Return empty data until real API integration is implemented
  return {
    mentions: [],
    total_count: 0,
    high_priority_count: 0,
    pending_responses: 0,
    message: "Social media API integration required. Configure platform API keys to start monitoring mentions."
  };
}

async function analyzeSentiment(data: any, supabase: any, organizationId?: string) {
  console.log('[Social Engagement - Sentiment] Getting OpenAI API key for organization:', organizationId);
  
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'openai',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[Social Engagement - Sentiment] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve OpenAI API key');
  }

  const openaiKey = apiKeyResult.apiKey!;
  console.log('[Social Engagement - Sentiment] API key retrieved successfully from:', apiKeyResult.source);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of social media content and provide engagement recommendations. Return JSON with sentiment (positive/negative/neutral), confidence (0-100), engagement_potential (high/medium/low), and suggested_response_tone.'
        },
        {
          role: 'user',
          content: `Analyze this social media content: "${data.content}"`
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  const result = await response.json();
  const analysis = JSON.parse(result.choices[0].message.content);

  return {
    ...analysis,
    original_content: data.content,
    analyzed_at: new Date().toISOString()
  };
}

async function discoverInfluencers(platform: string, data: any, supabase: any) {
  // TODO: Implement real influencer discovery using social media APIs
  console.log(`Discovering influencers for platform: ${platform}`, data);
  
  // Return empty data until real API integration is implemented
  return {
    influencers: [],
    total_found: 0,
    high_priority: 0,
    search_criteria: data,
    message: "Influencer discovery requires social media API integration. Configure platform API keys to discover influencers."
  };
}

async function getEngagementOpportunities(platform: string, data: any, supabase: any) {
  // TODO: Implement real engagement opportunity analysis
  console.log(`Getting engagement opportunities for platform: ${platform}`);
  
  // Return empty data until real API integration is implemented
  return {
    opportunities: [],
    total_count: 0,
    high_priority_count: 0,
    time_sensitive_count: 0,
    message: "Engagement opportunities require social media API integration and content analysis."
  };
}

async function trackHashtags(platform: string, data: any, supabase: any) {
  const { hashtags } = data;
  console.log(`Tracking hashtags for platform: ${platform}`, hashtags);
  
  // TODO: Implement real hashtag tracking using social media APIs
  
  return {
    hashtag_data: [],
    tracking_since: new Date().toISOString(),
    message: "Hashtag tracking requires social media API integration. Configure platform API keys to track hashtag performance.",
    requested_hashtags: hashtags
  };
}

// Note: getAIKey function removed - now using centralized getApiKey from api-key-manager.ts