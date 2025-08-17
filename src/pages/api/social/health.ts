// src/pages/api/social/health.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { testPostability, SocialAccount } from '@/lib/social/clients';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function buildEnvAccounts(): SocialAccount[] {
  const list: SocialAccount[] = [];
  
  if (process.env.X_BEARER_TOKEN) {
    list.push({ id: 'env-twitter', platform: 'twitter', access_token: process.env.X_BEARER_TOKEN, metadata: {} });
  }
  
  if (process.env.LINKEDIN_ACCESS_TOKEN && (process.env.LINKEDIN_AUTHOR_URN || process.env.LINKEDIN_ORG_URN)) {
    list.push({
      id: 'env-linkedin',
      platform: 'linkedin',
      access_token: process.env.LINKEDIN_ACCESS_TOKEN,
      metadata: { 
        author_urn: process.env.LINKEDIN_AUTHOR_URN, 
        organization_urn: process.env.LINKEDIN_ORG_URN 
      }
    });
  }
  
  if (process.env.FB_PAGE_TOKEN && process.env.FB_PAGE_ID) {
    list.push({
      id: 'env-fb',
      platform: 'facebook',
      access_token: process.env.FB_PAGE_TOKEN,
      metadata: { page_id: process.env.FB_PAGE_ID }
    });
  }
  
  if (process.env.IG_TOKEN && process.env.IG_USER_ID) {
    list.push({
      id: 'env-ig',
      platform: 'instagram',
      access_token: process.env.IG_TOKEN,
      metadata: { ig_user_id: process.env.IG_USER_ID }
    });
  }
  
  return list;
}

async function loadAccountsFromDB(): Promise<SocialAccount[]> {
  const { data, error } = await supabaseAdmin
    .from('social_accounts')
    .select('id, platform, access_token, refresh_token, expires_at, metadata');

  if (error) throw error;
  return (data || []) as SocialAccount[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const live = req.query.live === '1';
    const mode = (process.env.SOCIAL_TEST_MODE || 'env').toLowerCase(); // 'env' or 'db'

    const accounts = mode === 'db' ? await loadAccountsFromDB() : buildEnvAccounts();
    
    if (!accounts.length) {
      res.status(400).json({ ok: false, mode, error: 'No accounts found (check env vars or DB table).' });
      return;
    }

    const results = await Promise.all(accounts.map(a => testPostability(a, live)));
    const ok = results.every(r => r.ok);

    res.status(ok ? 200 : 207).json({ ok, mode, live, count: results.length, results });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
}
