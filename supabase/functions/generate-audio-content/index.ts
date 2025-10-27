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

    const { prompt, style, platform, settings, organizationId } = await req.json();

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

    console.log('Generating audio content:', { prompt, style, platform });

    let result;
    switch (platform) {
      case 'elevenlabs':
        result = await generateWithElevenLabs(prompt, style, settings, organizationId);
        break;
      case 'openai':
        result = await generateWithOpenAI(prompt, style, settings, organizationId);
        break;
      default:
        throw new Error(`Audio generation not supported for platform: ${platform}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating audio content:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate audio content',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface AudioSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  voice_id?: string;
}

interface AudioResult {
  audioUrl: string;
  platform: string;
  cost: number;
  voiceUsed: string;
}

async function generateWithElevenLabs(prompt: string, style: string, settings: AudioSettings, organizationId: string): Promise<AudioResult> {
  const apiKeyResult = await getApiKey(supabaseAdmin, {
    organizationId,
    platform: 'elevenlabs',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true,
  });

  if (!apiKeyResult.success || !apiKeyResult.apiKey) {
    throw new Error(apiKeyResult.error || 'ElevenLabs API key not configured in system settings');
  }

  const apiKey = apiKeyResult.apiKey;

  // Voice selection based on style
  const voiceMap: { [key: string]: string } = {
    'professional': 'EXAVITQu4vr4xnSDxMaL', // Sarah
    'conversational': 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    'energetic': 'pFZP5JQG7iQjIQuC4Bku', // Lily
    'calm': 'onwK4e9ZLuTAKqWW03F9', // Daniel
    'authoritative': 'CwhRBWXzGAHq8TQ4Fs17', // Roger
  };

  const voiceId = voiceMap[style] || voiceMap['professional'];

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: prompt,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.5,
        use_speaker_boost: true
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  const audioBlob = await response.blob();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await audioBlob.arrayBuffer())));

  return {
    audioUrl: `data:audio/mpeg;base64,${base64}`,
    platform: 'ElevenLabs',
    cost: calculateElevenLabsCost(prompt.length),
    voiceUsed: voiceId
  };
}

async function generateWithOpenAI(prompt: string, style: string, settings: AudioSettings, organizationId: string): Promise<AudioResult> {
  const apiKeyResult = await getApiKey(supabaseAdmin, {
    organizationId,
    platform: 'openai',
    allowGlobalFallback: true,
    allowEnvironmentFallback: true,
  });

  if (!apiKeyResult.success || !apiKeyResult.apiKey) {
    throw new Error(apiKeyResult.error || 'OpenAI API key not configured in system settings');
  }

  const apiKey = apiKeyResult.apiKey;

  // Voice selection based on style
  const voiceMap: { [key: string]: string } = {
    'professional': 'nova',
    'conversational': 'alloy',
    'energetic': 'shimmer',
    'calm': 'echo',
    'authoritative': 'onyx',
  };

  const voice = voiceMap[style] || 'alloy';

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: prompt,
      voice: voice,
      response_format: 'mp3'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI TTS error');
  }

  const audioBlob = await response.blob();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await audioBlob.arrayBuffer())));

  return {
    audioUrl: `data:audio/mpeg;base64,${base64}`,
    platform: 'OpenAI TTS',
    cost: calculateOpenAICost(prompt.length),
    voiceUsed: voice
  };
}

function calculateElevenLabsCost(textLength: number): number {
  // ElevenLabs charges per character
  const charactersPerCredit = 1000;
  const costPerCredit = 0.18;
  return (textLength / charactersPerCredit) * costPerCredit;
}

function calculateOpenAICost(textLength: number): number {
  // OpenAI charges per 1k characters
  const pricePerThousandChars = 0.015;
  return (textLength / 1000) * pricePerThousandChars;
}
