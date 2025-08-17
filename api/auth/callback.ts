import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
    
    if (error) {
      console.error('Auth callback error:', error);
      return res.redirect(302, '/auth?error=' + encodeURIComponent(error.message));
    }

    // Set session cookies
    const sessionCookie = `sb-access-token=${data.session?.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;
    const refreshCookie = `sb-refresh-token=${data.session?.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
    
    res.setHeader('Set-Cookie', [sessionCookie, refreshCookie]);
    
    // Redirect to dashboard or intended destination
    const redirectTo = state ? String(state) : '/dashboard';
    res.redirect(302, redirectTo);
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    res.redirect(302, '/auth?error=callback_failed');
  }
}