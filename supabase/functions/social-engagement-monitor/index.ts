import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getApiKey } from '../_shared/api-key-manager.ts'

// Use the proper Supabase client type from the imported createClient
type SupabaseClient = ReturnType<typeof createClient>;

interface MonitorRequest {
  platform: string;
  action: string;
  data: Record<string, unknown> | SentimentData | HashtagData;
  organizationId?: string;
}

interface SentimentData {
  content: string;
}

interface HashtagData {
  hashtags: string[];
}

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Social engagement monitor error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
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

interface MentionData {
  keywords?: string[];
  timeRange?: string;
  includeReplies?: boolean;
  [key: string]: unknown;
}

async function monitorMentions(platform: string, data: MentionData, supabase: SupabaseClient) {
  console.log(`Monitoring mentions for platform: ${platform}`);
  
  // Get platform API credentials
  const platformCredentials = await getPlatformCredentials(platform, supabase);
  if (!platformCredentials) {
    return {
      mentions: [],
      total_count: 0,
      high_priority_count: 0,
      pending_responses: 0,
      message: `${platform} API credentials not configured. Please add API keys to start monitoring mentions.`
    };
  }

  try {
    let mentions = [];
    
    switch (platform) {
      case 'twitter':
        mentions = await getTwitterMentions(platformCredentials, data);
        break;
      case 'instagram':
        mentions = await getInstagramMentions(platformCredentials, data);
        break;
      case 'linkedin':
        mentions = await getLinkedInMentions(platformCredentials, data);
        break;
      case 'facebook':
        mentions = await getFacebookMentions(platformCredentials, data);
        break;
      default:
        throw new Error(`Platform ${platform} not supported`);
    }

    const highPriorityCount = mentions.filter((m: any) => m.priority === 'high').length;
    const pendingResponses = mentions.filter((m: any) => !m.responded).length;

    // Store mentions in database for tracking
    if (mentions.length > 0) {
      await supabase
        .from('social_mentions')
        .upsert(mentions.map((mention: any) => ({
          platform,
          mention_id: mention.id,
          content: mention.content,
          author: mention.author,
          url: mention.url,
          priority: mention.priority,
          sentiment: mention.sentiment,
          created_at: mention.created_at,
          fetched_at: new Date().toISOString()
        })), { onConflict: 'platform,mention_id' });
    }

    return {
      mentions,
      total_count: mentions.length,
      high_priority_count: highPriorityCount,
      pending_responses: pendingResponses
    };
  } catch (error) {
    console.error(`Error monitoring ${platform} mentions:`, error);
    return {
      mentions: [],
      total_count: 0,
      high_priority_count: 0,
      pending_responses: 0,
      error: `Failed to fetch mentions: ${error.message}`
    };
  }
}

