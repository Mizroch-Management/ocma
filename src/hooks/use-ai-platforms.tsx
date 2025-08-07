import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { log } from '@/utils/logger';

export interface AIPlatform {
  key: string;
  name: string;
  description: string;
  supportsTools: boolean;
  isConfigured: boolean;
  apiKey?: string;
  enabledTools?: string[];
}

export function useAIPlatforms() {
  const [platforms, setPlatforms] = useState<AIPlatform[]>([]);
  const [loading, setLoading] = useState(true);

  const aiPlatformConfigs = {
    openai: { name: "OpenAI", description: "GPT models for text generation", supportsTools: true },
    anthropic: { name: "Anthropic", description: "Claude models for text generation", supportsTools: true },
    google_ai: { name: "Google AI", description: "Gemini models for text generation", supportsTools: true },
    perplexity: { name: "Perplexity", description: "Real-time search and reasoning", supportsTools: true },
    grok: { name: "Grok", description: "xAI's advanced reasoning model", supportsTools: true },
    huggingface: { name: "Hugging Face", description: "Open source AI models", supportsTools: false },
    stability_ai: { name: "Stability AI", description: "Stable Diffusion for image generation", supportsTools: false },
    elevenlabs: { name: "ElevenLabs", description: "Voice synthesis and cloning", supportsTools: false },
    runware: { name: "Runware", description: "Fast image generation API", supportsTools: false }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'ai_platforms');
      
      if (error) throw error;

      const platformList = Object.entries(aiPlatformConfigs).map(([key, config]) => {
        const setting = data?.find(s => s.setting_key === `${key}_api_key`);
        const settingValue = setting?.setting_value as { api_key?: string; supports_tools?: boolean } | null;
        const apiKey = settingValue?.api_key || '';
        const supportsTools = settingValue?.supports_tools ?? config.supportsTools;
        
        return {
          key,
          name: config.name,
          description: config.description,
          supportsTools,
          isConfigured: apiKey.trim() !== '',
          apiKey: apiKey
        };
      });

      setPlatforms(platformList);
    } catch (error) {
      log.error('Error fetching AI platforms', error instanceof Error ? error : new Error(String(error)), {}, {
        component: 'useAIPlatforms',
        action: 'fetch_platforms'
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfiguredPlatforms = () => platforms.filter(p => p.isConfigured);
  const getPlatformsWithTools = () => platforms.filter(p => p.supportsTools && p.isConfigured);
  const getPlatformTools = (platformKey: string) => {
    const platform = platforms.find(p => p.key === platformKey);
    return platform?.enabledTools || [];
  };

  return {
    platforms,
    loading,
    getConfiguredPlatforms,
    getPlatformsWithTools,
    getPlatformTools,
    refetch: fetchPlatforms
  };
}