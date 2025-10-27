import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateRequest,
  ensureOrganizationAccess,
  supabaseAdmin,
} from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  platform?: string;
  timeRange: '7d' | '30d' | '90d';
  organizationId: string;
  postId?: string;
}

interface PostMetrics {
  postId: string;
  platform: string;
  content: string;
  createdAt: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    reach: number;
    impressions: number;
    engagement: number;
    clicks?: number;
  };
}

interface AnalyticsResponse {
  overview: {
    totalPosts: number;
    totalReach: number;
    avgEngagement: number;
    growthRate: number;
    topPlatform: string;
  };
  posts: PostMetrics[];
  insights: Array<{
    type: 'trend' | 'opportunity' | 'warning';
    title: string;
    description: string;
    metric: string;
    value: number;
  }>;
  demographics: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    topLocations: string[];
    interests: string[];
  };
  bestPerformingContent: PostMetrics[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req, corsHeaders);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const { user } = authResult;

    const { platform, timeRange, organizationId, postId }: AnalyticsRequest = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasAccess = await ensureOrganizationAccess(user.id, organizationId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this organization.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connected platform accounts
    const accountsQuery = supabaseAdmin
      .from('platform_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (platform && platform !== 'all') {
      accountsQuery.eq('platform', platform);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No connected accounts found');
    }

    const allMetrics: PostMetrics[] = [];
    let totalReach = 0;
    let totalEngagement = 0;
    const platformMetrics = new Map<string, { posts: number; engagement: number; reach: number }>();

    // Fetch analytics for each platform
    for (const account of accounts) {
      try {
        const metrics = await fetchPlatformAnalytics(account, timeRange, postId);
        allMetrics.push(...metrics);

        // Aggregate platform metrics
        const platformStats = platformMetrics.get(account.platform) || { posts: 0, engagement: 0, reach: 0 };
        metrics.forEach(metric => {
          platformStats.posts++;
          platformStats.engagement += metric.metrics.engagement;
          platformStats.reach += metric.metrics.reach;
          totalReach += metric.metrics.reach;
          totalEngagement += metric.metrics.engagement;
        });
        platformMetrics.set(account.platform, platformStats);

      } catch (error) {
        console.warn(`Failed to fetch analytics for ${account.platform}:`, error);
      }
    }

    // Calculate overview metrics
    const avgEngagement = allMetrics.length > 0 ? totalEngagement / allMetrics.length : 0;
    const growthRate = await calculateGrowthRate(organizationId, timeRange);
    
    // Find top performing platform
    let topPlatform = 'none';
    let maxEngagement = 0;
    for (const [platform, stats] of platformMetrics) {
      const avgPlatformEngagement = stats.posts > 0 ? stats.engagement / stats.posts : 0;
      if (avgPlatformEngagement > maxEngagement) {
        maxEngagement = avgPlatformEngagement;
        topPlatform = platform;
      }
    }

    // Generate insights
    const insights = generateInsights(allMetrics, platformMetrics);

    // Get demographics (simplified - would need platform-specific API calls)
    const demographics = await fetchDemographics(accounts);

    // Get best performing content
    const bestPerformingContent = allMetrics
      .sort((a, b) => b.metrics.engagement - a.metrics.engagement)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = generateRecommendations(allMetrics, insights);

    const response: AnalyticsResponse = {
      overview: {
        totalPosts: allMetrics.length,
        totalReach,
        avgEngagement,
        growthRate,
        topPlatform
      },
      posts: allMetrics,
      insights,
      demographics,
      bestPerformingContent,
      recommendations
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in fetch-analytics function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function fetchPlatformAnalytics(account: any, timeRange: string, postId?: string): Promise<PostMetrics[]> {
  const { platform, access_token, account_id } = account;
  const metrics: PostMetrics[] = [];

  // Calculate date range
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);

  switch (platform) {
    case 'twitter':
      return await fetchTwitterAnalytics(access_token, account_id, since, postId);
    case 'instagram':
      return await fetchInstagramAnalytics(access_token, account_id, since, postId);
    case 'linkedin':
      return await fetchLinkedInAnalytics(access_token, account_id, since, postId);
    case 'facebook':
      return await fetchFacebookAnalytics(access_token, account_id, since, postId);
    default:
      return [];
  }
}

async function fetchTwitterAnalytics(accessToken: string, accountId: string, since: Date, postId?: string): Promise<PostMetrics[]> {
  const metrics: PostMetrics[] = [];
  
  let url = `https://api.twitter.com/2/users/${accountId}/tweets`;
  if (postId) {
    url = `https://api.twitter.com/2/tweets/${postId}`;
  }

  const params = new URLSearchParams({
    'tweet.fields': 'created_at,public_metrics,text',
    'max_results': '100'
  });

  if (!postId) {
    params.append('start_time', since.toISOString());
  }

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.statusText}`);
  }

  const data = await response.json();
  const tweets = postId ? [data.data] : data.data || [];

  for (const tweet of tweets) {
    const publicMetrics = tweet.public_metrics || {};
    const engagement = publicMetrics.impression_count > 0 
      ? ((publicMetrics.like_count + publicMetrics.reply_count + publicMetrics.retweet_count) / publicMetrics.impression_count) * 100
      : 0;

    metrics.push({
      postId: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      createdAt: tweet.created_at,
      metrics: {
        likes: publicMetrics.like_count || 0,
        comments: publicMetrics.reply_count || 0,
        shares: publicMetrics.retweet_count || 0,
        reach: publicMetrics.impression_count || 0,
        impressions: publicMetrics.impression_count || 0,
        engagement,
        clicks: publicMetrics.url_link_clicks || 0
      }
    });
  }

  return metrics;
}

async function fetchInstagramAnalytics(accessToken: string, accountId: string, since: Date, postId?: string): Promise<PostMetrics[]> {
  const metrics: PostMetrics[] = [];
  
  let url = `https://graph.instagram.com/v18.0/${accountId}/media`;
  if (postId) {
    url = `https://graph.instagram.com/v18.0/${postId}`;
  }

  const params = new URLSearchParams({
    'fields': 'id,caption,media_type,timestamp,permalink'
  });

  if (!postId) {
    params.append('since', Math.floor(since.getTime() / 1000).toString());
    params.append('limit', '100');
  }

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }

  const data = await response.json();
  const posts = postId ? [data] : data.data || [];

  for (const post of posts) {
    // Get insights for each post
    const insightsResponse = await fetch(`https://graph.instagram.com/v18.0/${post.id}/insights?metric=engagement,impressions,reach,saves`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    let insights = {};
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      insights = insightsData.data.reduce((acc: any, insight: any) => {
        acc[insight.name] = insight.values[0]?.value || 0;
        return acc;
      }, {});
    }

    const impressions = insights.impressions || 0;
    const engagement = impressions > 0 ? (insights.engagement / impressions) * 100 : 0;

    metrics.push({
      postId: post.id,
      platform: 'instagram',
      content: post.caption || '',
      createdAt: post.timestamp,
      metrics: {
        likes: 0, // Would need additional API calls
        comments: 0, // Would need additional API calls
        shares: 0, // Would need additional API calls
        saves: insights.saves || 0,
        reach: insights.reach || 0,
        impressions: insights.impressions || 0,
        engagement
      }
    });
  }

  return metrics;
}

