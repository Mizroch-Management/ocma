import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './use-organization';
import { log } from '@/utils/logger';

export interface AudienceAnalyticsData {
  audienceGrowth: Array<{
    date: string;
    followers: number;
    platformBreakdown: Record<string, number>;
  }>;
  demographics: Array<{
    age: string;
    percentage: number;
  }>;
  topLocations: Array<{
    country: string;
    percentage: number;
  }>;
  engagementMetrics: {
    totalFollowers: number;
    averageEngagementRate: number;
    monthlyGrowthRate: number;
  };
}

export function useAudienceAnalytics(timeRange: string = '30days') {
  const [data, setData] = useState<AudienceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

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

  const fetchAudienceAnalytics = useCallback(async () => {
    if (!currentOrganization) return;
    
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateFilter();

      // Fetch publication logs to analyze audience growth based on engagement
      const { data: publicationLogs, error: logsError } = await supabase
        .from('publication_logs')
        .select(`
          platform, metrics, created_at,
          generated_content!inner(organization_id)
        `)
        .eq('generated_content.organization_id', currentOrganization.id)
        .gte('created_at', dateFilter)
        .eq('status', 'success')
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      // Calculate audience growth based on publication activity
      const dailyMap = new Map<string, { followers: number; platformBreakdown: Record<string, number> }>();
      let cumulativeFollowers = 0;
      
      publicationLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        const metrics = log.metrics as Record<string, unknown>;
        
        // Simulate follower growth based on engagement
        const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
        const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
        const engagementGrowth = Math.floor(likes * 0.1 + shares * 0.2);
        cumulativeFollowers += engagementGrowth;
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { 
            followers: cumulativeFollowers, 
            platformBreakdown: {} 
          });
        }
        
        const dayData = dailyMap.get(date)!;
        dayData.followers = Math.max(dayData.followers, cumulativeFollowers);
        dayData.platformBreakdown[log.platform] = (dayData.platformBreakdown[log.platform] || 0) + engagementGrowth;
      });

      // Fill in missing days with previous values
      const audienceGrowth = [];
      const now = new Date();
      let lastFollowerCount = 0;
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = dailyMap.get(dateStr);
        if (dayData) {
          lastFollowerCount = dayData.followers;
        }
        
        audienceGrowth.push({
          date: dateStr,
          followers: lastFollowerCount,
          platformBreakdown: dayData?.platformBreakdown || {}
        });
      }

      // Simulate demographics based on typical social media patterns
      const demographics = [
        { age: "18-24", percentage: 25 },
        { age: "25-34", percentage: 40 },
        { age: "35-44", percentage: 20 },
        { age: "45-54", percentage: 10 },
        { age: "55+", percentage: 5 },
      ];

      // Simulate top locations
      const topLocations = [
        { country: "United States", percentage: 45 },
        { country: "United Kingdom", percentage: 15 },
        { country: "Canada", percentage: 12 },
        { country: "Australia", percentage: 8 },
        { country: "Germany", percentage: 6 },
        { country: "Other", percentage: 14 },
      ];

      // Calculate engagement metrics
      const totalFollowers = lastFollowerCount;
      const totalEngagement = publicationLogs?.reduce((sum, log) => {
        const metrics = log.metrics as Record<string, unknown>;
        const likes = typeof metrics?.likes === 'number' ? metrics.likes : 0;
        const shares = typeof metrics?.shares === 'number' ? metrics.shares : 0;
        const comments = typeof metrics?.comments === 'number' ? metrics.comments : 0;
        return sum + likes + shares + comments;
      }, 0) || 0;

      const totalPosts = publicationLogs?.length || 1;
      const averageEngagementRate = totalFollowers > 0 ? (totalEngagement / totalFollowers / totalPosts) * 100 : 0;

      const monthlyGrowthRate = audienceGrowth.length > 1 
        ? ((audienceGrowth[audienceGrowth.length - 1].followers - audienceGrowth[0].followers) / Math.max(audienceGrowth[0].followers, 1)) * 100
        : 0;

      setData({
        audienceGrowth,
        demographics,
        topLocations,
        engagementMetrics: {
          totalFollowers,
          averageEngagementRate: Math.round(averageEngagementRate * 100) / 100,
          monthlyGrowthRate: Math.round(monthlyGrowthRate * 100) / 100
        }
      });

    } catch (err) {
      log.error('Error fetching audience analytics', err instanceof Error ? err : new Error(String(err)), { 
        timeRange, 
        organizationId: currentOrganization?.id 
      }, { 
        component: 'useAudienceAnalytics', 
        action: 'fetch_audience_analytics' 
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch audience analytics');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, timeRange]);

  useEffect(() => {
    if (currentOrganization) {
      fetchAudienceAnalytics();
    }
  }, [fetchAudienceAnalytics, currentOrganization]);

  return { data, loading, error, refetch: fetchAudienceAnalytics };
}