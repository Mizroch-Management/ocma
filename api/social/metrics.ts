import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { cache } from '@/lib/cache/redis-cache';
import { withSocialMediaRetry, withTimeout } from '@/lib/error-handling/api-error-handler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PostMetrics {
  id: string;
  platform: string;
  content: string;
  createdAt: Date;
  metrics: {
    impressions: number;
    engagement: number;
    clicks: number;
    shares: number;
    saves: number;
    comments: number;
    likes: number;
    reach: number;
  };
}

interface AggregatedMetrics {
  platform: string;
  totalPosts: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalReach: number;
  topPost: PostMetrics | null;
  recentPosts: PostMetrics[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const { platform, timeRange = '7d', limit = 20 } = req.query;
    
    // Check cache first
    const cacheKey = `metrics:${user.id}:${platform}:${timeRange}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        fetchedAt: cached.fetchedAt
      });
    }

    // Get user's connected accounts
    const accountsQuery = supabase
      .from('platform_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (platform && platform !== 'all') {
      accountsQuery.eq('platform', platform);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    if (!accounts || accounts.length === 0) {
      return res.status(404).json({ error: 'No connected accounts found' });
    }

    const allMetrics: AggregatedMetrics[] = [];

    for (const account of accounts) {
      try {
        const metrics = await withSocialMediaRetry(
          account.platform,
          () => withTimeout(
            () => fetchPlatformMetrics(account, timeRange as string, parseInt(limit as string)),
            30000, // 30 second timeout
            `Timeout fetching ${account.platform} metrics`
          ),
          { userId: user.id, accountId: account.id }
        );
        allMetrics.push(metrics);
      } catch (error) {
        console.error(`Failed to fetch metrics for ${account.platform}:`, error);
        // Continue with other platforms
      }
    }

    // Calculate overall metrics
    const overallMetrics = {
      totalPosts: allMetrics.reduce((sum, m) => sum + m.totalPosts, 0),
      totalImpressions: allMetrics.reduce((sum, m) => sum + m.totalImpressions, 0),
      totalEngagement: allMetrics.reduce((sum, m) => sum + m.totalEngagement, 0),
      totalReach: allMetrics.reduce((sum, m) => sum + m.totalReach, 0),
      avgEngagementRate: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.avgEngagementRate, 0) / allMetrics.length 
        : 0,
      platformBreakdown: allMetrics,
      topPosts: allMetrics
        .flatMap(m => m.recentPosts)
        .sort((a, b) => b.metrics.engagement - a.metrics.engagement)
        .slice(0, 5)
    };

    const response = {
      success: true,
      metrics: overallMetrics,
      timeRange,
      fetchedAt: new Date().toISOString()
    };
    
    // Cache the response for 15 minutes
    await cache.set(cacheKey, response, 900);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('Metrics fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metrics', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchPlatformMetrics(
  account: any,
  timeRange: string,
  limit: number
): Promise<AggregatedMetrics> {
  
  const cutoffDate = getCutoffDate(timeRange);
  
  switch (account.platform) {
    case 'twitter':
      return fetchTwitterMetrics(account, cutoffDate, limit);
    case 'linkedin':
      return fetchLinkedInMetrics(account, cutoffDate, limit);
    case 'facebook':
      return fetchFacebookMetrics(account, cutoffDate, limit);
    case 'instagram':
      return fetchInstagramMetrics(account, cutoffDate, limit);
    default:
      throw new Error(`Unsupported platform: ${account.platform}`);
  }
}

function getCutoffDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

async function fetchTwitterMetrics(
  account: any,
  cutoffDate: Date,
  limit: number
): Promise<AggregatedMetrics> {
  
  // Check if token is expired and refresh if needed
  if (account.token_expiry && new Date() > new Date(account.token_expiry)) {
    await refreshTwitterToken(account);
  }

  // Fetch user's tweets
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${account.account_id}/tweets?` +
    `tweet.fields=created_at,public_metrics,organic_metrics&` +
    `max_results=${Math.min(limit, 100)}`,
    {
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      }
    }
  );

  if (!tweetsResponse.ok) {
    throw new Error(`Twitter API error: ${tweetsResponse.statusText}`);
  }

  const tweetsData = await tweetsResponse.json();
  const tweets = tweetsData.data || [];

  // Filter by date and convert to our format
  const recentPosts: PostMetrics[] = tweets
    .filter((tweet: any) => new Date(tweet.created_at) >= cutoffDate)
    .map((tweet: any) => ({
      id: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      createdAt: new Date(tweet.created_at),
      metrics: {
        impressions: tweet.public_metrics?.impression_count || 0,
        engagement: calculateEngagementRate(tweet.public_metrics),
        clicks: tweet.organic_metrics?.url_link_clicks || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        saves: tweet.public_metrics?.bookmark_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        likes: tweet.public_metrics?.like_count || 0,
        reach: tweet.public_metrics?.impression_count || 0
      }
    }));

  // Calculate aggregated metrics
  const totalPosts = recentPosts.length;
  const totalImpressions = recentPosts.reduce((sum, post) => sum + post.metrics.impressions, 0);
  const totalEngagement = recentPosts.reduce((sum, post) => sum + (post.metrics.likes + post.metrics.comments + post.metrics.shares), 0);
  const avgEngagementRate = totalPosts > 0 
    ? recentPosts.reduce((sum, post) => sum + post.metrics.engagement, 0) / totalPosts 
    : 0;

  return {
    platform: 'twitter',
    totalPosts,
    totalImpressions,
    totalEngagement,
    avgEngagementRate,
    totalReach: totalImpressions,
    topPost: recentPosts.sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0] || null,
    recentPosts
  };
}

