import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, dimensions, platform, mediaType, settings } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Generating visual content:', { prompt, style, dimensions, platform, mediaType });

    let result;
    switch (platform) {
      case 'openai':
        result = await generateWithOpenAI(prompt, style, dimensions, settings);
        break;
      case 'stability_ai':
        result = await generateWithStabilityAI(prompt, style, dimensions, settings);
        break;
      case 'runware':
        result = await generateWithRunware(prompt, style, dimensions, settings);
        break;
      case 'huggingface':
        result = await generateWithHuggingFace(prompt, style, dimensions, settings);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating visual content:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate visual content',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateWithOpenAI(prompt: string, style: string, dimensions: string, settings: any) {
  // Get API key from database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data: apiKeyData, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'openai_api_key')
    .eq('category', 'ai_platforms')
    .maybeSingle();
    
  console.log('API key query result:', { apiKeyData, error });
    
  if (error) {
    console.error('Database error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  const apiKey = apiKeyData?.setting_value?.api_key;
  if (!apiKey) {
    console.error('No OpenAI API key found in database');
    throw new Error('OpenAI API key not configured in system settings');
  }

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
      model: 'gpt-image-1',
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

async function generateWithStabilityAI(prompt: string, style: string, dimensions: string, settings: any) {
  // Get API key from database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data: apiKeyData, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'stability_ai_api_key')
    .eq('category', 'ai_platforms')
    .maybeSingle();
    
  console.log('Stability AI API key query result:', { apiKeyData, error });
    
  if (error) {
    console.error('Database error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  const apiKey = apiKeyData?.setting_value?.api_key;
  if (!apiKey) {
    console.error('No Stability AI API key found in database');
    throw new Error('Stability AI API key not configured in system settings');
  }

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

async function generateWithRunware(prompt: string, style: string, dimensions: string, settings: any) {
  // Get API key from database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data: apiKeyData, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'runware_api_key')
    .eq('category', 'ai_platforms')
    .maybeSingle();
    
  console.log('Runware API key query result:', { apiKeyData, error });
    
  if (error) {
    console.error('Database error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  const apiKey = apiKeyData?.setting_value?.api_key;
  if (!apiKey) {
    console.error('No Runware API key found in database');
    throw new Error('Runware API key not configured in system settings');
  }

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

  const data = await response.json();
  const imageData = data.data?.find((item: any) => item.taskType === 'imageInference');
  
  if (!imageData?.imageURL) {
    throw new Error('No image generated by Runware');
  }

  return {
    url: imageData.imageURL,
    platform: 'Runware',
    cost: 0.0013
  };
}

async function generateWithHuggingFace(prompt: string, style: string, dimensions: string, settings: any) {
  // Get API key from database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data: apiKeyData, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'huggingface_api_key')
    .eq('category', 'ai_platforms')
    .maybeSingle();
    
  console.log('HuggingFace API key query result:', { apiKeyData, error });
    
  if (error) {
    console.error('Database error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  const apiKey = apiKeyData?.setting_value?.api_key;
  if (!apiKey) {
    console.error('No HuggingFace API key found in database');
    throw new Error('HuggingFace API key not configured in system settings');
  }

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