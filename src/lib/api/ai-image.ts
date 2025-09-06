import { supabase } from "@/integrations/supabase/client";
import { log } from "@/utils/logger";

export interface ImageGenerationOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Get OpenAI API key for the organization
async function getOpenAIKey(organizationId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('organization_id', organizationId)
      .eq('setting_key', 'openai_api_key')
      .single();

    if (error || !data?.setting_value) {
      log.error('OpenAI API key not found', error);
      return null;
    }

    return data.setting_value as string;
  } catch (error) {
    log.error('Error fetching OpenAI API key', error);
    return null;
  }
}

// Generate AI image using OpenAI DALL-E 3
export async function generateAIImage(
  prompt: string,
  organizationId: string,
  options: Partial<ImageGenerationOptions> = {}
): Promise<GeneratedImage | null> {
  try {
    // Get API key for the organization
    const apiKey = await getOpenAIKey(organizationId);
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }

    // Call the edge function to generate the image
    const { data, error } = await supabase.functions.invoke('generate-visual-content', {
      body: {
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid',
        n: options.n || 1,
        api_key: apiKey
      }
    });

    if (error) {
      log.error('Failed to generate AI image', error);
      throw error;
    }

    if (!data?.images || data.images.length === 0) {
      throw new Error('No images generated');
    }

    // Return the first generated image
    const image = data.images[0];
    
    return {
      url: image.url,
      prompt,
      created_at: new Date().toISOString(),
      metadata: {
        size: options.size,
        quality: options.quality,
        style: options.style,
        model: 'dall-e-3'
      }
    };

  } catch (error) {
    log.error('Error generating AI image', error, undefined, {
      organizationId,
      prompt: prompt.substring(0, 100)
    });
    return null;
  }
}

// Generate multiple AI images
export async function generateMultipleImages(
  prompts: string[],
  organizationId: string,
  options: Partial<ImageGenerationOptions> = {}
): Promise<GeneratedImage[]> {
  try {
    const imagePromises = prompts.map(prompt => 
      generateAIImage(prompt, organizationId, options)
    );

    const results = await Promise.allSettled(imagePromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<GeneratedImage> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

  } catch (error) {
    log.error('Error generating multiple images', error);
    return [];
  }
}

// Save generated image to storage
export async function saveGeneratedImage(
  imageUrl: string,
  organizationId: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();
    const fileName = `ai-generated/${organizationId}/${Date.now()}.png`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (error) {
      log.error('Failed to save image to storage', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    // Save metadata to database
    await supabase
      .from('generated_images')
      .insert({
        organization_id: organizationId,
        url: publicUrl,
        original_url: imageUrl,
        metadata,
        created_at: new Date().toISOString()
      });

    return publicUrl;

  } catch (error) {
    log.error('Error saving generated image', error);
    return null;
  }
}

// Get image generation history
export async function getImageHistory(
  organizationId: string,
  limit: number = 20
): Promise<GeneratedImage[]> {
  try {
    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Failed to fetch image history', error);
      throw error;
    }

    return data?.map(img => ({
      url: img.url,
      prompt: img.metadata?.prompt || '',
      created_at: img.created_at,
      metadata: img.metadata
    })) || [];

  } catch (error) {
    log.error('Error fetching image history', error);
    return [];
  }
}

// Enhanced prompt generation for better AI images
export function enhanceImagePrompt(
  basePrompt: string,
  style?: string,
  platform?: string
): string {
  const styleModifiers: Record<string, string> = {
    professional: 'professional, clean, corporate, high quality',
    creative: 'creative, artistic, vibrant, imaginative',
    minimal: 'minimalist, simple, clean lines, white space',
    modern: 'modern, trendy, contemporary, sleek',
    vintage: 'vintage, retro, classic, nostalgic',
    playful: 'playful, fun, colorful, energetic'
  };

  const platformOptimizations: Record<string, string> = {
    instagram: 'square format, Instagram-ready, social media optimized',
    facebook: 'engaging, shareable, social media friendly',
    linkedin: 'professional, business-oriented, corporate',
    twitter: 'eye-catching, simple, clear message',
    pinterest: 'vertical format, Pinterest-style, inspirational'
  };

  let enhancedPrompt = basePrompt;

  if (style && styleModifiers[style]) {
    enhancedPrompt += `, ${styleModifiers[style]}`;
  }

  if (platform && platformOptimizations[platform]) {
    enhancedPrompt += `, ${platformOptimizations[platform]}`;
  }

  // Add quality modifiers
  enhancedPrompt += ', high resolution, professional photography, detailed';

  return enhancedPrompt;
}