async function fetchLinkedInMetrics(
  account: any,
  cutoffDate: Date,
  limit: number
): Promise<AggregatedMetrics> {
  
  // Fetch posts (shares)
  const postsResponse = await fetch(
    `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:${account.account_id}&count=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      }
    }
  );

  if (!postsResponse.ok) {
    throw new Error(`LinkedIn API error: ${postsResponse.statusText}`);
  }

  const postsData = await postsResponse.json();
  const posts = postsData.elements || [];

  const recentPosts: PostMetrics[] = [];

  for (const post of posts) {
    const createdAt = new Date(post.created.time);
    if (createdAt < cutoffDate) continue;

    // Fetch analytics for each post
    try {
      const analyticsResponse = await fetch(
        `https://api.linkedin.com/v2/socialActions/${post.id}/likes`,
        {
          headers: {
            'Authorization': `Bearer ${account.access_token}`
          }
        }
      );

      let likes = 0;
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        likes = analyticsData.paging?.total || 0;
      }

      recentPosts.push({
        id: post.id,
        platform: 'linkedin',
        content: post.text?.text || '',
        createdAt,
        metrics: {
          impressions: 0, // LinkedIn doesn't provide this in basic API
          engagement: calculateLinkedInEngagement(likes),
          clicks: 0,
          shares: 0,
          saves: 0,
          comments: 0,
          likes,
          reach: 0
        }
      });
    } catch (error) {
      console.error('Error fetching LinkedIn post analytics:', error);
    }
  }

  const totalPosts = recentPosts.length;
  const totalEngagement = recentPosts.reduce((sum, post) => sum + post.metrics.likes, 0);
  const avgEngagementRate = totalPosts > 0 
    ? recentPosts.reduce((sum, post) => sum + post.metrics.engagement, 0) / totalPosts 
    : 0;

  return {
    platform: 'linkedin',
    totalPosts,
    totalImpressions: 0,
    totalEngagement,
    avgEngagementRate,
    totalReach: 0,
    topPost: recentPosts.sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0] || null,
    recentPosts
  };
}

