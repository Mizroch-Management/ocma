import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function generateCodeChallenge() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === 'GET') {
    // Initiate OAuth flow
    try {
      const { verifier, challenge } = generateCodeChallenge();
      
      // Store verifier in session
      const state = crypto.randomBytes(16).toString('hex');
      
      // Save state and verifier to database temporarily
      await supabase.from('oauth_states').insert({
        state,
        verifier,
        platform: 'twitter',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: `${process.env.VERCEL_URL}/api/connect/twitter/callback`,
        scope: 'tweet.read tweet.write users.read offline.access',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `https://twitter.com/i/oauth2/authorize?${params}`;
      res.redirect(302, authUrl);
    } catch (error) {
      console.error('Twitter OAuth initiation error:', error);
      res.status(500).json({ error: 'Failed to initiate Twitter connection' });
    }
  } else if (req.method === 'POST') {
    // Exchange code for tokens (callback handler)
    try {
      const { code, state } = req.body;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      // Retrieve verifier from database
      const { data: oauthState, error: stateError } = await supabase
        .from('oauth_states')
        .select('verifier')
        .eq('state', state)
        .eq('platform', 'twitter')
        .single();

      if (stateError || !oauthState) {
        return res.status(400).json({ error: 'Invalid state' });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.VERCEL_URL}/api/connect/twitter/callback`,
          code_verifier: oauthState.verifier,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      const userData = await userResponse.json();

      // Store tokens securely
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token!);

      await supabase.from('social_connections').upsert({
        user_id: user!.id,
        platform: 'twitter',
        platform_user_id: userData.data.id,
        platform_username: userData.data.username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope,
        updated_at: new Date().toISOString(),
      });

      // Clean up oauth state
      await supabase.from('oauth_states').delete().eq('state', state);

      res.status(200).json({
        success: true,
        username: userData.data.username,
        message: 'Twitter account connected successfully',
      });
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      res.status(500).json({ 
        error: 'Failed to connect Twitter account',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}