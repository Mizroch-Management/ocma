import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getApiKey } from '../_shared/api-key-manager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge function called:', req.method);
  try {
    const { 
      contentType, 
      strategy, 
      platforms, 
      customPrompt, 
      aiTool = 'gpt-4o-mini',
      organizationId 
    } = await req.json();

    // Initialize Supabase client with service role for system settings access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key using centralized management system
    console.log('[Generate Content] Fetching OpenAI API key for organization:', organizationId);
    const apiKeyResult = await getApiKey(supabase, {
      organizationId,
      platform: 'openai',
      allowGlobalFallback: true,
      allowEnvironmentFallback: true
    });

    if (!apiKeyResult.success) {
      console.error('[Generate Content] Failed to get API key:', apiKeyResult.error);
      throw new Error(apiKeyResult.error || 'Failed to retrieve OpenAI API key');
    }

    const openAIApiKey = apiKeyResult.apiKey!;
    console.log('[Generate Content] API key retrieved successfully from:', apiKeyResult.source);

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

    userPrompt += `\n\nProvide a structured response with the following sections:

1. TITLE: A catchy title for the content
2. MAIN CONTENT: The primary content piece (write in natural, engaging language - no JSON)
3. VARIATION 1: An alternative version of the content
4. VARIATION 2: Another alternative version
5. SUGGESTIONS: Three specific improvement suggestions
6. HASHTAGS: Relevant hashtags for the content
7. PLATFORM OPTIMIZATIONS: Specific versions for different platforms if requested

Format your response with clear section headers using "###" but ensure the content itself is natural text, not JSON.`;

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

    // Parse the structured text response
    let parsedContent;
    try {
      // First try JSON parsing in case the AI returns JSON
      parsedContent = JSON.parse(generatedText);
      // If it's JSON, ensure content field is plain text
      if (typeof parsedContent.content === 'object') {
        parsedContent.content = JSON.stringify(parsedContent.content);
      }
    } catch (e) {
      // Parse the text-based response with section headers
      const sections: any = {};
      const lines = generatedText.split('\n');
      let currentSection = '';
      let currentContent: string[] = [];
      
      for (const line of lines) {
        if (line.startsWith('### ') || line.match(/^\d+\.\s+(TITLE|MAIN CONTENT|VARIATION|SUGGESTIONS|HASHTAGS|PLATFORM)/)) {
          // Save previous section if exists
          if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
          }
          // Start new section
          currentSection = line.replace(/^###\s+/, '').replace(/^\d+\.\s+/, '').replace(':', '').trim();
          currentContent = [];
        } else if (line.trim()) {
          currentContent.push(line);
        }
      }
      // Save last section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      
      // Extract variations
      const variations = [];
      if (sections['VARIATION 1']) variations.push(sections['VARIATION 1']);
      if (sections['VARIATION 2']) variations.push(sections['VARIATION 2']);
      
      // Extract suggestions (split by line or bullet points)
      const suggestionsText = sections['SUGGESTIONS'] || '';
      const suggestions = suggestionsText
        .split(/\n|•|·|-/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 3);
      
      // Extract hashtags
      const hashtagsText = sections['HASHTAGS'] || '';
      const hashtags = hashtagsText
        .match(/#\w+/g) || ['#content', '#marketing', '#social'];
      
      parsedContent = {
        title: sections['TITLE'] || `AI Generated ${contentType}`,
        content: sections['MAIN CONTENT'] || generatedText,
        variations: variations.length > 0 ? variations : [
          (sections['MAIN CONTENT'] || generatedText) + " (Alternative approach)",
          (sections['MAIN CONTENT'] || generatedText).substring(0, 100) + "..."
        ],
        suggestions: suggestions.length > 0 ? suggestions : [
          "Consider adding more engaging visuals",
          "Include a stronger call-to-action",
          "Test different posting times for optimal engagement"
        ],
        hashtags: hashtags,
        platformOptimizations: sections['PLATFORM OPTIMIZATIONS'] ? 
          { general: sections['PLATFORM OPTIMIZATIONS'] } : {}
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
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate content';
    let details = error.message;
    
    if (error.message.includes('API key')) {
      errorMessage = 'OpenAI API key not configured';
      details = 'Please configure your OpenAI API key in Settings > AI Platforms';
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Invalid OpenAI API key';
      details = 'The OpenAI API key is invalid. Please check your API key in Settings';
    } else if (error.message.includes('429')) {
      errorMessage = 'Rate limit exceeded';
      details = 'Too many requests. Please wait a moment and try again';
    } else if (error.message.includes('OpenAI API error')) {
      errorMessage = 'OpenAI API error';
      details = 'The OpenAI service returned an error. Please try again';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: details
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});