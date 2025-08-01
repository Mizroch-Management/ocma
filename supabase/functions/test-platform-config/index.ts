import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  platform: string;
  type: 'social_media' | 'ai_platform';
  credentials?: any;
  api_key?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { platform, type, credentials, api_key }: TestRequest = await req.json();

    let testResult = { success: false, message: '', details: null };

    if (type === 'ai_platform') {
      testResult = await testAIPlatform(platform, api_key);
    } else if (type === 'social_media') {
      testResult = await testSocialMediaPlatform(platform, credentials);
    }

    // Update database with test result
    if (testResult.success) {
      const settingKey = type === 'ai_platform' ? `${platform}_api_key` : `${platform}_integration`;
      const currentSetting = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single();

      if (currentSetting.data) {
        let updatedValue;
        if (type === 'ai_platform') {
          updatedValue = {
            ...currentSetting.data.setting_value,
            api_key,
            verified: true,
            last_verified: new Date().toISOString()
          };
        } else {
          updatedValue = {
            ...currentSetting.data.setting_value,
            connected: true,
            verified: true,
            last_verified: new Date().toISOString(),
            credentials
          };
        }

        await supabaseClient
          .from('system_settings')
          .update({ setting_value: updatedValue })
          .eq('setting_key', settingKey);
      }
    }

    return new Response(
      JSON.stringify(testResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function testAIPlatform(platform: string, apiKey: string) {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, message: 'API key is required' };
  }

  try {
    switch (platform) {
      case 'openai':
        return await testOpenAI(apiKey);
      case 'anthropic':
        return await testAnthropic(apiKey);
      case 'google_ai':
        return await testGoogleAI(apiKey);
      case 'perplexity':
        return await testPerplexity(apiKey);
      case 'huggingface':
        return await testHuggingFace(apiKey);
      case 'stability_ai':
        return await testStabilityAI(apiKey);
      case 'elevenlabs':
        return await testElevenLabs(apiKey);
      case 'runware':
        return await testRunware(apiKey);
      default:
        return { success: false, message: 'Unsupported AI platform' };
    }
  } catch (error) {
    return { success: false, message: `Test failed: ${error.message}` };
  }
}

async function testSocialMediaPlatform(platform: string, credentials: any) {
  try {
    switch (platform) {
      case 'facebook':
        return await testFacebook(credentials);
      case 'instagram':
        return await testInstagram(credentials);
      case 'twitter':
        return await testTwitter(credentials);
      case 'linkedin':
        return await testLinkedIn(credentials);
      case 'youtube':
        return await testYouTube(credentials);
      case 'tiktok':
        return await testTikTok(credentials);
      case 'pinterest':
        return await testPinterest(credentials);
      case 'snapchat':
        return await testSnapchat(credentials);
      default:
        return { success: false, message: 'Unsupported social media platform' };
    }
  } catch (error) {
    return { success: false, message: `Test failed: ${error.message}` };
  }
}

// AI Platform Tests
async function testOpenAI(apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'OpenAI API key verified successfully',
      details: { models_count: data.data?.length || 0 }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `OpenAI API error: ${error}` };
  }
}

async function testAnthropic(apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hello' }]
    })
  });

  if (response.ok) {
    return { 
      success: true, 
      message: 'Anthropic API key verified successfully',
      details: { status: 'Connected to Claude models' }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Anthropic API error: ${error}` };
  }
}

async function testGoogleAI(apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Google AI API key verified successfully',
      details: { models_count: data.models?.length || 0 }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Google AI API error: ${error}` };
  }
}

async function testPerplexity(apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    })
  });

  if (response.ok) {
    return { 
      success: true, 
      message: 'Perplexity API key verified successfully',
      details: { status: 'Connected to Perplexity models' }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Perplexity API error: ${error}` };
  }
}

async function testHuggingFace(apiKey: string) {
  const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: 'Hello' })
  });

  if (response.ok) {
    return { 
      success: true, 
      message: 'Hugging Face API key verified successfully',
      details: { status: 'Connected to Hugging Face models' }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Hugging Face API error: ${error}` };
  }
}

