import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getApiKey } from '../_shared/api-key-manager.ts';

interface VisualSettings {
  model?: string;
  quality?: string;
  width?: number;
  height?: number;
  style?: string;
}

interface VisualResult {
  url: string;
  platform: string;
  cost: number;
}

// Use the proper Supabase client type from the imported createClient
type SupabaseClient = ReturnType<typeof createClient>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Starting generate-visual-content edge function...');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, dimensions, platform, mediaType, settings, organizationId } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Generating visual content:', { prompt, style, dimensions, platform, mediaType });

    let result;
    switch (platform) {
      case 'openai':
        result = await generateWithOpenAI(prompt, style, dimensions, settings, supabase, organizationId);
        break;
      case 'stability_ai':
        result = await generateWithStabilityAI(prompt, style, dimensions, settings, supabase, organizationId);
        break;
      case 'runware':
        result = await generateWithRunware(prompt, style, dimensions, settings, supabase, organizationId);
        break;
      case 'huggingface':
        result = await generateWithHuggingFace(prompt, style, dimensions, settings, supabase, organizationId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate visual content';
    const errorDetails = error instanceof Error ? error.toString() : 'Unknown error occurred';
    console.error('Error generating visual content:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateWithOpenAI(prompt: string, style: string, dimensions: string, settings: VisualSettings, supabase: SupabaseClient, organizationId?: string): Promise<VisualResult> {
  console.log('[Generate Visual - OpenAI] Getting API key for organization:', organizationId);
  
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'openai',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[Generate Visual - OpenAI] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve OpenAI API key');
  }

  const apiKey = apiKeyResult.apiKey!;
  console.log('[Generate Visual - OpenAI] API key retrieved successfully from:', apiKeyResult.source);

  const dimensionMap: { [key: string]: string } = {
    'square': '1024x1024',
    'landscape': '1792x1024',
    'portrait': '1024x1792',
    'story': '1024x1792',
    'banner': '1792x1024',
    'thumbnail': '1792x1024'
  };

  const enhancedPrompt = `${prompt}, ${style} style, high quality, professional`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      size: dimensionMap[dimensions] || '1024x1024',
      quality: 'hd',
      n: 1,
      response_format: 'url'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return {
    url: data.data[0].url,
    platform: 'OpenAI DALL-E',
    cost: 0.040 // Approximate cost for HD image
  };
}

async function generateWithStabilityAI(prompt: string, style: string, dimensions: string, settings: VisualSettings, supabase: SupabaseClient, organizationId?: string): Promise<VisualResult> {
  console.log('[Generate Visual - Stability AI] Getting API key for organization:', organizationId);
  
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'stability',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[Generate Visual - Stability AI] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve Stability AI API key');
  }

  const apiKey = apiKeyResult.apiKey!;
  console.log('[Generate Visual - Stability AI] API key retrieved successfully from:', apiKeyResult.source);

  const dimensionMap: { [key: string]: { width: number, height: number } } = {
    'square': { width: 1024, height: 1024 },
    'landscape': { width: 1344, height: 768 },
    'portrait': { width: 768, height: 1344 },
    'story': { width: 768, height: 1344 },
    'banner': { width: 1536, height: 640 },
    'thumbnail': { width: 1344, height: 768 }
  };

  const enhancedPrompt = `${prompt}, ${style} style, highly detailed, professional quality`;
  const { width, height } = dimensionMap[dimensions] || { width: 1024, height: 1024 };

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      width,
      height,
      output_format: 'webp'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI error: ${error}`);
  }

  const imageBlob = await response.blob();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await imageBlob.arrayBuffer())));
  
  return {
    url: `data:image/webp;base64,${base64}`,
    platform: 'Stability AI',
    cost: 0.02
  };
}

async function generateWithRunware(prompt: string, style: string, dimensions: string, settings: VisualSettings, supabase: SupabaseClient, organizationId?: string): Promise<VisualResult> {
  console.log('[Generate Visual - Runware] Getting API key for organization:', organizationId);
  
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'runware',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[Generate Visual - Runware] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve Runware API key');
  }

  const apiKey = apiKeyResult.apiKey!;
  console.log('[Generate Visual - Runware] API key retrieved successfully from:', apiKeyResult.source);

  const dimensionMap: { [key: string]: { width: number, height: number } } = {
    'square': { width: 1024, height: 1024 },
    'landscape': { width: 1920, height: 1080 },
    'portrait': { width: 1080, height: 1920 },
    'story': { width: 1080, height: 1920 },
    'banner': { width: 1500, height: 500 },
    'thumbnail': { width: 1280, height: 720 }
  };

  const enhancedPrompt = `${prompt}, ${style} style, ultra high resolution`;
  const { width, height } = dimensionMap[dimensions] || { width: 1024, height: 1024 };

  const response = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        taskType: "authentication",
        apiKey: apiKey
      },
      {
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: enhancedPrompt,
        width,
        height,
        model: "runware:100@1",
        numberResults: 1,
        outputFormat: "WEBP"
      }
    ]),
  });

  if (!response.ok) {
    throw new Error('Runware API error');
  }

  interface RunwareImageResponse {
    data?: Array<{
      taskType: string;
      imageURL?: string;
    }>;
  }
  
  const data: RunwareImageResponse = await response.json();
  const imageData = data.data?.find(item => item.taskType === 'imageInference');
  
  if (!imageData?.imageURL) {
    throw new Error('No image generated by Runware');
  }

  return {
    url: imageData.imageURL,
    platform: 'Runware',
    cost: 0.0013
  };
}

async function generateWithHuggingFace(prompt: string, style: string, dimensions: string, settings: VisualSettings, supabase: SupabaseClient, organizationId?: string): Promise<VisualResult> {
  console.log('[Generate Visual - HuggingFace] Getting API key for organization:', organizationId);
  
  const apiKeyResult = await getApiKey(supabase, {
    organizationId,
    platform: 'huggingface',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true
  });

  if (!apiKeyResult.success) {
    console.error('[Generate Visual - HuggingFace] Failed to get API key:', apiKeyResult.error);
    throw new Error(apiKeyResult.error || 'Failed to retrieve HuggingFace API key');
  }

  const apiKey = apiKeyResult.apiKey!;
  console.log('[Generate Visual - HuggingFace] API key retrieved successfully from:', apiKeyResult.source);

  const enhancedPrompt = `${prompt}, ${style} style, high quality`;

  const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error('Hugging Face API error');
  }

  const imageBlob = await response.blob();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await imageBlob.arrayBuffer())));

  return {
    url: `data:image/png;base64,${base64}`,
    platform: 'Hugging Face',
    cost: 0 // Free tier
  };
}