async function analyzeSentiment(data: SentimentData, supabase: SupabaseClient, organizationId?: string) {
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

interface InfluencerDiscoveryData {
  niche?: string;
  followerRange?: { min: number; max: number };
  location?: string;
  engagementRate?: number;
  [key: string]: unknown;
}

async function discoverInfluencers(platform: string, data: InfluencerDiscoveryData, supabase: SupabaseClient) {
  console.log(`Discovering influencers for platform: ${platform}`, data);
  
  const platformCredentials = await getPlatformCredentials(platform, supabase);
  if (!platformCredentials) {
    return {
      influencers: [],
      total_found: 0,
      high_priority: 0,
      search_criteria: data,
      message: `${platform} API credentials not configured for influencer discovery.`
    };
  }

  try {
    let influencers = [];
    
    switch (platform) {
      case 'twitter':
        influencers = await searchTwitterInfluencers(platformCredentials, data);
        break;
      case 'instagram':
        influencers = await searchInstagramInfluencers(platformCredentials, data);
        break;
      case 'linkedin':
        influencers = await searchLinkedInInfluencers(platformCredentials, data);
        break;
      default:
        throw new Error(`Influencer discovery not supported for ${platform}`);
    }

    const highPriority = influencers.filter((i: any) => i.engagement_rate > 5).length;

    return {
      influencers,
      total_found: influencers.length,
      high_priority: highPriority,
      search_criteria: data
    };
  } catch (error) {
    console.error(`Error discovering ${platform} influencers:`, error);
    return {
      influencers: [],
      total_found: 0,
      high_priority: 0,
      search_criteria: data,
      error: `Failed to discover influencers: ${error.message}`
    };
  }
}

interface EngagementOpportunityData {
  contentType?: string;
  timeFrame?: string;
  targetAudience?: string[];
  [key: string]: unknown;
}

async function getEngagementOpportunities(platform: string, data: EngagementOpportunityData, supabase: SupabaseClient) {
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

async function trackHashtags(platform: string, data: HashtagData, supabase: SupabaseClient) {
  const { hashtags } = data;
  console.log(`Tracking hashtags for platform: ${platform}`, hashtags);
  
  const platformCredentials = await getPlatformCredentials(platform, supabase);
  if (!platformCredentials) {
    return {
      hashtag_data: [],
      tracking_since: new Date().toISOString(),
      message: `${platform} API credentials not configured for hashtag tracking.`,
      requested_hashtags: hashtags
    };
  }

  try {
    const hashtagData = [];
    
    for (const hashtag of hashtags) {
      let metrics;
      
      switch (platform) {
        case 'twitter':
          metrics = await getTwitterHashtagMetrics(platformCredentials, hashtag);
          break;
        case 'instagram':
          metrics = await getInstagramHashtagMetrics(platformCredentials, hashtag);
          break;
        case 'tiktok':
          metrics = await getTikTokHashtagMetrics(platformCredentials, hashtag);
          break;
        default:
          continue;
      }
      
      hashtagData.push({
        hashtag,
        ...metrics,
        tracked_at: new Date().toISOString()
      });
    }

    // Store hashtag metrics
    if (hashtagData.length > 0) {
      await supabase
        .from('hashtag_metrics')
        .upsert(hashtagData.map(data => ({
          platform,
          hashtag: data.hashtag,
          post_count: data.post_count,
          engagement_rate: data.engagement_rate,
          trending_score: data.trending_score,
          tracked_at: data.tracked_at
        })), { onConflict: 'platform,hashtag,tracked_at' });
    }

    return {
      hashtag_data: hashtagData,
      tracking_since: new Date().toISOString(),
      requested_hashtags: hashtags
    };
  } catch (error) {
    console.error(`Error tracking ${platform} hashtags:`, error);
    return {
      hashtag_data: [],
      tracking_since: new Date().toISOString(),
      error: `Failed to track hashtags: ${error.message}`,
      requested_hashtags: hashtags
    };
  }
}

// Platform API credential management
async function getPlatformCredentials(platform: string, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('platform', platform)
    .eq('is_active', true)
    .single();
    
  if (error || !data) {
    console.log(`No API credentials found for ${platform}`);
    return null;
  }
  
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  };
}

// Twitter API functions
async function getTwitterMentions(credentials: any, data: MentionData) {
  const { keywords = [], timeRange = '24h' } = data;
  
  const searchQuery = keywords.length > 0 ? keywords.join(' OR ') : '@your_handle';
  
  const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=username,name,profile_image_url`, {
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  const tweets = result.data || [];
  const users = result.includes?.users || [];
  
  return tweets.map((tweet: any) => {
    const author = users.find((u: any) => u.id === tweet.author_id);
    return {
      id: tweet.id,
      content: tweet.text,
      author: {
        id: author?.id,
        username: author?.username,
        name: author?.name,
        avatar: author?.profile_image_url
      },
      url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
      priority: tweet.public_metrics?.like_count > 10 ? 'high' : 'medium',
      sentiment: 'neutral', // Would integrate with sentiment analysis
      created_at: tweet.created_at,
      responded: false
    };
  });
}

async function getInstagramMentions(credentials: any, data: MentionData) {
  // Instagram Basic Display API doesn't support mention monitoring
  // Would need Instagram Business API with advanced features
  return [];
}

async function getLinkedInMentions(credentials: any, data: MentionData) {
  // LinkedIn API has limited mention monitoring capabilities
  // Would need to implement custom solution
  return [];
}

async function getFacebookMentions(credentials: any, data: MentionData) {
  // Facebook API requires page-level access for mentions
  return [];
}

// Influencer discovery functions
async function searchTwitterInfluencers(credentials: any, data: InfluencerDiscoveryData) {
  const { niche = '', followerRange } = data;
  
  // Search for users in specific niche
  const searchQuery = niche || 'influencer';
  
  const response = await fetch(`https://api.twitter.com/2/users/by?usernames=${encodeURIComponent(searchQuery)}&user.fields=public_metrics,description,profile_image_url`, {
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  const users = result.data || [];
  
  return users
    .filter((user: any) => {
      if (followerRange) {
        const followers = user.public_metrics?.followers_count || 0;
        return followers >= followerRange.min && followers <= followerRange.max;
      }
      return true;
    })
    .map((user: any) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.description,
      avatar: user.profile_image_url,
      followers: user.public_metrics?.followers_count || 0,
      following: user.public_metrics?.following_count || 0,
      engagement_rate: calculateEngagementRate(user.public_metrics),
      platform: 'twitter'
    }));
}

