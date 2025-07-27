import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mediaType, 
      strategy, 
      contentPlans, 
      existingContent,
      targetPlatforms,
      brandContext 
    } = await req.json();

    if (!mediaType) {
      throw new Error('Media type is required');
    }

    // Get OpenAI API key from database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: apiKeyData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .single();
      
    const openAIApiKey = apiKeyData?.setting_value?.api_key;
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context for AI suggestions
    let contextPrompt = `Generate 6 creative and specific ${mediaType} prompts for social media content creation.`;
    
    if (strategy) {
      contextPrompt += ` The brand strategy includes: tone of voice is ${strategy.toneOfVoice}, target audience: ${strategy.targetMarkets}, key brand values: ${strategy.brandValues?.join(', ') || 'quality and innovation'}.`;
    }

    if (contentPlans && contentPlans.length > 0) {
      const planContext = contentPlans.map(plan => 
        `Week ${plan.weekNumber}: ${plan.theme} (key messages: ${plan.keyMessages.join(', ')})`
      ).join('. ');
      contextPrompt += ` Current content plans: ${planContext}.`;
    }

    if (existingContent && existingContent.length > 0) {
      const contentContext = existingContent.slice(0, 3).map(content => 
        `"${content.title}" (${content.content_type})`
      ).join(', ');
      contextPrompt += ` Recent content includes: ${contentContext}.`;
    }

    if (targetPlatforms && targetPlatforms.length > 0) {
      contextPrompt += ` Target platforms: ${targetPlatforms.join(', ')}.`;
    }

    contextPrompt += ` 

Requirements:
- Each prompt should be specific and actionable for ${mediaType} generation
- Include style, mood, and visual elements
- Be optimized for social media engagement
- Align with the brand strategy and content plans provided
- Be diverse in style and approach
- ${mediaType === 'image' ? 'Include lighting, composition, and color suggestions' : ''}
- ${mediaType === 'video' ? 'Include motion, pacing, and storytelling elements' : ''}

Return response as a JSON array with objects containing:
- "text": the prompt text
- "style": suggested style category
- "reasoning": brief explanation of why this fits the strategy
- "planId": relevant content plan ID if applicable (or null)
- "platforms": array of recommended platforms for this content`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert social media content strategist and creative director. Generate specific, actionable prompts that align with brand strategy and drive engagement.' 
          },
          { role: 'user', content: contextPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate suggestions');
    }

    const data = await response.json();
    let suggestions;
    
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      suggestions = parsed.suggestions || parsed.prompts || parsed;
      
      // Ensure we have an array
      if (!Array.isArray(suggestions)) {
        suggestions = Object.values(suggestions);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback suggestions
      suggestions = [
        {
          text: `Professional ${mediaType} showcasing innovative solutions`,
          style: 'professional',
          reasoning: 'Appeals to business audience with modern approach',
          planId: null,
          platforms: ['linkedin', 'facebook']
        },
        {
          text: `Creative ${mediaType} with vibrant colors and dynamic composition`,
          style: 'creative',
          reasoning: 'Drives engagement through visual appeal',
          planId: null,
          platforms: ['instagram', 'tiktok']
        }
      ];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-visual-suggestions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});