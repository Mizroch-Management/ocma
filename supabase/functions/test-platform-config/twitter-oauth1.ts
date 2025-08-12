import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

export function generateOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  credentials: {
    api_key: string;
    api_secret: string;
    access_token: string;
    access_token_secret: string;
  }
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0'
  };
  
  // Combine OAuth params with request params
  const allParams = { ...oauthParams, ...params };
  
  // Create parameter string
  const paramString = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(credentials.api_secret)}&${encodeURIComponent(credentials.access_token_secret)}`;
  
  // Generate signature
  const hmac = createHmac('sha1', signingKey);
  hmac.update(signatureBase);
  const signature = hmac.digest('base64');
  
  // Create OAuth header
  const oauthHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ') + `, oauth_signature="${encodeURIComponent(signature)}"`;
  
  return oauthHeader;
}

export async function testTwitterOAuth1(credentials: any) {
  const { api_key, api_secret, access_token, access_token_secret } = credentials;
  
  // Check if we have all OAuth 1.0a credentials
  if (!api_key || !api_secret || !access_token || !access_token_secret) {
    return {
      success: false,
      message: 'OAuth 1.0a credentials incomplete. All fields required: api_key, api_secret, access_token, access_token_secret',
      details: null
    };
  }
  
  try {
    // Test with account verification endpoint
    const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
    const authHeader = generateOAuth1Header('GET', verifyUrl, {}, {
      api_key,
      api_secret,
      access_token,
      access_token_secret
    });
    
    const response = await fetch(verifyUrl, {
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      return {
        success: true,
        message: `Twitter OAuth 1.0a credentials verified for @${user.screen_name}`,
        details: {
          username: user.screen_name,
          name: user.name,
          auth_type: 'OAuth 1.0a'
        }
      };
    } else {
      const error = await response.text();
      return {
        success: false,
        message: 'OAuth 1.0a authentication failed. Please check your API keys and tokens.',
        details: { error, status: response.status }
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `OAuth 1.0a test error: ${error.message}`,
      details: null
    };
  }
}