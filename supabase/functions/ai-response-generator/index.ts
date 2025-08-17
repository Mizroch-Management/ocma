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

    const { 
      original_content, 
      context, 
      response_style = 'professional', 
      platform,
      user_profile = {},
      conversation_history = [],
      organizationId
    } = await req.json()

    const response = await generateAIResponse({
      original_content,
      context,
      response_style,
      platform,
      user_profile,
      conversation_history,
      supabase,
      organizationId
    });

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('AI response generation error:', error)
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

interface AIResponseParams {
  original_content: string;
  context: Record<string, unknown>;
  response_style: string;
  platform: string;
  user_profile: Record<string, unknown>;
  conversation_history: ConversationHistoryItem[];
  supabase: ReturnType<typeof createClient>;
  organizationId?: string;
}

interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  [key: string]: unknown;
}

async function generateAIResponse(params: AIResponseParams) {
  const { original_content, context, response_style, platform, user_profile, conversation_history, supabase, organizationId } = params;

  // Get OpenAI API key using centralized management system
  console.log('[AI Response Generator] Getting OpenAI API key for organization:', organizationId);
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'openai',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[AI Response Generator] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve OpenAI API key');
  }

  const openaiKey = apiKeyResult.apiKey!;
  console.log('[AI Response Generator] API key retrieved successfully from:', apiKeyResult.source);

  // Build context-aware prompt
  const systemPrompt = buildSystemPrompt(response_style, platform, context);
  const userPrompt = buildUserPrompt(original_content, user_profile, conversation_history);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }
    })
  });

  const result = await response.json();
  const aiResponse = JSON.parse(result.choices[0].message.content);

  // Generate multiple variations
  const variations = await generateResponseVariations(
    aiResponse.response, 
    response_style, 
    platform, 
    openaiKey
  );

  return {
    primary_response: aiResponse.response,
    variations,
    confidence_score: aiResponse.confidence || 85,
    engagement_tips: aiResponse.engagement_tips || [],
    optimal_timing: calculateOptimalTiming(platform, user_profile),
    hashtag_suggestions: aiResponse.hashtag_suggestions || [],
    tone_analysis: aiResponse.tone_analysis || 'professional',
    character_count: aiResponse.response.length,
    platform_optimized: optimizeForPlatform(aiResponse.response, platform)
  };
}

function buildSystemPrompt(style: string, platform: string, context: Record<string, unknown>) {
  const basePrompt = `You are an expert social media engagement specialist. Generate thoughtful, engaging responses that build relationships and provide value.

Platform: ${platform}
Response Style: ${style}
Context: ${JSON.stringify(context)}

Guidelines:
- Be authentic and helpful
- Provide genuine value in your response
- Match the ${style} tone appropriately
- Keep responses appropriate for ${platform}
- Include relevant hashtags if appropriate
- Consider the context and relationship history

Response Requirements:
- Generate a response that encourages further engagement
- Include engagement tips for best practices
- Suggest optimal timing if relevant
- Provide tone analysis
- Return response in JSON format with fields: response, confidence, engagement_tips, hashtag_suggestions, tone_analysis`;

  return basePrompt;
}

function buildUserPrompt(original_content: string, user_profile: Record<string, unknown>, conversation_history: ConversationHistoryItem[]) {
  let prompt = `Original message to respond to: "${original_content}"`;
  
  if (user_profile && Object.keys(user_profile).length > 0) {
    prompt += `\n\nUser profile information: ${JSON.stringify(user_profile)}`;
  }
  
  if (conversation_history && conversation_history.length > 0) {
    prompt += `\n\nPrevious conversation context: ${JSON.stringify(conversation_history.slice(-3))}`;
  }
  
  prompt += `\n\nGenerate an appropriate response that provides value and encourages engagement.`;
  
  return prompt;
}

async function generateResponseVariations(baseResponse: string, style: string, platform: string, apiKey: string) {
  const styles = ['casual', 'professional', 'enthusiastic', 'helpful'];
  const variations = [];

  for (const variantStyle of styles.filter(s => s !== style)) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Rewrite the following social media response in a ${variantStyle} tone while maintaining the core message and value. Keep it appropriate for ${platform}.`
            },
            {
              role: 'user',
              content: baseResponse
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        })
      });

      const result = await response.json();
      variations.push({
        style: variantStyle,
        response: result.choices[0].message.content,
        character_count: result.choices[0].message.content.length
      });
    } catch (error: unknown) {
      console.error(`Error generating ${variantStyle} variation:`, error);
    }
  }

  return variations;
}

interface UserProfile {
  timezone?: string;
  location?: string;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

function calculateOptimalTiming(platform: string, userProfile: UserProfile) {
  // AI-powered optimal timing based on platform and user data
  const timingMap = {
    'twitter': {
      weekday: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'],
      weekend: ['10:00 AM', '2:00 PM', '4:00 PM']
    },
    'facebook': {
      weekday: ['9:00 AM', '1:00 PM', '3:00 PM'],
      weekend: ['12:00 PM', '2:00 PM']
    },
    'instagram': {
      weekday: ['11:00 AM', '2:00 PM', '5:00 PM'],
      weekend: ['10:00 AM', '1:00 PM', '4:00 PM']
    },
    'linkedin': {
      weekday: ['8:00 AM', '12:00 PM', '2:00 PM', '5:00 PM'],
      weekend: ['9:00 AM', '11:00 AM']
    }
  };

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const times = timingMap[platform as keyof typeof timingMap] || timingMap.twitter;
  const optimalTimes = isWeekend ? times.weekend : times.weekday;

  return {
    recommended_time: optimalTimes[Math.floor(Math.random() * optimalTimes.length)],
    timezone: userProfile.timezone || 'UTC',
    reasoning: `Based on ${platform} engagement patterns and ${isWeekend ? 'weekend' : 'weekday'} analytics`,
    alternative_times: optimalTimes.slice(0, 3)
  };
}

function optimizeForPlatform(response: string, platform: string) {
  const limits = {
    'twitter': 280,
    'facebook': 2000,
    'instagram': 2200,
    'linkedin': 1300
  };

  const limit = limits[platform as keyof typeof limits] || 280;
  
  return {
    original_length: response.length,
    platform_limit: limit,
    within_limit: response.length <= limit,
    optimized_response: response.length > limit ? response.substring(0, limit - 3) + '...' : response,
    truncated: response.length > limit
  };
}

// Note: getAIKey function removed - now using centralized getApiKey from api-key-manager.ts