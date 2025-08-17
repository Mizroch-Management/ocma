import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostRequest {
  content: string;
  platforms: string[];
  media?: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
  scheduledTime?: string;
  organizationId: string;
}

interface PlatformAccount {
  id: string;
  platform: string;
  account_id: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, platforms, media, scheduledTime, organizationId }: PostRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connected platform accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('platform', platforms);

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No connected accounts found for the specified platforms');
    }

    const results = [];

    // Post to each platform
    for (const account of accounts) {
      try {
        const result = await postToPlatform(account, content, media);
        results.push({
          platform: account.platform,
          success: true,
          postId: result.postId,
          url: result.url
        });

        // Store post record in database
        await supabase.from('social_posts').insert({
          platform: account.platform,
          platform_post_id: result.postId,
          content,
          media_urls: media?.map(m => m.url) || [],
          account_id: account.id,
          organization_id: organizationId,
          posted_at: new Date().toISOString(),
          status: 'published'
        });

      } catch (error) {
        console.error(`Failed to post to ${account.platform}:`, error);
        results.push({
          platform: account.platform,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in social-post function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function postToPlatform(account: PlatformAccount, content: string, media?: Array<{ url: string; type: string }>) {
  const { platform, access_token, refresh_token } = account;

  switch (platform) {
    case 'twitter':
      return await postToTwitter(access_token, refresh_token, content, media);
    case 'instagram':
      return await postToInstagram(access_token, account.account_id, content, media);
    case 'linkedin':
      return await postToLinkedIn(access_token, account.account_id, content, media);
    case 'facebook':
      return await postToFacebook(access_token, account.account_id, content, media);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function postToTwitter(accessToken: string, refreshToken: string | undefined, content: string, media?: Array<{ url: string; type: string }>) {
  const tweetData: any = { text: content };

  // Upload media if provided
  if (media && media.length > 0) {
    const mediaIds = [];
    for (const item of media.slice(0, 4)) { // Twitter allows max 4 media items
      const mediaId = await uploadTwitterMedia(accessToken, item.url);
      mediaIds.push(mediaId);
    }
    if (mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds };
    }
  }

  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetData)
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      const newToken = await refreshTwitterToken(refreshToken);
      if (newToken) {
        // Retry with new token
        return await postToTwitter(newToken, refreshToken, content, media);
      }
    }
    throw new Error(`Twitter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    postId: data.data.id,
    url: `https://twitter.com/user/status/${data.data.id}`
  };
}

async function uploadTwitterMedia(accessToken: string, mediaUrl: string): Promise<string> {
  // Download media first
  const mediaResponse = await fetch(mediaUrl);
  const mediaBuffer = await mediaResponse.arrayBuffer();
  
  // Upload to Twitter
  const formData = new FormData();
  formData.append('media', new Blob([mediaBuffer]));

  const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData
  });

  if (!uploadResponse.ok) {
    throw new Error(`Twitter media upload failed: ${uploadResponse.statusText}`);
  }

  const uploadData = await uploadResponse.json();
  return uploadData.media_id_string;
}

async function postToInstagram(accessToken: string, accountId: string, content: string, media?: Array<{ url: string; type: string }>) {
  if (!media || media.length === 0) {
    throw new Error('Instagram requires media for posts');
  }

  const mediaItem = media[0];
  
  // Create media container
  const containerResponse = await fetch(`https://graph.instagram.com/v18.0/${accountId}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: mediaItem.url,
      caption: content
    })
  });

  if (!containerResponse.ok) {
    throw new Error(`Instagram media container creation failed: ${containerResponse.statusText}`);
  }

  const containerData = await containerResponse.json();

  // Publish media
  const publishResponse = await fetch(`https://graph.instagram.com/v18.0/${accountId}/media_publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creation_id: containerData.id
    })
  });

  if (!publishResponse.ok) {
    throw new Error(`Instagram publish failed: ${publishResponse.statusText}`);
  }

  const publishData = await publishResponse.json();
  return {
    postId: publishData.id,
    url: `https://instagram.com/p/${publishData.id}`
  };
}

async function postToLinkedIn(accessToken: string, accountId: string, content: string, media?: Array<{ url: string; type: string }>) {
  const authorUrn = `urn:li:person:${accountId}`;

  const postData: any = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: media && media.length > 0 ? 'IMAGE' : 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  // Add media if provided
  if (media && media.length > 0) {
    const mediaUrns = [];
    for (const item of media) {
      const mediaUrn = await uploadLinkedInMedia(accessToken, accountId, item.url);
      mediaUrns.push(mediaUrn);
    }
    postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map((urn: string) => ({
      status: 'READY',
      media: urn
    }));
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    postId: data.id,
    url: `https://www.linkedin.com/feed/update/${data.id}`
  };
}

async function uploadLinkedInMedia(accessToken: string, accountId: string, mediaUrl: string): Promise<string> {
  // Register upload
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: `urn:li:person:${accountId}`,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    })
  });

  if (!registerResponse.ok) {
    throw new Error(`LinkedIn media registration failed: ${registerResponse.statusText}`);
  }

  const registerData = await registerResponse.json();
  const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  
  // Download and upload media
  const mediaResponse = await fetch(mediaUrl);
  const mediaBuffer = await mediaResponse.arrayBuffer();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: mediaBuffer,
    headers: {
      'Content-Type': 'application/octet-stream',
    }
  });

  if (!uploadResponse.ok) {
    throw new Error(`LinkedIn media upload failed: ${uploadResponse.statusText}`);
  }

  return registerData.value.asset;
}

async function postToFacebook(accessToken: string, accountId: string, content: string, media?: Array<{ url: string; type: string }>) {
  const postData: any = {
    message: content
  };

  // Add media if provided
  if (media && media.length > 0) {
    // For simplicity, we'll post the first media item
    const mediaItem = media[0];
    if (mediaItem.type === 'image') {
      postData.url = mediaItem.url;
    }
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${accountId}/feed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    postId: data.id,
    url: `https://facebook.com/${data.id}`
  };
}

async function refreshTwitterToken(refreshToken: string | undefined): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: Deno.env.get('TWITTER_CLIENT_ID') || ''
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}