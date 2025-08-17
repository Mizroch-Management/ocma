/**
 * Centralized API Key Management System
 * 
 * This module provides a unified interface for retrieving API keys across all Supabase functions.
 * It implements proper fallback mechanisms and error handling for organization-specific configurations.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ApiKeyResult {
  success: boolean;
  apiKey?: string;
  error?: string;
  source?: 'organization' | 'global' | 'environment';
}

export interface ApiKeyOptions {
  organizationId?: string;
  platform: string; // 'openai', 'stability', 'runware', etc.
  allowGlobalFallback?: boolean;
  allowEnvironmentFallback?: boolean;
}

/**
 * Centralized API key retrieval with comprehensive fallback logic
 */
export async function getApiKey(
  supabase: ReturnType<typeof createClient>,
  options: ApiKeyOptions
): Promise<ApiKeyResult> {
  const { organizationId, platform, allowGlobalFallback = true, allowEnvironmentFallback = true } = options;
  
  console.log(`[API Key Manager] Retrieving ${platform} API key for organization: ${organizationId || 'none'}`);

  try {
    // Step 1: Try organization-specific API key
    if (organizationId) {
      const orgResult = await getOrganizationApiKey(supabase, organizationId, platform);
      if (orgResult.success) {
        console.log(`[API Key Manager] Found organization-specific ${platform} API key`);
        return { ...orgResult, source: 'organization' };
      }
      console.log(`[API Key Manager] No organization-specific ${platform} API key found`);
    }

    // Step 2: Try global fallback (no organization_id constraint)
    if (allowGlobalFallback) {
      const globalResult = await getGlobalApiKey(supabase, platform);
      if (globalResult.success) {
        console.log(`[API Key Manager] Found global ${platform} API key`);
        return { ...globalResult, source: 'global' };
      }
      console.log(`[API Key Manager] No global ${platform} API key found`);
    }

    // Step 3: Try environment variable fallback
    if (allowEnvironmentFallback) {
      const envResult = getEnvironmentApiKey(platform);
      if (envResult.success) {
        console.log(`[API Key Manager] Found environment ${platform} API key`);
        return { ...envResult, source: 'environment' };
      }
      console.log(`[API Key Manager] No environment ${platform} API key found`);
    }

    // No API key found anywhere
    const errorMessage = organizationId 
      ? `${platform} API key not found for organization ${organizationId}. Please configure it in your organization settings.`
      : `${platform} API key not found. Please configure it in your settings or contact support.`;

    console.error(`[API Key Manager] ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };

  } catch (error) {
    console.error(`[API Key Manager] Error retrieving ${platform} API key:`, error);
    return {
      success: false,
      error: `Failed to retrieve API key: ${error.message}`
    };
  }
}

/**
 * Get organization-specific API key
 */
async function getOrganizationApiKey(
  supabase: ReturnType<typeof createClient>, 
  organizationId: string, 
  platform: string
): Promise<ApiKeyResult> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `${platform}_api_key`)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error(`[API Key Manager] Database error for organization ${organizationId}:`, error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!data?.setting_value?.api_key) {
      return {
        success: false,
        error: `No ${platform} API key configured for organization ${organizationId}`
      };
    }

    // Validate API key format
    const apiKey = data.setting_value.api_key.trim();
    if (!isValidApiKeyFormat(platform, apiKey)) {
      return {
        success: false,
        error: `Invalid ${platform} API key format for organization ${organizationId}`
      };
    }

    return {
      success: true,
      apiKey: apiKey
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch organization API key: ${error.message}`
    };
  }
}

/**
 * Get global API key (fallback when organization key not found)
 */
async function getGlobalApiKey(supabase: ReturnType<typeof createClient>, platform: string): Promise<ApiKeyResult> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `${platform}_api_key`)
      .is('organization_id', null)
      .maybeSingle();

    if (error) {
      console.error(`[API Key Manager] Database error for global key:`, error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!data?.setting_value?.api_key) {
      return {
        success: false,
        error: `No global ${platform} API key configured`
      };
    }

    const apiKey = data.setting_value.api_key.trim();
    if (!isValidApiKeyFormat(platform, apiKey)) {
      return {
        success: false,
        error: `Invalid global ${platform} API key format`
      };
    }

    return {
      success: true,
      apiKey: apiKey
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch global API key: ${error.message}`
    };
  }
}

/**
 * Get API key from environment variables (final fallback)
 */
function getEnvironmentApiKey(platform: string): ApiKeyResult {
  try {
    const envVarName = `${platform.toUpperCase()}_API_KEY`;
    const apiKey = Deno.env.get(envVarName);

    if (!apiKey) {
      return {
        success: false,
        error: `No ${envVarName} environment variable found`
      };
    }

    if (!isValidApiKeyFormat(platform, apiKey)) {
      return {
        success: false,
        error: `Invalid ${platform} API key format in environment variable`
      };
    }

    return {
      success: true,
      apiKey: apiKey.trim()
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to get environment API key: ${error.message}`
    };
  }
}

/**
 * Validate API key format for different platforms
 */
function isValidApiKeyFormat(platform: string, apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    return false;
  }

  switch (platform.toLowerCase()) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length >= 20;
    case 'stability':
      return apiKey.startsWith('sk-') && apiKey.length >= 20;
    case 'runware':
      return apiKey.length >= 20; // Runware keys don't have specific prefix
    case 'huggingface':
      return apiKey.startsWith('hf_') && apiKey.length >= 20;
    default:
      // Generic validation - just check it's not empty and reasonable length
      return apiKey.length >= 10;
  }
}

/**
 * Get multiple API keys at once (for functions that need multiple platforms)
 */
export async function getMultipleApiKeys(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  platforms: string[]
): Promise<Record<string, ApiKeyResult>> {
  const results: Record<string, ApiKeyResult> = {};
  
  console.log(`[API Key Manager] Retrieving multiple API keys for platforms: ${platforms.join(', ')}`);
  
  for (const platform of platforms) {
    results[platform] = await getApiKey(supabase, {
      organizationId,
      platform,
      allowGlobalFallback: true,
      allowEnvironmentFallback: true
    });
  }
  
  return results;
}

/**
 * Validate that required API keys are available
 */
export function validateRequiredApiKeys(
  apiKeys: Record<string, ApiKeyResult>,
  requiredPlatforms: string[]
): { valid: boolean; missing: string[]; errors: string[] } {
  const missing: string[] = [];
  const errors: string[] = [];
  
  for (const platform of requiredPlatforms) {
    const result = apiKeys[platform];
    if (!result?.success) {
      missing.push(platform);
      if (result?.error) {
        errors.push(`${platform}: ${result.error}`);
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    errors
  };
}