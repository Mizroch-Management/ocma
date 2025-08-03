import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './use-organization';

export interface AnalyticsData {
  totalContent: number;
  publishedContent: number;
  scheduledContent: number;
  draftContent: number;
  platformStats: Array<{
    platform: string;
    total: number;
    success: number;
    failed: number;
    successRate: number;
  }>;
  dailyStats: Array<{
    date: string;
    publications: number;
    successRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    content: number;
    success: number;
    engagement: number;
  }>;
}

export function useAnalyticsData(timeRange: string = '30days') {
  const [data, setData] = useState<AnalyticsData | null>(null);
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

  const fetchAnalyticsData = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateFilter();

      // Fetch content stats for current organization
      const { data: contentStats, error: contentError } = await supabase
        .from('generated_content')
        .select('publication_status')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', dateFilter);

      if (contentError) throw contentError;

      // Fetch publication logs for content from current organization
      const { data: publicationLogs, error: logsError } = await supabase
        .from('publication_logs')
        .select(`
          platform, status, created_at, metrics,
          generated_content!inner(organization_id)
        `)
        .eq('generated_content.organization_id', currentOrganization.id)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Calculate content stats
      const totalContent = contentStats?.length || 0;
      const publishedContent = contentStats?.filter(c => c.publication_status === 'published').length || 0;
      const scheduledContent = contentStats?.filter(c => c.publication_status === 'scheduled').length || 0;
      const draftContent = contentStats?.filter(c => c.publication_status === 'draft').length || 0;

      // Calculate platform stats
      const platformMap = new Map<string, { total: number; success: number; failed: number }>();
      
      publicationLogs?.forEach(log => {
        const platform = log.platform;
        if (!platformMap.has(platform)) {
          platformMap.set(platform, { total: 0, success: 0, failed: 0 });
        }
        const stats = platformMap.get(platform)!;
        stats.total++;
        if (log.status === 'success') stats.success++;
        if (log.status === 'failed') stats.failed++;
      });

      const platformStats = Array.from(platformMap.entries()).map(([platform, stats]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        ...stats,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0
      }));

      // Calculate daily stats
      const dailyMap = new Map<string, { publications: number; success: number }>();
      
      publicationLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { publications: 0, success: 0 });
        }
        const stats = dailyMap.get(date)!;
        stats.publications++;
        if (log.status === 'success') stats.success++;
      });

      const dailyStats = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          publications: stats.publications,
          successRate: stats.publications > 0 ? (stats.success / stats.publications) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      // Calculate monthly trends
      const monthlyMap = new Map<string, { content: number; success: number }>();
      
      publicationLogs?.forEach(log => {
        const date = new Date(log.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { content: 0, success: 0 });
        }
        const stats = monthlyMap.get(monthKey)!;
        stats.content++;
        if (log.status === 'success') stats.success++;
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([monthKey, stats]) => {
          const [year, month] = monthKey.split('-');
          const monthName = monthNames[parseInt(month) - 1];
          return {
            month: monthName,
            content: stats.content,
            success: stats.success,
            engagement: stats.success * 1.2 // Mock engagement calculation
          };
        })
        .sort((a, b) => {
          const aIndex = monthNames.indexOf(a.month);
          const bIndex = monthNames.indexOf(b.month);
          return aIndex - bIndex;
        })
        .slice(-6); // Last 6 months

      setData({
        totalContent,
        publishedContent,
        scheduledContent,
        draftContent,
        platformStats,
        dailyStats,
        monthlyTrends
      });

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchAnalyticsData();
    }
  }, [timeRange, currentOrganization]);

  return { data, loading, error, refetch: fetchAnalyticsData };
}