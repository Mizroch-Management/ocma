import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  authenticateRequest,
  ensureOrganizationAccess,
  supabaseAdmin,
} from '../_shared/auth.ts';
import { getApiKey } from '../_shared/api-key-manager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req, corsHeaders);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const { user } = authResult;

    const { prompt, style, dimensions, platform, settings, organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasAccess = await ensureOrganizationAccess(user.id, organizationId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this organization.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating video content:', { prompt, style, dimensions, platform });

    let result;
    switch (platform) {
      case 'runware':
        result = await generateWithRunware(prompt, style, dimensions, settings, organizationId);
        break;
      case 'stability_ai':
        result = await generateWithStabilityVideo(prompt, style, dimensions, settings, organizationId);
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

interface VideoSettings {
  width?: number;
  height?: number;
  model?: string;
  quality?: string;
}

interface VideoResult {
  videoUrl: string;
  platform: string;
  cost: number;
  isPlaceholder?: boolean;
  message?: string;
}

async function generateWithRunware(prompt: string, style: string, dimensions: string, settings: VideoSettings, organizationId: string): Promise<VideoResult> {
  const apiKeyResult = await getApiKey(supabaseAdmin, {
    organizationId,
    platform: 'runware',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true,
  });

  if (!apiKeyResult.success || !apiKeyResult.apiKey) {
    throw new Error(apiKeyResult.error || 'Runware API key not configured in system settings');
  }

  const apiKey = apiKeyResult.apiKey;

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

  interface RunwareResponse {
    data?: Array<{
      taskType: string;
      imageURL?: string;
    }>;
  }
  
  const data: RunwareResponse = await response.json();
  const imageData = data.data?.find(item => item.taskType === 'imageInference');
  
  return {
    videoUrl: imageData?.imageURL, // Placeholder - would be actual video URL
    platform: 'Runware Video',
    cost: 0.05,
    isPlaceholder: true,
    message: 'Video generation coming soon - showing preview frame'
  };
}

async function generateWithStabilityVideo(prompt: string, style: string, dimensions: string, settings: VideoSettings, organizationId: string): Promise<VideoResult> {
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