async function testStabilityAI(apiKey: string) {
  const response = await fetch('https://api.stability.ai/v1/user/account', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Stability AI API key verified successfully',
      details: { email: data.email }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Stability AI API error: ${error}` };
  }
}

async function testElevenLabs(apiKey: string) {
  const response = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'ElevenLabs API key verified successfully',
      details: { subscription: data.subscription?.tier || 'free' }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `ElevenLabs API error: ${error}` };
  }
}

async function testRunware(apiKey: string) {
  const response = await fetch('https://api.runware.ai/v1/account', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    return { 
      success: true, 
      message: 'Runware API key verified successfully',
      details: { status: 'Connected to Runware API' }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Runware API error: ${error}` };
  }
}

// Social Media Platform Tests
async function testFacebook(credentials: any) {
  const { access_token, page_id } = credentials;
  if (!access_token) {
    return { success: false, message: 'Facebook access token is required' };
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${page_id || 'me'}?access_token=${access_token}`);
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Facebook credentials verified successfully',
      details: { name: data.name, id: data.id }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Facebook API error: ${error}` };
  }
}

async function testInstagram(credentials: any) {
  const { access_token, user_id } = credentials;
  if (!access_token) {
    return { success: false, message: 'Instagram access token is required' };
  }

  const response = await fetch(`https://graph.instagram.com/${user_id || 'me'}?fields=id,username&access_token=${access_token}`);
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Instagram credentials verified successfully',
      details: { username: data.username, id: data.id }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Instagram API error: ${error}` };
  }
}

async function testTwitter(credentials: any) {
  const { bearer_token } = credentials;
  if (!bearer_token) {
    return { success: false, message: 'Twitter bearer token is required' };
  }

  const response = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${bearer_token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Twitter credentials verified successfully',
      details: { username: data.data?.username, id: data.data?.id }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Twitter API error: ${error}` };
  }
}

async function testLinkedIn(credentials: any) {
  const { access_token } = credentials;
  if (!access_token) {
    return { success: false, message: 'LinkedIn access token is required' };
  }

  const response = await fetch('https://api.linkedin.com/v2/people/~', {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'LinkedIn credentials verified successfully',
      details: { id: data.id }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `LinkedIn API error: ${error}` };
  }
}

async function testYouTube(credentials: any) {
  const { api_key } = credentials;
  if (!api_key) {
    return { success: false, message: 'YouTube API key is required' };
  }

  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${api_key}`);
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'YouTube credentials verified successfully',
      details: { channels: data.items?.length || 0 }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `YouTube API error: ${error}` };
  }
}

async function testTikTok(credentials: any) {
  // TikTok API testing would require more complex OAuth flow
  // For now, just validate required fields are present
  const { app_id, access_token } = credentials;
  if (!app_id || !access_token) {
    return { success: false, message: 'TikTok App ID and access token are required' };
  }

  return { 
    success: true, 
    message: 'TikTok credentials format validated (full API test requires OAuth)',
    details: { app_id }
  };
}

async function testPinterest(credentials: any) {
  const { access_token } = credentials;
  if (!access_token) {
    return { success: false, message: 'Pinterest access token is required' };
  }

  const response = await fetch('https://api.pinterest.com/v5/user_account', {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { 
      success: true, 
      message: 'Pinterest credentials verified successfully',
      details: { username: data.username }
    };
  } else {
    const error = await response.text();
    return { success: false, message: `Pinterest API error: ${error}` };
  }
}

async function testSnapchat(credentials: any) {
  // Snapchat API testing requires more complex setup
  // For now, just validate required fields are present
  const { client_id, access_token } = credentials;
  if (!client_id || !access_token) {
    return { success: false, message: 'Snapchat Client ID and access token are required' };
  }

  return { 
    success: true, 
    message: 'Snapchat credentials format validated (full API test requires additional setup)',
    details: { client_id }
  };
}