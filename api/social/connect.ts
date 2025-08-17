import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

interface PlatformAccount {
  id: string;
  name: string;
  username: string;
  profileImage?: string;
  followerCount?: number;
  followingCount?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform, authCode, codeVerifier, redirectUri } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract user from JWT token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    if (!platform || !authCode) {
      return res.status(400).json({ error: 'Missing platform or authCode' });
    }

    // Exchange authorization code for access token
    const tokens = await exchangeAuthCodeForTokens(platform, authCode, codeVerifier, redirectUri);
    
    // Get account information
    const accountInfo = await getAccountInfo(platform, tokens.accessToken);
    
    // Store account in database
    const { data: savedAccount, error: saveError } = await supabase
      .from('platform_accounts')
      .upsert({
        platform,
        account_id: accountInfo.id,
        account_name: accountInfo.name,
        account_handle: accountInfo.username,
        profile_image: accountInfo.profileImage,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expiry: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        token_type: tokens.tokenType,
        scope: tokens.scope,
        is_active: true,
        user_id: user.id,
        metrics: {
          followers: accountInfo.followerCount || 0,
          following: accountInfo.followingCount || 0,
          posts: 0,
          engagement: 0
        },
        connected_at: new Date().toISOString()
      }, {
        onConflict: 'platform,account_id,user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving account:', saveError);
      return res.status(500).json({ error: 'Failed to save account' });
    }

    res.status(200).json({
      success: true,
      account: savedAccount,
      message: `Successfully connected ${platform} account`
    });

  } catch (error) {
    console.error('OAuth connection error:', error);
    res.status(500).json({ 
      error: 'OAuth connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function exchangeAuthCodeForTokens(
  platform: string,
  authCode: string,
  codeVerifier?: string,
  redirectUri?: string
): Promise<OAuthTokens> {
  
  switch (platform) {
    case 'twitter':
      return exchangeTwitterTokens(authCode, codeVerifier!, redirectUri!);
    case 'linkedin':
      return exchangeLinkedInTokens(authCode, redirectUri!);
    case 'facebook':
      return exchangeFacebookTokens(authCode, redirectUri!);
    case 'instagram':
      return exchangeInstagramTokens(authCode, redirectUri!);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function exchangeTwitterTokens(
  authCode: string,
  codeVerifier: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter OAuth error: ${error}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope
  };
}

async function exchangeLinkedInTokens(
  authCode: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn OAuth error: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: 'Bearer'
  };
}

async function exchangeFacebookTokens(
  authCode: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const clientSecret = process.env.FACEBOOK_APP_SECRET!;

  const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('client_secret', clientSecret);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('code', authCode);

  const tokenResponse = await fetch(url.toString());

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Facebook OAuth error: ${error}`);
  }

  const data = await tokenResponse.json();

  return {
    accessToken: data.access_token,
    tokenType: 'Bearer',
    expiresIn: data.expires_in
  };
}

async function exchangeInstagramTokens(
  authCode: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;

  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: authCode
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram OAuth error: ${error}`);
  }

  const data = await response.json();

  // Exchange for long-lived token
  const longLivedResponse = await fetch('https://graph.instagram.com/access_token', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const longLivedUrl = new URL('https://graph.instagram.com/access_token');
  longLivedUrl.searchParams.append('grant_type', 'ig_exchange_token');
  longLivedUrl.searchParams.append('client_secret', clientSecret);
  longLivedUrl.searchParams.append('access_token', data.access_token);

  const longLivedTokenResponse = await fetch(longLivedUrl.toString());
  const longLivedData = await longLivedTokenResponse.json();

  return {
    accessToken: longLivedData.access_token,
    tokenType: 'Bearer',
    expiresIn: longLivedData.expires_in
  };
}

async function getAccountInfo(platform: string, accessToken: string): Promise<PlatformAccount> {
  switch (platform) {
    case 'twitter':
      return getTwitterAccountInfo(accessToken);
    case 'linkedin':
      return getLinkedInAccountInfo(accessToken);
    case 'facebook':
      return getFacebookAccountInfo(accessToken);
    case 'instagram':
      return getInstagramAccountInfo(accessToken);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function getTwitterAccountInfo(accessToken: string): Promise<PlatformAccount> {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Twitter account info');
  }

  const data = await response.json();
  const user = data.data;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    profileImage: user.profile_image_url,
    followerCount: user.public_metrics?.followers_count,
    followingCount: user.public_metrics?.following_count
  };
}

async function getLinkedInAccountInfo(accessToken: string): Promise<PlatformAccount> {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn account info');
  }

  const data = await response.json();

  return {
    id: data.id,
    name: `${data.firstName.localized.en_US} ${data.lastName.localized.en_US}`,
    username: data.id // LinkedIn doesn't have usernames like Twitter
  };
}

async function getFacebookAccountInfo(accessToken: string): Promise<PlatformAccount> {
  const response = await fetch('https://graph.facebook.com/me?fields=id,name,picture', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook account info');
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    username: data.name, // Facebook doesn't have traditional usernames
    profileImage: data.picture?.data?.url
  };
}

async function getInstagramAccountInfo(accessToken: string): Promise<PlatformAccount> {
  const response = await fetch('https://graph.instagram.com/me?fields=id,username,media_count,followers_count,follows_count', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram account info');
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.username,
    username: data.username,
    followerCount: data.followers_count,
    followingCount: data.follows_count
  };
}