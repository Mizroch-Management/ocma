// lib/social/clients.ts
type AnyJson = Record<string, any>;

export type SocialAccount = {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null; // ISO
  metadata?: AnyJson | null;  // e.g., { page_id, ig_user_id, author_urn, organization_urn }
};

function isExpired(expires_at?: string | null) {
  if (!expires_at) return false;
  const t = new Date(expires_at).getTime();
  return Number.isFinite(t) && Date.now() >= t - 60_000; // 1 min grace
}

export async function testPostability(account: SocialAccount, live = false) {
  const now = new Date().toISOString();
  const baseResult: AnyJson = {
    account_id: account.id,
    platform: account.platform,
    expired: isExpired(account.expires_at),
    missing: [] as string[],
    liveAttempted: false,
    ok: false,
    details: {}
  };

  if (!account.access_token) baseResult.missing.push('access_token');

  try {
    switch (account.platform) {
      case 'twitter': {
        // X (Twitter) — requires token with tweet.write
        if (baseResult.missing.length) break;
        if (!live) { // no clean read endpoint for write scope; return readiness only
          baseResult.ok = !baseResult.expired;
          baseResult.details.note = 'To fully verify write, run live=1.';
          break;
        }
        baseResult.liveAttempted = true;
        const postRes = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: `OCMA connector test (${now})` })
        });
        const postJson = await postRes.json();
        baseResult.details.post = postJson;
        if (postRes.ok && postJson?.data?.id) {
          baseResult.ok = true;
          // Try delete to keep timelines clean (best-effort)
          await fetch(`https://api.twitter.com/2/tweets/${postJson.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${account.access_token}` }
          }).catch(() => {});
        } else {
          baseResult.ok = false;
        }
        break;
      }

      case 'linkedin': {
        // LinkedIn Posts API — needs author_urn (person or organization)
        const version = process.env.LINKEDIN_VERSION || '202405';
        const author = account.metadata?.author_urn || account.metadata?.organization_urn;
        if (!author) baseResult.missing.push('metadata.author_urn or metadata.organization_urn');
        if (baseResult.missing.length) break;

        if (!live) {
          // Do a cheap GET to validate token: whoami
          const meRes = await fetch('https://api.linkedin.com/v2/me', {
            headers: { 'Authorization': `Bearer ${account.access_token}` }
          });
          baseResult.ok = meRes.ok && !baseResult.expired;
          baseResult.details.token_check = meRes.status;
          break;
        }
        baseResult.liveAttempted = true;
        const postRes = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'LinkedIn-Version': version,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            author,
            commentary: `OCMA connector test (${now})`,
            visibility: 'PUBLIC',
            distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
            lifecycleState: 'PUBLISHED',
            isReshareDisabledByAuthor: false
          })
        });
        const postJson = await postRes.json().catch(() => ({}));
        baseResult.details.post = { status: postRes.status, body: postJson };
        baseResult.ok = postRes.ok;
        // Delete is optional; LinkedIn delete endpoint varies by entity type; skipping here.
        break;
      }

      case 'facebook': {
        // Facebook Page post — needs page_id and a Page Access Token
        const pageId = account.metadata?.page_id;
        if (!pageId) baseResult.missing.push('metadata.page_id (Page ID)');
        if (baseResult.missing.length) break;

        if (!live) {
          // Cheap token debug not available server-side without app creds; return readiness
          baseResult.ok = !baseResult.expired;
          baseResult.details.note = 'To fully verify write, run live=1.';
          break;
        }
        baseResult.liveAttempted = true;
        const params = new URLSearchParams();
        params.set('message', `OCMA connector test (${now})`);

        const postRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed?access_token=${encodeURIComponent(account.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });
        const postJson = await postRes.json().catch(() => ({}));
        baseResult.details.post = { status: postRes.status, body: postJson };
        baseResult.ok = postRes.ok;

        // Try delete to keep page clean
        const postId = postJson?.id;
        if (postId) {
          await fetch(`https://graph.facebook.com/v19.0/${postId}?access_token=${encodeURIComponent(account.access_token)}`, { method: 'DELETE' })
            .catch(() => {});
        }
        break;
      }

      case 'instagram': {
        // Instagram Graph requires media. Provide a placeholder image; needs ig_user_id
        const igUserId = account.metadata?.ig_user_id;
        if (!igUserId) baseResult.missing.push('metadata.ig_user_id (IG Business/Creator user ID)');
        if (baseResult.missing.length) break;

        if (!live) {
          baseResult.ok = !baseResult.expired;
          baseResult.details.note = 'IG write requires media; run live=1 to fully verify.';
          break;
        }
        baseResult.liveAttempted = true;

        // 1) Create container
        const imgUrl = 'https://via.placeholder.com/800x450.png?text=OCMA+test';
        const cParams = new URLSearchParams();
        cParams.set('image_url', imgUrl);
        cParams.set('caption', `OCMA connector test (${now})`);
        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?access_token=${encodeURIComponent(account.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: cParams
        });
        const container = await containerRes.json().catch(() => ({}));
        baseResult.details.container = { status: containerRes.status, body: container };
        if (!containerRes.ok || !container?.id) {
          baseResult.ok = false;
          break;
        }
        // 2) Publish
        const pParams = new URLSearchParams();
        pParams.set('creation_id', container.id);
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?access_token=${encodeURIComponent(account.access_token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: pParams
        });
        const publish = await publishRes.json().catch(() => ({}));
        baseResult.details.publish = { status: publishRes.status, body: publish };
        baseResult.ok = publishRes.ok;
        // Deleting IG media immediately isn’t always reliable; skipping cleanup.
        break;
      }

      default:
        baseResult.details.note = 'Unsupported platform in tester.';
    }
  } catch (err: any) {
    baseResult.ok = false;
    baseResult.details.error = String(err?.message || err);
  }

  if (baseResult.missing.length) baseResult.ok = false;
  return baseResult;
}
