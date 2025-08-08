/**
 * Phase 8: Analytics - Advanced analytics with comprehensive reporting builder
 * Real-time analytics, custom reports, and performance insights
 */

import { Database } from '../../integrations/supabase/types';
import { createClient } from '../../integrations/supabase/client';

// Analytics types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdBy: string;
  metrics: string[];
  filters: ReportFilter[];
  groupBy: string[];
  timeRange: TimeRange;
  visualization: VisualizationType;
  autoRefresh: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
  label?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparison?: 'previous_period' | 'previous_year' | 'custom';
}

export type VisualizationType = 
  | 'line_chart' 
  | 'bar_chart' 
  | 'pie_chart' 
  | 'area_chart' 
  | 'scatter_plot' 
  | 'heatmap' 
  | 'table' 
  | 'kpi_cards';

export interface AnalyticsData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    fill?: boolean;
    tension?: number;
  }[];
  summary?: {
    total: number;
    average: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface PlatformMetrics {
  platform: string;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  engagementRate: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface ContentPerformance {
  contentId: string;
  title: string;
  platform: string;
  publishedAt: Date;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    saves: number;
    clicks: number;
    engagementRate: number;
  };
  score: number;
  tags: string[];
}

export class AdvancedAnalyticsManager {
  private supabase = createClient();

  // Real-time analytics
  async getRealTimeMetrics(organizationId: string): Promise<AnalyticsMetric[]> {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const [currentMetrics, previousMetrics] = await Promise.all([
        this.getMetricsForPeriod(organizationId, lastHour, now),
        this.getMetricsForPeriod(organizationId, previousHour, lastHour),
      ]);

      return this.calculateMetricChanges(currentMetrics, previousMetrics);
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return [];
    }
  }

  private async getMetricsForPeriod(
    organizationId: string,
    start: Date,
    end: Date
  ): Promise<Record<string, number>> {
    try {
      const { data: publications, error } = await this.supabase
        .from('publication_logs')
        .select(`
          *,
          generated_content!inner(organization_id, user_id)
        `)
        .eq('generated_content.organization_id', organizationId)
        .gte('published_at', start.toISOString())
        .lt('published_at', end.toISOString());

      if (error) throw error;

      const metrics: Record<string, number> = {
        publications: publications?.length || 0,
        impressions: 0,
        engagement: 0,
        clicks: 0,
        reach: 0,
      };

      publications?.forEach(pub => {
        const pubMetrics = pub.metrics as any || {};
        metrics.impressions += pubMetrics.impressions || 0;
        metrics.engagement += pubMetrics.engagement || 0;
        metrics.clicks += pubMetrics.clicks || 0;
        metrics.reach += pubMetrics.reach || 0;
      });

      return metrics;
    } catch (error) {
      console.error('Error getting metrics for period:', error);
      return {};
    }
  }

  private calculateMetricChanges(
    current: Record<string, number>,
    previous: Record<string, number>
  ): AnalyticsMetric[] {
    const metrics: AnalyticsMetric[] = [];

    Object.entries(current).forEach(([key, value]) => {
      const previousValue = previous[key] || 0;
      const change = previousValue === 0 ? 0 : ((value - previousValue) / previousValue) * 100;
      
      metrics.push({
        id: key,
        name: this.formatMetricName(key),
        value,
        change,
        changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
        period: 'Last Hour',
        format: this.getMetricFormat(key),
      });
    });

    return metrics;
  }

  // Report builder
  async createReport(config: Omit<ReportConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportConfig> {
    try {
      const reportId = `report_${Date.now()}`;
      const now = new Date();

      const reportConfig: ReportConfig = {
        id: reportId,
        createdAt: now,
        updatedAt: now,
        ...config,
      };

      const { error } = await this.supabase
        .from('system_settings')
        .insert({
          organization_id: config.organizationId,
          category: 'analytics_report',
          setting_key: reportId,
          setting_value: reportConfig,
          description: `Analytics report: ${config.name}`,
        });

      if (error) throw error;

      return reportConfig;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  async generateReport(reportId: string): Promise<AnalyticsData> {
    try {
      const config = await this.getReportConfig(reportId);
      if (!config) throw new Error('Report configuration not found');

      const rawData = await this.fetchReportData(config);
      return this.processReportData(rawData, config);
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async getReportConfig(reportId: string): Promise<ReportConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'analytics_report')
        .eq('setting_key', reportId)
        .single();

      if (error || !data) return null;

      return data.setting_value as ReportConfig;
    } catch (error) {
      console.error('Error getting report config:', error);
      return null;
    }
  }

  async updateReport(reportId: string, updates: Partial<ReportConfig>): Promise<ReportConfig | null> {
    try {
      const existing = await this.getReportConfig(reportId);
      if (!existing) return null;

      const updated: ReportConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { error } = await this.supabase
        .from('system_settings')
        .update({
          setting_value: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', reportId);

      if (error) throw error;

      return updated;
    } catch (error) {
      console.error('Error updating report:', error);
      return null;
    }
  }

  async deleteReport(reportId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', reportId)
        .eq('category', 'analytics_report');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }

  async getUserReports(userId: string, organizationId: string): Promise<ReportConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'analytics_report')
        .eq('organization_id', organizationId);

      if (error) throw error;

      return data
        .map(item => item.setting_value as ReportConfig)
        .filter(report => report.createdBy === userId || report.isPublic);
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  }

  // Performance analytics
  async getContentPerformance(
    organizationId: string,
    timeRange: TimeRange,
    limit: number = 50
  ): Promise<ContentPerformance[]> {
    try {
      const { data, error } = await this.supabase
        .from('generated_content')
        .select(`
          *,
          publication_logs(*)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .limit(limit);

      if (error) throw error;

      return this.processContentPerformance(data || []);
    } catch (error) {
      console.error('Error getting content performance:', error);
      return [];
    }
  }

  async getPlatformMetrics(
    organizationId: string,
    timeRange: TimeRange
  ): Promise<PlatformMetrics[]> {
    try {
      const { data, error } = await this.supabase
        .from('publication_logs')
        .select(`
          *,
          generated_content!inner(organization_id)
        `)
        .eq('generated_content.organization_id', organizationId)
        .gte('published_at', timeRange.start.toISOString())
        .lte('published_at', timeRange.end.toISOString());

      if (error) throw error;

      return this.aggregatePlatformMetrics(data || []);
    } catch (error) {
      console.error('Error getting platform metrics:', error);
      return [];
    }
  }

  // Audience analytics
  async getAudienceInsights(
    organizationId: string,
    timeRange: TimeRange
  ): Promise<Record<string, any>> {
    try {
      const [demographics, engagement, growth] = await Promise.all([
        this.getAudienceDemographics(organizationId, timeRange),
        this.getEngagementPatterns(organizationId, timeRange),
        this.getAudienceGrowth(organizationId, timeRange),
      ]);

      return {
        demographics,
        engagement,
        growth,
      };
    } catch (error) {
      console.error('Error getting audience insights:', error);
      return {};
    }
  }

  // Data processing methods
  private async fetchReportData(config: ReportConfig): Promise<any[]> {
    let query = this.supabase
      .from('publication_logs')
      .select(`
        *,
        generated_content!inner(*)
      `)
      .eq('generated_content.organization_id', config.organizationId);

    // Apply time range filter
    if (config.timeRange) {
      query = query
        .gte('published_at', config.timeRange.start.toISOString())
        .lte('published_at', config.timeRange.end.toISOString());
    }

    // Apply custom filters
    config.filters.forEach(filter => {
      query = this.applyFilter(query, filter);
    });

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  private applyFilter(query: any, filter: ReportFilter): any {
    switch (filter.operator) {
      case 'equals':
        return query.eq(filter.field, filter.value);
      case 'not_equals':
        return query.neq(filter.field, filter.value);
      case 'greater_than':
        return query.gt(filter.field, filter.value);
      case 'less_than':
        return query.lt(filter.field, filter.value);
      case 'contains':
        return query.like(filter.field, `%${filter.value}%`);
      case 'in':
        return query.in(filter.field, filter.value);
      default:
        return query;
    }
  }

  private processReportData(rawData: any[], config: ReportConfig): AnalyticsData {
    // Group data based on configuration
    const grouped = this.groupData(rawData, config.groupBy, config.timeRange.period);
    
    // Calculate metrics
    const datasets = config.metrics.map(metric => ({
      label: this.formatMetricName(metric),
      data: grouped.map(group => this.calculateMetric(group.data, metric)),
      backgroundColor: this.getMetricColor(metric),
      borderColor: this.getMetricColor(metric),
      fill: false,
      tension: 0.1,
    }));

    const labels = grouped.map(group => group.label);

    // Calculate summary statistics
    const summary = this.calculateSummary(datasets[0]?.data || []);

    return {
      labels,
      datasets,
      summary,
    };
  }

  private groupData(data: any[], groupBy: string[], period: string): any[] {
    // Implementation for grouping data by specified fields and time periods
    const groups = new Map();
    
    data.forEach(item => {
      const key = this.createGroupKey(item, groupBy, period);
      if (!groups.has(key)) {
        groups.set(key, { label: key, data: [] });
      }
      groups.get(key).data.push(item);
    });

    return Array.from(groups.values());
  }

  private createGroupKey(item: any, groupBy: string[], period: string): string {
    if (groupBy.length === 0) {
      return this.formatDateByPeriod(new Date(item.published_at), period);
    }
    
    return groupBy.map(field => item[field] || 'Unknown').join(' - ');
  }

  private formatDateByPeriod(date: Date, period: string): string {
    switch (period) {
      case 'hour':
        return date.toISOString().substring(0, 13) + ':00';
      case 'day':
        return date.toISOString().substring(0, 10);
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `Week of ${startOfWeek.toISOString().substring(0, 10)}`;
      case 'month':
        return date.toISOString().substring(0, 7);
      case 'year':
        return date.toISOString().substring(0, 4);
      default:
        return date.toISOString().substring(0, 10);
    }
  }

  private calculateMetric(data: any[], metric: string): number {
    switch (metric) {
      case 'publications':
        return data.length;
      case 'impressions':
      case 'engagement':
      case 'clicks':
      case 'reach':
        return data.reduce((sum, item) => {
          const metrics = item.metrics as any || {};
          return sum + (metrics[metric] || 0);
        }, 0);
      case 'engagement_rate':
        const totalEngagement = this.calculateMetric(data, 'engagement');
        const totalImpressions = this.calculateMetric(data, 'impressions');
        return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
      default:
        return 0;
    }
  }

  private calculateSummary(data: number[]): any {
    if (data.length === 0) return { total: 0, average: 0, growth: 0, trend: 'stable' };

    const total = data.reduce((sum, value) => sum + value, 0);
    const average = total / data.length;
    const growth = data.length > 1 ? ((data[data.length - 1] - data[0]) / data[0]) * 100 : 0;
    const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable';

    return { total, average, growth, trend };
  }

  // Helper methods
  private formatMetricName(metric: string): string {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getMetricFormat(metric: string): 'number' | 'percentage' | 'currency' | 'duration' {
    if (metric.includes('rate') || metric.includes('percentage')) return 'percentage';
    if (metric.includes('revenue') || metric.includes('cost')) return 'currency';
    if (metric.includes('duration') || metric.includes('time')) return 'duration';
    return 'number';
  }

  private getMetricColor(metric: string): string {
    const colors: Record<string, string> = {
      impressions: '#3B82F6',
      engagement: '#10B981',
      clicks: '#F59E0B',
      reach: '#8B5CF6',
      publications: '#EF4444',
    };
    return colors[metric] || '#6B7280';
  }

  private processContentPerformance(data: any[]): ContentPerformance[] {
    return data.map(item => {
      const metrics = this.aggregateContentMetrics(item.publication_logs || []);
      const score = this.calculatePerformanceScore(metrics);

      return {
        contentId: item.id,
        title: item.title,
        platform: item.platforms?.[0] || 'Unknown',
        publishedAt: new Date(item.created_at),
        metrics,
        score,
        tags: item.hashtags || [],
      };
    });
  }

  private aggregateContentMetrics(logs: any[]): ContentPerformance['metrics'] {
    return logs.reduce((acc, log) => {
      const logMetrics = log.metrics as any || {};
      return {
        views: acc.views + (logMetrics.views || 0),
        likes: acc.likes + (logMetrics.likes || 0),
        shares: acc.shares + (logMetrics.shares || 0),
        comments: acc.comments + (logMetrics.comments || 0),
        saves: acc.saves + (logMetrics.saves || 0),
        clicks: acc.clicks + (logMetrics.clicks || 0),
        engagementRate: 0, // Will be calculated after aggregation
      };
    }, { views: 0, likes: 0, shares: 0, comments: 0, saves: 0, clicks: 0, engagementRate: 0 });
  }

  private calculatePerformanceScore(metrics: ContentPerformance['metrics']): number {
    const totalEngagement = metrics.likes + metrics.shares + metrics.comments + metrics.saves;
    const views = metrics.views || 1;
    const engagementRate = (totalEngagement / views) * 100;
    
    // Simple scoring algorithm (can be enhanced)
    return Math.min(100, engagementRate * 10 + (metrics.clicks / views) * 100);
  }

  private aggregatePlatformMetrics(logs: any[]): PlatformMetrics[] {
    const platformData = new Map<string, any>();

    logs.forEach(log => {
      const platform = log.platform;
      const metrics = log.metrics as any || {};

      if (!platformData.has(platform)) {
        platformData.set(platform, {
          platform,
          impressions: 0,
          reach: 0,
          engagement: 0,
          clicks: 0,
          conversions: 0,
        });
      }

      const data = platformData.get(platform);
      data.impressions += metrics.impressions || 0;
      data.reach += metrics.reach || 0;
      data.engagement += metrics.engagement || 0;
      data.clicks += metrics.clicks || 0;
      data.conversions += metrics.conversions || 0;
    });

    return Array.from(platformData.values()).map(data => ({
      ...data,
      engagementRate: data.impressions > 0 ? (data.engagement / data.impressions) * 100 : 0,
      clickThroughRate: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
    }));
  }

  private async getAudienceDemographics(organizationId: string, timeRange: TimeRange): Promise<any> {
    // Placeholder for audience demographics implementation
    return {};
  }

  private async getEngagementPatterns(organizationId: string, timeRange: TimeRange): Promise<any> {
    // Placeholder for engagement patterns implementation
    return {};
  }

  private async getAudienceGrowth(organizationId: string, timeRange: TimeRange): Promise<any> {
    // Placeholder for audience growth implementation
    return {};
  }
}

// Export singleton instance
export const advancedAnalyticsManager = new AdvancedAnalyticsManager();

// Utility functions
export const createTimeRange = (
  days: number,
  period: TimeRange['period'] = 'day'
): TimeRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  return { start, end, period };
};

export const getDefaultMetrics = (): string[] => [
  'publications',
  'impressions',
  'engagement',
  'clicks',
  'reach',
  'engagement_rate',
];

export const getAvailableVisualizations = (): { value: VisualizationType; label: string }[] => [
  { value: 'line_chart', label: 'Line Chart' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'area_chart', label: 'Area Chart' },
  { value: 'scatter_plot', label: 'Scatter Plot' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'table', label: 'Table' },
  { value: 'kpi_cards', label: 'KPI Cards' },
];