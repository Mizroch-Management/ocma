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

  try {
    const { 
      contentType, 
      strategy, 
      platforms, 
      customPrompt, 
      aiTool = 'gpt-4o-mini'
    } = await req.json();

    // Initialize Supabase client with service role for system settings access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key from database
    console.log('Fetching OpenAI API key from database...');
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .maybeSingle();

    console.log('API key query result:', { apiKeyData, apiKeyError });

    if (apiKeyError) {
      console.error('Database error:', apiKeyError);
      throw new Error(`Database error: ${apiKeyError.message}`);
    }

    if (!apiKeyData?.setting_value?.api_key) {
      console.error('No API key found in database');
      throw new Error('OpenAI API key not configured in system settings');
    }

    const openAIApiKey = apiKeyData.setting_value.api_key;
    console.log('API key found, length:', openAIApiKey.length);

    // Build the content generation prompt based on parameters
    let systemPrompt = `You are an expert content marketing strategist and copywriter. Generate high-quality, engaging content based on the user's requirements.`;
    
    let userPrompt = `Generate ${contentType} content`;
    
    if (strategy) {
      userPrompt += ` for the marketing strategy: "${strategy}"`;
    }
    
    if (platforms && platforms.length > 0) {
      userPrompt += ` optimized for: ${platforms.join(', ')}`;
    }
    
    if (customPrompt) {
      userPrompt += `\n\nSpecific requirements: ${customPrompt}`;
    }

    // Add content type specific instructions
    const contentInstructions = {
      'social-post': 'Create an engaging social media post with emojis, hashtags, and a clear call-to-action. Keep it concise but impactful.',
      'blog-article': 'Write a comprehensive blog article with an engaging introduction, well-structured body, and compelling conclusion. Include relevant subheadings.',
      'video-script': 'Create a video script with clear sections: hook (0-3s), introduction (3-10s), main content (10-45s), and call-to-action (45-60s).',
      'email-copy': 'Write compelling email copy with an attention-grabbing subject line, personalized greeting, valuable content, and clear CTA.',
      'ad-copy': 'Create persuasive ad copy with a strong headline, benefit-focused body text, and compelling call-to-action.',
      'caption': 'Write an engaging caption that complements visual content, includes relevant hashtags, and encourages engagement.',
      'hashtags': 'Generate a strategic mix of hashtags: 3-5 popular, 3-5 niche-specific, and 2-3 branded hashtags.'
    };

    userPrompt += `\n\nContent Type Guidelines: ${contentInstructions[contentType as keyof typeof contentInstructions] || 'Create engaging content optimized for the specified platforms.'}`;

    userPrompt += `\n\nProvide the response in this JSON format:
{
  "title": "Content title",
  "content": "Main content",
  "variations": ["variation 1", "variation 2"],
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2", "improvement suggestion 3"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "platformOptimizations": {
    "instagram": {"content": "IG optimized version", "hashtags": ["#ig1", "#ig2"], "cta": "Shop now"},
    "linkedin": {"content": "LinkedIn optimized version", "hashtags": ["#linkedin1", "#linkedin2"], "cta": "Learn more"}
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiTool.includes('gpt-4o') ? aiTool : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    // Try to parse as JSON, fallback to text if it fails
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedText);
    } catch (e) {
      // If JSON parsing fails, create a structured response from the text
      parsedContent = {
        title: `AI Generated ${contentType}`,
        content: generatedText,
        variations: [
          generatedText + " (Alternative approach)",
          generatedText.length > 100 ? generatedText.substring(0, 100) + "..." : generatedText + " (Short version)"
        ],
        suggestions: [
          "Consider adding more engaging visuals",
          "Include a stronger call-to-action",
          "Test different posting times for optimal engagement"
        ],
        hashtags: ["#AI", "#Content", "#Marketing"],
        platformOptimizations: {}
      };
    }

    // Add metadata
    const responseData = {
      ...parsedContent,
      metadata: {
        wordCount: parsedContent.content.split(' ').length,
        readingTime: Math.ceil(parsedContent.content.split(' ').length / 200) + " min",
        engagement: "High",
        sentiment: "Positive",
        aiTool: aiTool
      },
      schedulingSuggestions: [
        "Tuesday 10:00 AM - Peak engagement time",
        "Thursday 2:00 PM - Afternoon boost", 
        "Saturday 9:00 AM - Weekend reach"
      ]
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate content. Please check your API key and try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});