// AI Usage Tracking and Limits System - Phase 4 Enhancement
// Monitor AI API usage, costs, and enforce limits

import { log } from '@/utils/logger';

export interface AIUsageMetrics {
  provider: string;
  model: string;
  operation: string;
  tokensUsed: number;
  cost: number;
  duration: number; // milliseconds
  timestamp: Date;
  success: boolean;
  error?: string;
  userId?: string;
  organizationId?: string;
}

export interface UsageLimits {
  daily: {
    tokens: number;
    cost: number;
    requests: number;
  };
  monthly: {
    tokens: number;
    cost: number;
    requests: number;
  };
  perRequest: {
    tokens: number;
    timeout: number; // milliseconds
  };
}

export interface UsageQuota {
  used: {
    tokens: number;
    cost: number;
    requests: number;
  };
  remaining: {
    tokens: number;
    cost: number;
    requests: number;
  };
  resetAt: Date;
  percentUsed: number;
}

export interface CostBreakdown {
  provider: string;
  model: string;
  totalCost: number;
  tokenCount: number;
  requestCount: number;
  averageCostPerRequest: number;
}

// Default usage limits
export const DEFAULT_LIMITS: UsageLimits = {
  daily: {
    tokens: 100000,
    cost: 10.00,
    requests: 1000
  },
  monthly: {
    tokens: 3000000,
    cost: 300.00,
    requests: 30000
  },
  perRequest: {
    tokens: 4000,
    timeout: 30000
  }
};

// Pricing per 1K tokens (in USD)
export const AI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'gemini-pro': { input: 0.001, output: 0.002 },
  'dall-e-3': { input: 0.04, output: 0.04 },
  'stable-diffusion-xl': { input: 0.002, output: 0.002 }
};

export class AIUsageTracker {
  private usage: AIUsageMetrics[] = [];
  private limits: UsageLimits;
  private alerts: Map<string, Date> = new Map();
  private costAlertThresholds = [50, 75, 90, 100]; // Percentage thresholds
  
  constructor(customLimits?: Partial<UsageLimits>) {
    this.limits = { ...DEFAULT_LIMITS, ...customLimits };
    this.loadHistoricalUsage();
  }
  
  // Track AI API usage
  async trackUsage(metrics: Omit<AIUsageMetrics, 'timestamp'>): Promise<void> {
    const usage: AIUsageMetrics = {
      ...metrics,
      timestamp: new Date()
    };
    
    // Check if usage exceeds limits before tracking
    const quotaCheck = await this.checkQuota('daily');
    if (quotaCheck.remaining.tokens < metrics.tokensUsed) {
      throw new Error('Daily token limit exceeded');
    }
    if (quotaCheck.remaining.cost < metrics.cost) {
      throw new Error('Daily cost limit exceeded');
    }
    
    this.usage.push(usage);
    
    // Log usage
    log.info('AI usage tracked', {
      provider: usage.provider,
      model: usage.model,
      tokens: usage.tokensUsed,
      cost: usage.cost
    });
    
    // Check for alerts
    await this.checkAlerts();
    
    // Persist to storage
    await this.persistUsage();
  }
  
