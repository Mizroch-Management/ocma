import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PostRequestSchema = z.object({
  content: z.string().min(1).max(280),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

async function refreshTwitterToken(refreshToken: string) {
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Twitter token');
  }

  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Validate request
    const validationResult = PostRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { content, mediaUrls, scheduledFor } = validationResult.data;

    // Get Twitter connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .single();

    if (connError || !connection) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (new Date(connection.expires_at) < new Date()) {
      const newTokens = await refreshTwitterToken(connection.refresh_token);
      accessToken = newTokens.access_token;
      
      // Update stored tokens
      await supabase.from('social_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
    }

    // Handle scheduling
    if (scheduledFor) {
      // Store in scheduled posts table
      const { data: scheduledPost, error: schedError } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          platform: 'twitter',
          content,
          media_urls: mediaUrls,
          scheduled_for: scheduledFor,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (schedError) {
        throw new Error('Failed to schedule post');
      }

      return res.status(200).json({
        success: true,
        scheduled: true,
        postId: scheduledPost.id,
        scheduledFor,
      });
    }

    // Post immediately
    const tweetData: { text: string; media?: { media_ids: string[] } } = { text: content };
    
    // Add media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      // Note: Media upload requires additional implementation
      tweetData.media = { media_ids: [] };
    }

    const postResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    if (!postResponse.ok) {
      const error = await postResponse.text();
      throw new Error(`Failed to post tweet: ${error}`);
    }

    const tweet = await postResponse.json();

    // Log the post
    await supabase.from('posted_content').insert({
      user_id: user.id,
      platform: 'twitter',
      platform_post_id: tweet.data.id,
      content,
      media_urls: mediaUrls,
      posted_at: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      postId: tweet.data.id,
      url: `https://twitter.com/${connection.platform_username}/status/${tweet.data.id}`,
    });
  } catch (error) {
    console.error('Twitter posting error:', error);
    res.status(500).json({ 
      error: 'Failed to post to Twitter',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}