import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  platform: z.enum(['twitter', 'facebook', 'instagram', 'linkedin']),
  tone: z.enum(['professional', 'casual', 'friendly', 'informative']).optional(),
  maxTokens: z.number().min(50).max(2000).optional().default(500),
});

async function generateWithOpenAI(prompt: string, maxTokens: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional social media content creator. Generate engaging, platform-specific content.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      n: 3, // Generate 3 variants
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices.map((choice: { message: { content: string } }) => choice.message.content);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Validate request
    const validationResult = GenerateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { prompt, platform, tone, maxTokens } = validationResult.data;

    // Enhance prompt with platform and tone context
    const enhancedPrompt = `Generate content for ${platform}.${tone ? ` Tone: ${tone}.` : ''} Content: ${prompt}`;

    // Generate content
    const variants = await generateWithOpenAI(enhancedPrompt, maxTokens);

    // Log usage for analytics
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      platform,
      prompt_length: prompt.length,
      tokens_used: maxTokens * 3, // Approximation
      created_at: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      variants,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: maxTokens * 3,
      },
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}