import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { platform, action, data } = await req.json()

    let result;
    switch (action) {
      case 'monitor_mentions':
        result = await monitorMentions(platform, data, supabase);
        break;
      case 'analyze_sentiment':
        result = await analyzeSentiment(data, supabase);
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
  // This would integrate with social media APIs to monitor mentions
  // For now, returning mock data structure that represents real monitoring
  
  const mockMentions = [
    {
      id: "mention_1",
      platform,
      user: "@sarah_marketer",
      content: "Thanks for the amazing marketing tips! Really helped with our campaign.",
      sentiment: "positive",
      engagement_potential: "high",
      timestamp: new Date().toISOString(),
      post_url: "https://twitter.com/sarah_marketer/status/123",
      user_followers: 15000,
      user_engagement_rate: 4.2,
      requires_response: true,
      ai_confidence: 94
    },
    {
      id: "mention_2", 
      platform,
      user: "@bizowner_joe",
      content: "Looking for advice on digital marketing strategies. Any recommendations?",
      sentiment: "neutral",
      engagement_potential: "medium",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      post_url: "https://linkedin.com/posts/bizowner_joe_123",
      user_followers: 8500,
      user_engagement_rate: 3.1,
      requires_response: true,
      ai_confidence: 87
    }
  ];

  return {
    mentions: mockMentions,
    total_count: mockMentions.length,
    high_priority_count: mockMentions.filter(m => m.engagement_potential === 'high').length,
    pending_responses: mockMentions.filter(m => m.requires_response).length
  };
}

async function analyzeSentiment(data: any, supabase: any) {
  // Get AI platform for sentiment analysis
  const { data: aiSettings } = await supabase
    .from('system_settings')
    .select('*')
    .eq('category', 'ai_platforms')
    .single();

  // Use OpenAI for sentiment analysis
  const openaiKey = await getAIKey('openai', supabase);
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
  // Mock influencer discovery - in real implementation would use social media APIs
  const mockInfluencers = [
    {
      id: "inf_1",
      name: "Sarah Johnson",
      handle: "@sarahjohnson_marketing",
      platform,
      followers: 150000,
      engagement_rate: "4.2%",
      niche: "Digital Marketing",
      ai_score: 94,
      reason: "High engagement in marketing content, frequently discusses social media strategies, and has an audience that aligns with your target demographic.",
      suggested_approach: "Engage with her recent post about content marketing trends. Share your expertise in the comments and offer to collaborate on a strategy guide.",
      recent_content: "Just posted about the latest social media algorithm changes",
      collaboration_potential: "high",
      estimated_reach: 50000,
      audience_overlap: 78
    },
    {
      id: "inf_2", 
      name: "Mike Chen",
      handle: "@mikechen_bizdev",
      platform,
      followers: 85000,
      engagement_rate: "3.8%", 
      niche: "Business Development",
      ai_score: 87,
      reason: "Consistently creates content about business growth and has mentioned challenges with digital marketing multiple times.",
      suggested_approach: "Comment on his post about scaling businesses with a helpful tip about marketing automation. Offer a free consultation.",
      recent_content: "Discussing challenges of scaling a startup",
      collaboration_potential: "medium",
      estimated_reach: 25000,
      audience_overlap: 65
    }
  ];

  return {
    influencers: mockInfluencers,
    total_found: mockInfluencers.length,
    high_priority: mockInfluencers.filter(i => i.ai_score >= 90).length,
    search_criteria: data,
    ai_recommendations: [
      "Focus on influencers with 50K+ followers for maximum reach",
      "Prioritize those who recently posted about marketing challenges",
      "Engage authentically by providing value before pitching collaboration"
    ]
  };
}

async function getEngagementOpportunities(platform: string, data: any, supabase: any) {
  // Get opportunities based on current content and audience behavior
  const opportunities = [
    {
      id: "opp_1",
      type: "thread_reply",
      priority: "high", 
      title: "Reply to High-Engagement Thread",
      description: "@sarah_marketer's post about marketing tips has 50+ comments",
      suggested_action: "Join the conversation with your expertise on automation tools",
      potential_reach: 15000,
      engagement_score: 94,
      time_sensitive: true,
      expires_at: new Date(Date.now() + 2 * 3600000).toISOString() // 2 hours
    },
    {
      id: "opp_2",
      type: "influencer_outreach",
      priority: "medium",
      title: "Collaborate with Business Influencer", 
      description: "@mikechen_bizdev mentioned marketing challenges",
      suggested_action: "Offer a free marketing audit or consultation",
      potential_reach: 8500,
      engagement_score: 87,
      time_sensitive: false,
      expires_at: null
    },
    {
      id: "opp_3",
      type: "hashtag_trend",
      priority: "medium",
      title: "Join Trending Marketing Discussion",
      description: "#DigitalMarketing2024 is trending with 10K+ posts",
      suggested_action: "Share your unique perspective on upcoming marketing trends",
      potential_reach: 25000,
      engagement_score: 76,
      time_sensitive: true,
      expires_at: new Date(Date.now() + 6 * 3600000).toISOString() // 6 hours
    }
  ];

  return {
    opportunities,
    total_count: opportunities.length,
    high_priority_count: opportunities.filter(o => o.priority === 'high').length,
    time_sensitive_count: opportunities.filter(o => o.time_sensitive).length
  };
}

async function trackHashtags(platform: string, data: any, supabase: any) {
  const { hashtags } = data;
  
  const hashtagData = hashtags.map((hashtag: string) => ({
    hashtag,
    platform,
    post_count: Math.floor(Math.random() * 50000) + 1000,
    engagement_level: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
    trending: Math.random() > 0.7,
    growth_rate: (Math.random() * 50 - 25).toFixed(1) + '%',
    top_posts: [
      {
        user: "@example_user1",
        content: `Great insights on ${hashtag}! This really changed my perspective.`,
        engagement: Math.floor(Math.random() * 1000) + 50,
        url: `https://${platform}.com/post/123`
      }
    ],
    suggested_engagement: `Engage with top posts using ${hashtag} by providing valuable insights or asking thoughtful questions.`
  }));

  return {
    hashtag_data: hashtagData,
    tracking_since: new Date().toISOString(),
    recommendations: [
      "Focus on hashtags with high engagement and recent growth",
      "Engage with top posts rather than just using the hashtag",
      "Monitor trending hashtags for timely opportunities"
    ]
  };
}

async function getAIKey(platform: string, supabase: any) {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `${platform}_api_key`)
      .eq('category', 'ai_platforms')
      .single();
    
    return data?.setting_value?.api_key;
  } catch (error) {
    console.error(`Error fetching ${platform} API key:`, error);
    return null;
  }
}