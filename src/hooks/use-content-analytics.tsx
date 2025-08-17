import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export interface ContentAnalyticsData {
  topPerformingContent: Array<{
    id: string;
    title: string;
    platform: string;
    engagement: number;
    views: number;
    likes: number;
    shares: number;
    created_at: string;
  }>;
  contentByType: Array<{
    type: string;
    count: number;
    averageEngagement: number;
  }>;
  engagementTrends: Array<{
    date: string;
    engagement: number;
    reach: number;
  }>;
}

export function useContentAnalytics(timeRange: string = '30days') {
  const [data, setData] = useState<ContentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '3months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '6months':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
      case '1year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const fetchContentAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateFilter();

      // Fetch published content with platform logs
      const { data: contentData, error: contentError } = await supabase
        .from('generated_content')
        .select(`
          id,
          title,
          content_type,
          created_at,
          platforms,
          publication_logs!inner(
            platform,
            metrics,
            created_at
          )
        `)
        .eq('publication_status', 'published')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (contentError) throw contentError;

      // Process top performing content
      const topPerformingContent = contentData
        ?.map(content => {
          const totalEngagement = content.publication_logs.reduce((sum, log) => {
            const metrics = log.metrics as Record<string, unknown>;
            const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
            const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
            const comments = typeof metrics?.comments === 'number' ? metrics.comments : 0;
            return sum + likes + shares + comments;
          }, 0);

          const totalViews = content.publication_logs.reduce((sum, log) => {
            const metrics = log.metrics as Record<string, unknown>;
            const views = typeof metrics?.views === 'number' ? metrics.views : 0;
            return sum + views;
          }, 0);

          const platform = content.publication_logs[0]?.platform || 'Unknown';
          
          return {
            id: content.id,
            title: content.title,
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            engagement: totalEngagement,
            views: totalViews,
            likes: content.publication_logs.reduce((sum, log) => {
              const metrics = log.metrics as Record<string, unknown>;
              const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
              return sum + likes;
            }, 0),
            shares: content.publication_logs.reduce((sum, log) => {
              const metrics = log.metrics as Record<string, unknown>;
              const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
              return sum + shares;
            }, 0),
            created_at: content.created_at
          };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10) || [];

      // Process content by type
      const contentTypeMap = new Map<string, { count: number; totalEngagement: number }>();
      
      contentData?.forEach(content => {
        const type = content.content_type;
        const engagement = content.publication_logs.reduce((sum, log) => {
          const metrics = log.metrics as Record<string, unknown>;
          const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
          const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
          const comments = typeof metrics?.comments === 'number' ? metrics.comments : 0;
          return sum + likes + shares + comments;
        }, 0);

        if (!contentTypeMap.has(type)) {
          contentTypeMap.set(type, { count: 0, totalEngagement: 0 });
        }
        
        const stats = contentTypeMap.get(type)!;
        stats.count++;
        stats.totalEngagement += engagement;
      });

      const contentByType = Array.from(contentTypeMap.entries()).map(([type, stats]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: stats.count,
        averageEngagement: stats.count > 0 ? Math.round(stats.totalEngagement / stats.count) : 0
      }));

      // Generate engagement trends (last 30 days)
      const engagementTrends = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayEngagement = contentData
          ?.filter(content => content.created_at.startsWith(dateStr))
          .reduce((sum, content) => {
            return sum + content.publication_logs.reduce((logSum, log) => {
              const metrics = log.metrics as Record<string, unknown>;
              const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
              const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
              const comments = typeof metrics?.comments === 'number' ? metrics.comments : 0;
              return logSum + likes + shares + comments;
            }, 0);
          }, 0) || 0;

        const dayReach = contentData
          ?.filter(content => content.created_at.startsWith(dateStr))
          .reduce((sum, content) => {
            return sum + content.publication_logs.reduce((logSum, log) => {
              const metrics = log.metrics as Record<string, unknown>;
              const views = typeof metrics?.views === 'number' ? metrics.views : 0;
              return logSum + views;
            }, 0);
          }, 0) || 0;

        engagementTrends.push({
          date: dateStr,
          engagement: dayEngagement,
          reach: dayReach
        });
      }

      setData({
        topPerformingContent,
        contentByType,
        engagementTrends
      });

    } catch (err) {
      log.error('Error fetching content analytics', err instanceof Error ? err : new Error(String(err)), { timeRange }, { component: 'useContentAnalytics', action: 'fetch_content_analytics' });
      setError(err instanceof Error ? err.message : 'Failed to fetch content analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchContentAnalytics();
  }, [fetchContentAnalytics]);

  return { data, loading, error, refetch: fetchContentAnalytics };
}