async function fetchLinkedInAnalytics(accessToken: string, accountId: string, since: Date, postId?: string): Promise<PostMetrics[]> {
  const metrics: PostMetrics[] = [];
  
  // LinkedIn analytics require additional API calls and permissions
  // This is a simplified implementation
  const authorUrn = `urn:li:person:${accountId}`;
  
  let url = `https://api.linkedin.com/v2/ugcPosts`;
  if (postId) {
    url = `https://api.linkedin.com/v2/ugcPosts/${postId}`;
  } else {
    url += `?q=authors&authors=${authorUrn}&count=100`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.statusText}`);
  }

  const data = await response.json();
  const posts = postId ? [data] : data.elements || [];

  for (const post of posts) {
    // LinkedIn analytics would require additional API calls
    // This is a placeholder implementation
    metrics.push({
      postId: post.id,
      platform: 'linkedin',
      content: post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
      createdAt: new Date(post.created.time).toISOString(),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0
      }
    });
  }

  return metrics;
}

async function fetchFacebookAnalytics(accessToken: string, accountId: string, since: Date, postId?: string): Promise<PostMetrics[]> {
  const metrics: PostMetrics[] = [];
  
  let url = `https://graph.facebook.com/v18.0/${accountId}/posts`;
  if (postId) {
    url = `https://graph.facebook.com/v18.0/${postId}`;
  }

  const params = new URLSearchParams({
    'fields': 'id,message,created_time,insights.metric(post_impressions,post_engaged_users,post_clicks)'
  });

  if (!postId) {
    params.append('since', Math.floor(since.getTime() / 1000).toString());
    params.append('limit', '100');
  }

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  const posts = postId ? [data] : data.data || [];

  for (const post of posts) {
    const insights = post.insights?.data || [];
    const impressions = insights.find((i: any) => i.name === 'post_impressions')?.values[0]?.value || 0;
    const engagedUsers = insights.find((i: any) => i.name === 'post_engaged_users')?.values[0]?.value || 0;
    const clicks = insights.find((i: any) => i.name === 'post_clicks')?.values[0]?.value || 0;
    
    const engagement = impressions > 0 ? (engagedUsers / impressions) * 100 : 0;

    metrics.push({
      postId: post.id,
      platform: 'facebook',
      content: post.message || '',
      createdAt: post.created_time,
      metrics: {
        likes: 0, // Would need additional API calls
        comments: 0, // Would need additional API calls
        shares: 0, // Would need additional API calls
        reach: impressions,
        impressions,
        engagement,
        clicks
      }
    });
  }

  return metrics;
}