async function fetchFacebookMetrics(
  account: any,
  cutoffDate: Date,
  limit: number
): Promise<AggregatedMetrics> {
  
  // Fetch page posts
  const postsResponse = await fetch(
    `https://graph.facebook.com/v18.0/${account.account_id}/posts?` +
    `fields=id,message,created_time,insights.metric(post_impressions,post_engaged_users,post_clicks)&` +
    `limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      }
    }
  );

  if (!postsResponse.ok) {
    throw new Error(`Facebook API error: ${postsResponse.statusText}`);
  }

  const postsData = await postsResponse.json();
  const posts = postsData.data || [];

  const recentPosts: PostMetrics[] = posts
    .filter((post: any) => new Date(post.created_time) >= cutoffDate)
    .map((post: any) => {
      const insights = post.insights?.data || [];
      const impressions = insights.find((i: any) => i.name === 'post_impressions')?.values[0]?.value || 0;
      const engagedUsers = insights.find((i: any) => i.name === 'post_engaged_users')?.values[0]?.value || 0;
      const clicks = insights.find((i: any) => i.name === 'post_clicks')?.values[0]?.value || 0;

      return {
        id: post.id,
        platform: 'facebook',
        content: post.message || '',
        createdAt: new Date(post.created_time),
        metrics: {
          impressions,
          engagement: impressions > 0 ? (engagedUsers / impressions) * 100 : 0,
          clicks,
          shares: 0,
          saves: 0,
          comments: 0,
          likes: 0,
          reach: impressions
        }
      };
    });

  const totalPosts = recentPosts.length;
  const totalImpressions = recentPosts.reduce((sum, post) => sum + post.metrics.impressions, 0);
  const totalEngagement = recentPosts.reduce((sum, post) => sum + post.metrics.clicks, 0);
  const avgEngagementRate = totalPosts > 0 
    ? recentPosts.reduce((sum, post) => sum + post.metrics.engagement, 0) / totalPosts 
    : 0;

  return {
    platform: 'facebook',
    totalPosts,
    totalImpressions,
    totalEngagement,
    avgEngagementRate,
    totalReach: totalImpressions,
    topPost: recentPosts.sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0] || null,
    recentPosts
  };
}

async function fetchInstagramMetrics(
  account: any,
  cutoffDate: Date,
  limit: number
): Promise<AggregatedMetrics> {
  
  // Fetch media
  const mediaResponse = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,timestamp,media_type,insights.metric(impressions,engagement,reach)&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      }
    }
  );

  if (!mediaResponse.ok) {
    throw new Error(`Instagram API error: ${mediaResponse.statusText}`);
  }

  const mediaData = await mediaResponse.json();
  const mediaItems = mediaData.data || [];

  const recentPosts: PostMetrics[] = mediaItems
    .filter((item: any) => new Date(item.timestamp) >= cutoffDate)
    .map((item: any) => {
      const insights = item.insights?.data || [];
      const impressions = insights.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0;
      const engagement = insights.find((i: any) => i.name === 'engagement')?.values[0]?.value || 0;
      const reach = insights.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;

      return {
        id: item.id,
        platform: 'instagram',
        content: item.caption || '',
        createdAt: new Date(item.timestamp),
        metrics: {
          impressions,
          engagement: impressions > 0 ? (engagement / impressions) * 100 : 0,
          clicks: 0,
          shares: 0,
          saves: 0,
          comments: 0,
          likes: engagement,
          reach
        }
      };
    });

  const totalPosts = recentPosts.length;
  const totalImpressions = recentPosts.reduce((sum, post) => sum + post.metrics.impressions, 0);
  const totalEngagement = recentPosts.reduce((sum, post) => sum + post.metrics.likes, 0);
  const avgEngagementRate = totalPosts > 0 
    ? recentPosts.reduce((sum, post) => sum + post.metrics.engagement, 0) / totalPosts 
    : 0;

  return {
    platform: 'instagram',
    totalPosts,
    totalImpressions,
    totalEngagement,
    avgEngagementRate,
    totalReach: recentPosts.reduce((sum, post) => sum + post.metrics.reach, 0),
    topPost: recentPosts.sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0] || null,
    recentPosts
  };
}

async function refreshTwitterToken(account: any): Promise<void> {
  if (!account.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
      client_id: process.env.TWITTER_CLIENT_ID!
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Twitter token');
  }

  const data = await response.json();

  // Update token in database
  await supabase
    .from('platform_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expiry: new Date(Date.now() + data.expires_in * 1000)
    })
    .eq('id', account.id);

  account.access_token = data.access_token;
  account.refresh_token = data.refresh_token;
}

function calculateEngagementRate(metrics: any): number {
  if (!metrics || !metrics.impression_count) return 0;
  
  const engagements = (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
  return (engagements / metrics.impression_count) * 100;
}

function calculateLinkedInEngagement(likes: number): number {
  // Simple engagement calculation - in production, you'd want more sophisticated metrics
  return likes * 0.1; // Rough estimate
}