async function searchInstagramInfluencers(credentials: any, data: InfluencerDiscoveryData) {
  // Instagram Basic Display API doesn't support user search
  // Would need Instagram Business API or third-party service
  return [];
}

async function searchLinkedInInfluencers(credentials: any, data: InfluencerDiscoveryData) {
  // LinkedIn API has limited user search capabilities
  return [];
}

// Hashtag tracking functions
async function getTwitterHashtagMetrics(credentials: any, hashtag: string) {
  const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?query=%23${encodeURIComponent(hashtag)}&tweet.fields=created_at,public_metrics`, {
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  const tweets = result.data || [];
  
  const totalEngagement = tweets.reduce((sum: number, tweet: any) => {
    const metrics = tweet.public_metrics || {};
    return sum + (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
  }, 0);
  
  return {
    post_count: tweets.length,
    engagement_rate: tweets.length > 0 ? totalEngagement / tweets.length : 0,
    trending_score: calculateTrendingScore(tweets)
  };
}

async function getInstagramHashtagMetrics(credentials: any, hashtag: string) {
  // Instagram Basic Display API doesn't support hashtag search
  // Would need Instagram Business API
  return {
    post_count: 0,
    engagement_rate: 0,
    trending_score: 0
  };
}

async function getTikTokHashtagMetrics(credentials: any, hashtag: string) {
  // TikTok API has limited hashtag analytics
  return {
    post_count: 0,
    engagement_rate: 0,
    trending_score: 0
  };
}

// Utility functions
function calculateEngagementRate(metrics: any): number {
  if (!metrics) return 0;
  
  const followers = metrics.followers_count || 1;
  const tweets = metrics.tweet_count || 1;
  const likes = metrics.like_count || 0;
  
  // Simple engagement rate calculation
  return ((likes / tweets) / followers) * 100;
}

function calculateTrendingScore(tweets: any[]): number {
  if (tweets.length === 0) return 0;
  
  // Calculate trending score based on recency and engagement
  const now = new Date();
  const score = tweets.reduce((sum, tweet) => {
    const createdAt = new Date(tweet.created_at);
    const hoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 24 - hoursAgo) / 24; // Newer tweets score higher
    
    const metrics = tweet.public_metrics || {};
    const engagementScore = (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2;
    
    return sum + (recencyScore * engagementScore);
  }, 0);
  
  return score / tweets.length;
}

// Note: getAIKey function removed - now using centralized getApiKey from api-key-manager.ts