  // Calculate cost for tokens
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = AI_PRICING[model];
    if (!pricing) {
      log.warn(`No pricing found for model ${model}, using default`);
      return 0.001 * (inputTokens + outputTokens) / 1000;
    }
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return parseFloat((inputCost + outputCost).toFixed(4));
  }
  
  // Check usage quota
  async checkQuota(period: 'daily' | 'monthly'): Promise<UsageQuota> {
    const now = new Date();
    const startDate = this.getPeriodStartDate(period);
    
    const periodUsage = this.usage.filter(u => u.timestamp >= startDate);
    
    const used = {
      tokens: periodUsage.reduce((sum, u) => sum + u.tokensUsed, 0),
      cost: periodUsage.reduce((sum, u) => sum + u.cost, 0),
      requests: periodUsage.length
    };
    
    const limits = this.limits[period];
    const remaining = {
      tokens: Math.max(0, limits.tokens - used.tokens),
      cost: Math.max(0, limits.cost - used.cost),
      requests: Math.max(0, limits.requests - used.requests)
    };
    
    const percentUsed = Math.max(
      (used.tokens / limits.tokens) * 100,
      (used.cost / limits.cost) * 100,
      (used.requests / limits.requests) * 100
    );
    
    const resetAt = this.getPeriodEndDate(period);
    
    return {
      used,
      remaining,
      resetAt,
      percentUsed
    };
  }
  
  // Get usage statistics
  async getUsageStats(
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'provider' | 'model' | 'day' | 'hour'
  ): Promise<{
    total: {
      tokens: number;
      cost: number;
      requests: number;
      successRate: number;
      avgDuration: number;
    };
    breakdown?: any[];
    timeline?: any[];
  }> {
    const start = startDate || this.getPeriodStartDate('monthly');
    const end = endDate || new Date();
    
    const periodUsage = this.usage.filter(
      u => u.timestamp >= start && u.timestamp <= end
    );
    
    const total = {
      tokens: periodUsage.reduce((sum, u) => sum + u.tokensUsed, 0),
      cost: periodUsage.reduce((sum, u) => sum + u.cost, 0),
      requests: periodUsage.length,
      successRate: periodUsage.filter(u => u.success).length / periodUsage.length * 100,
      avgDuration: periodUsage.reduce((sum, u) => sum + u.duration, 0) / periodUsage.length
    };
    
    let breakdown;
    if (groupBy) {
      breakdown = this.groupUsageBy(periodUsage, groupBy);
    }
    
    const timeline = this.generateTimeline(periodUsage);
    
    return { total, breakdown, timeline };
  }
  
  // Get cost breakdown
  getCostBreakdown(period: 'daily' | 'monthly'): CostBreakdown[] {
    const startDate = this.getPeriodStartDate(period);
    const periodUsage = this.usage.filter(u => u.timestamp >= startDate);
    
    const breakdown = new Map<string, CostBreakdown>();
    
    for (const usage of periodUsage) {
      const key = `${usage.provider}-${usage.model}`;
      const existing = breakdown.get(key) || {
        provider: usage.provider,
        model: usage.model,
        totalCost: 0,
        tokenCount: 0,
        requestCount: 0,
        averageCostPerRequest: 0
      };
      
      existing.totalCost += usage.cost;
      existing.tokenCount += usage.tokensUsed;
      existing.requestCount += 1;
      existing.averageCostPerRequest = existing.totalCost / existing.requestCount;
      
      breakdown.set(key, existing);
    }
    
    return Array.from(breakdown.values())
      .sort((a, b) => b.totalCost - a.totalCost);
  }
  
  // Set custom limits
  setLimits(limits: Partial<UsageLimits>): void {
    this.limits = { ...this.limits, ...limits };
    log.info('Usage limits updated', limits);
  }
  
  // Get current limits
  getLimits(): UsageLimits {
    return { ...this.limits };
  }
  
  // Check if operation is within limits
  async canExecute(estimatedTokens: number, model: string): Promise<{
    allowed: boolean;
    reason?: string;
    suggestion?: string;
  }> {
    // Check per-request limit
    if (estimatedTokens > this.limits.perRequest.tokens) {
      return {
        allowed: false,
        reason: `Request exceeds token limit (${estimatedTokens} > ${this.limits.perRequest.tokens})`,
        suggestion: 'Consider breaking down the request into smaller parts'
      };
    }
    
    // Estimate cost
    const estimatedCost = this.calculateCost(model, estimatedTokens, 0);
    
    // Check daily quota
    const dailyQuota = await this.checkQuota('daily');
    if (dailyQuota.remaining.tokens < estimatedTokens) {
      return {
        allowed: false,
        reason: 'Daily token limit would be exceeded',
        suggestion: `Wait until ${dailyQuota.resetAt.toLocaleString()} for quota reset`
      };
    }
    
    if (dailyQuota.remaining.cost < estimatedCost) {
      return {
        allowed: false,
        reason: 'Daily cost limit would be exceeded',
        suggestion: 'Consider using a more cost-effective model'
      };
    }
    
    // Check monthly quota
    const monthlyQuota = await this.checkQuota('monthly');
    if (monthlyQuota.percentUsed > 90) {
      log.warn('Monthly usage above 90%', { percentUsed: monthlyQuota.percentUsed });
    }
    
    return { allowed: true };
  }
  
  // Group usage by specified field
  private groupUsageBy(usage: AIUsageMetrics[], groupBy: string): any[] {
    const groups = new Map<string, any>();
    
    for (const item of usage) {
      let key: string;
      switch (groupBy) {
        case 'provider':
          key = item.provider;
          break;
        case 'model':
          key = item.model;
          break;
        case 'day':
          key = item.timestamp.toISOString().split('T')[0];
          break;
        case 'hour':
          key = `${item.timestamp.toISOString().split('T')[0]} ${item.timestamp.getHours()}:00`;
          break;
        default:
          key = 'unknown';
      }
      
      const existing = groups.get(key) || {
        key,
        tokens: 0,
        cost: 0,
        requests: 0
      };
      
      existing.tokens += item.tokensUsed;
      existing.cost += item.cost;
      existing.requests += 1;
      
      groups.set(key, existing);
    }
    
    return Array.from(groups.values());
  }
  
  // Generate usage timeline
  private generateTimeline(usage: AIUsageMetrics[]): any[] {
    const timeline: any[] = [];
    const dailyUsage = new Map<string, any>();
    
    for (const item of usage) {
      const date = item.timestamp.toISOString().split('T')[0];
      const existing = dailyUsage.get(date) || {
        date,
        tokens: 0,
        cost: 0,
        requests: 0
      };
      
      existing.tokens += item.tokensUsed;
      existing.cost += item.cost;
      existing.requests += 1;
      
      dailyUsage.set(date, existing);
    }
    
    return Array.from(dailyUsage.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  
  // Check and trigger alerts
  private async checkAlerts(): Promise<void> {
    const dailyQuota = await this.checkQuota('daily');
    const monthlyQuota = await this.checkQuota('monthly');
    
    // Check cost alert thresholds
    for (const threshold of this.costAlertThresholds) {
      if (dailyQuota.percentUsed >= threshold) {
        const alertKey = `daily-${threshold}`;
        if (!this.hasRecentAlert(alertKey)) {
          this.triggerAlert(alertKey, `Daily usage at ${threshold}% of limit`);
        }
      }
      
      if (monthlyQuota.percentUsed >= threshold) {
        const alertKey = `monthly-${threshold}`;
        if (!this.hasRecentAlert(alertKey)) {
          this.triggerAlert(alertKey, `Monthly usage at ${threshold}% of limit`);
        }
      }
    }
  }
  
  // Check if alert was recently triggered
  private hasRecentAlert(key: string): boolean {
    const lastAlert = this.alerts.get(key);
    if (!lastAlert) return false;
    
    const hoursSinceAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60);
    return hoursSinceAlert < 24; // Don't repeat alerts within 24 hours
  }
  
  // Trigger usage alert
  private triggerAlert(key: string, message: string): void {
    this.alerts.set(key, new Date());
    log.warn(`Usage alert: ${message}`, { alertKey: key });
    
    // In production, send notifications via email, webhook, etc.
  }
  
  // Get period start date
  private getPeriodStartDate(period: 'daily' | 'monthly'): Date {
    const now = new Date();
    if (period === 'daily') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
  
  // Get period end date
  private getPeriodEndDate(period: 'daily' | 'monthly'): Date {
    const now = new Date();
    if (period === 'daily') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
  
  // Load historical usage from storage
  private async loadHistoricalUsage(): Promise<void> {
    try {
      // In production, load from database
      const stored = localStorage.getItem('ai_usage_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.usage = parsed.map((u: any) => ({
          ...u,
          timestamp: new Date(u.timestamp)
        }));
      }
    } catch (error) {
      log.error('Failed to load usage history', error);
    }
  }
  
  // Persist usage to storage
  private async persistUsage(): Promise<void> {
    try {
      // In production, save to database
      localStorage.setItem('ai_usage_history', JSON.stringify(this.usage));
    } catch (error) {
      log.error('Failed to persist usage', error);
    }
  }
  
  // Export usage data
  exportUsageData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.usage, null, 2);
    } else {
      // CSV export
      const headers = ['timestamp', 'provider', 'model', 'operation', 'tokens', 'cost', 'duration', 'success'];
      const rows = this.usage.map(u => [
        u.timestamp.toISOString(),
        u.provider,
        u.model,
        u.operation,
        u.tokensUsed,
        u.cost,
        u.duration,
        u.success
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }
  
  // Reset usage tracking
  resetUsage(period?: 'daily' | 'monthly' | 'all'): void {
    if (period === 'all') {
      this.usage = [];
    } else if (period) {
      const startDate = this.getPeriodStartDate(period);
      this.usage = this.usage.filter(u => u.timestamp < startDate);
    }
    
    this.alerts.clear();
    this.persistUsage();
    log.info('Usage tracking reset', { period });
  }
}

// Export singleton instance
export const aiUsageTracker = new AIUsageTracker();