import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const { prompt, style, dimensions, platform, settings } = await req.json();

    console.log('Generating video content:', { prompt, style, dimensions, platform });

    let result;
    switch (platform) {
      case 'runware':
        result = await generateWithRunware(prompt, style, dimensions, settings);
        break;
      case 'stability_ai':
        result = await generateWithStabilityVideo(prompt, style, dimensions, settings);
        break;
      default:
        throw new Error(`Video generation not supported for platform: ${platform}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating video content:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate video content',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

  const enhancedPrompt = `${prompt}, ${style} style, cinematic quality, smooth motion`;

  // For now, we'll generate a high-quality image and return it as a placeholder
  // In a real implementation, you'd use Runware's video generation API
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
        positivePrompt: enhancedPrompt + ", cinematic still frame",
        width: 1920,
        height: 1080,
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
  
  return {
    videoUrl: imageData?.imageURL, // Placeholder - would be actual video URL
    platform: 'Runware Video',
    cost: 0.05,
    isPlaceholder: true,
    message: 'Video generation coming soon - showing preview frame'
  };
}

async function generateWithStabilityVideo(prompt: string, style: string, dimensions: string, settings: any) {
  // Placeholder for Stability AI Video generation
  // This would use their actual video generation API when available
  
  return {
    videoUrl: 'https://via.placeholder.com/1920x1080/333333/ffffff?text=Video+Generation+Coming+Soon',
    platform: 'Stability Video',
    cost: 0.08,
    isPlaceholder: true,
    message: 'Stability Video generation coming soon'
  };
}