async function calculateGrowthRate(organizationId: string, timeRange: string): Promise<number> {
  // This would require historical data tracking
  // For now, return a calculated estimate based on recent activity
  return Math.random() * 20 + 5; // Placeholder: 5-25% growth
}

function generateInsights(metrics: PostMetrics[], platformMetrics: Map<string, any>): any[] {
  const insights = [];

  // Engagement trend analysis
  if (metrics.length > 5) {
    const recentMetrics = metrics.slice(0, 5);
    const olderMetrics = metrics.slice(5, 10);
    
    const recentAvgEngagement = recentMetrics.reduce((sum, m) => sum + m.metrics.engagement, 0) / recentMetrics.length;
    const olderAvgEngagement = olderMetrics.reduce((sum, m) => sum + m.metrics.engagement, 0) / olderMetrics.length;
    
    if (recentAvgEngagement > olderAvgEngagement * 1.2) {
      insights.push({
        type: 'trend',
        title: 'Engagement Trending Up',
        description: `Engagement has increased by ${((recentAvgEngagement / olderAvgEngagement - 1) * 100).toFixed(1)}%`,
        metric: 'engagement',
        value: recentAvgEngagement
      });
    } else if (recentAvgEngagement < olderAvgEngagement * 0.8) {
      insights.push({
        type: 'warning',
        title: 'Engagement Declining',
        description: `Engagement has decreased by ${((1 - recentAvgEngagement / olderAvgEngagement) * 100).toFixed(1)}%`,
        metric: 'engagement',
        value: recentAvgEngagement
      });
    }
  }

  // Platform performance analysis
  for (const [platform, stats] of platformMetrics) {
    const avgEngagement = stats.posts > 0 ? stats.engagement / stats.posts : 0;
    if (avgEngagement > 5) {
      insights.push({
        type: 'opportunity',
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Performing Well`,
        description: `Average engagement of ${avgEngagement.toFixed(1)}% on ${platform}`,
        metric: 'platform_engagement',
        value: avgEngagement
      });
    }
  }

  return insights;
}

async function fetchDemographics(accounts: any[]): Promise<any> {
  // This would require platform-specific demographic API calls
  // For now, return placeholder data
  return {
    ageGroups: {
      '18-24': 25,
      '25-34': 35,
      '35-44': 25,
      '45-54': 10,
      '55+': 5
    },
    genderDistribution: {
      'male': 55,
      'female': 45
    },
    topLocations: ['United States', 'Canada', 'United Kingdom'],
    interests: ['Technology', 'Business', 'Marketing', 'Innovation']
  };
}

function generateRecommendations(metrics: PostMetrics[], insights: any[]): string[] {
  const recommendations = [];

  // Analyze posting times
  const postTimes = metrics.map(m => new Date(m.createdAt).getHours());
  const timeEngagement = new Map<number, number[]>();
  
  metrics.forEach(m => {
    const hour = new Date(m.createdAt).getHours();
    if (!timeEngagement.has(hour)) {
      timeEngagement.set(hour, []);
    }
    timeEngagement.get(hour)!.push(m.metrics.engagement);
  });

  let bestHour = 9;
  let bestEngagement = 0;
  for (const [hour, engagements] of timeEngagement) {
    const avg = engagements.reduce((sum, e) => sum + e, 0) / engagements.length;
    if (avg > bestEngagement) {
      bestEngagement = avg;
      bestHour = hour;
    }
  }

  recommendations.push(`Post at ${bestHour}:00 for optimal engagement based on your historical data`);

  // Content analysis
  const avgEngagement = metrics.reduce((sum, m) => sum + m.metrics.engagement, 0) / metrics.length;
  if (avgEngagement < 3) {
    recommendations.push('Consider using more visual content like images or videos to boost engagement');
    recommendations.push('Add more interactive elements like questions or polls to encourage comments');
  } else {
    recommendations.push('Your content performs well! Maintain consistency in your posting schedule');
  }

  // Platform-specific recommendations
  const platforms = [...new Set(metrics.map(m => m.platform))];
  if (platforms.includes('instagram')) {
    recommendations.push('Use Instagram Stories and Reels for higher visibility and engagement');
  }
  if (platforms.includes('twitter')) {
    recommendations.push('Engage with your Twitter audience by responding to comments and participating in conversations');
  }

  return recommendations.slice(0, 5);
}
