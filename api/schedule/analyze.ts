import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface SchedulingRequest {
  content: string;
  platforms: string[];
  timezone?: string;
  targetAudience?: string;
  contentType?: string;
  urgency?: 'low' | 'medium' | 'high';
}

interface OptimalTime {
  platform: string;
  datetime: Date;
  confidence: number;
  reason: string;
  expectedEngagement: number;
  alternativeTimes: {
    datetime: Date;
    confidence: number;
    reason: string;
  }[];
}

interface SchedulingAnalysis {
  optimalTimes: OptimalTime[];
  audienceInsights: {
    peakHours: number[];
    activeWeekdays: string[];
    timezone: string;
    demographics: string[];
  };
  contentAnalysis: {
    readabilityScore: number;
    sentimentScore: number;
    urgencyLevel: 'low' | 'medium' | 'high';
    recommendedFrequency: string;
  };
  competitorAnalysis: {
    industryBenchmarks: {
      platform: string;
      optimalTimes: string[];
      avgEngagement: number;
    }[];
    suggestions: string[];
  };
  recommendations: string[];
  crossPlatformStrategy: {
    sequence: {
      platform: string;
      delayMinutes: number;
      reason: string;
    }[];
    totalDuration: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    const schedulingRequest: SchedulingRequest = req.body;

    if (!schedulingRequest.content || !schedulingRequest.platforms || schedulingRequest.platforms.length === 0) {
      return res.status(400).json({ error: 'Missing content or platforms' });
    }

    // Perform intelligent scheduling analysis
    const analysis = await analyzeOptimalScheduling(user.id, schedulingRequest);

    // Store analysis for future learning
    await supabase
      .from('scheduling_analyses')
      .insert({
        user_id: user.id,
        content: schedulingRequest.content,
        platforms: schedulingRequest.platforms,
        analysis_result: analysis,
        created_at: new Date().toISOString()
      });

    res.status(200).json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduling analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function analyzeOptimalScheduling(
  userId: string,
  request: SchedulingRequest
): Promise<SchedulingAnalysis> {
  
  // 1. Get user's historical posting data
  const historicalData = await getUserHistoricalData(userId, request.platforms);
  
  // 2. Analyze user's audience patterns
  const audienceInsights = await analyzeAudiencePatterns(userId, historicalData);
  
  // 3. Analyze the content
  const contentAnalysis = await analyzeContentForScheduling(request.content);
  
  // 4. Get industry benchmarks
  const competitorAnalysis = await getIndustryBenchmarks(request.platforms);
  
  // 5. Calculate optimal times for each platform
  const optimalTimes = await calculateOptimalTimes(
    request.platforms,
    historicalData,
    audienceInsights,
    contentAnalysis,
    request.timezone || 'UTC'
  );
  
  // 6. Generate cross-platform strategy
  const crossPlatformStrategy = generateCrossPlatformStrategy(optimalTimes, request.platforms);
  
  // 7. Generate AI-powered recommendations
  const recommendations = await generateSchedulingRecommendations(
    request,
    optimalTimes,
    audienceInsights,
    contentAnalysis
  );

  return {
    optimalTimes,
    audienceInsights,
    contentAnalysis,
    competitorAnalysis,
    recommendations,
    crossPlatformStrategy
  };
}

interface PostResultRow {
  platform: string;
  published_at: string | null;
  success: boolean | null;
  scheduled_posts: {
    content: string | null;
    scheduled_at: string | null;
  } | null;
}

interface PlatformMetricRow {
  platform: string;
  user_id: string;
  recorded_at: string;
  impressions?: number | null;
  engagement_rate?: number | null;
  clicks?: number | null;
}

interface HistoricalData {
  posts: PostResultRow[];
  metrics: PlatformMetricRow[];
}

interface AudienceInsights {
  peakHours: number[];
  activeWeekdays: string[];
  timezone: string;
  demographics: string[];
}

interface ContentAnalysisResult {
  readabilityScore: number;
  sentimentScore: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  recommendedFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
}

interface IndustryBenchmark {
  platform: string;
  optimalTimes: string[];
  avgEngagement: number;
}

async function getUserHistoricalData(userId: string, platforms: string[]): Promise<HistoricalData> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error: postsError } = await supabase
    .from('post_results')
    .select(
      `
        platform,
        published_at,
        success,
        scheduled_posts (
          content,
          scheduled_at
        )
      `
    )
    .in('platform', platforms)
    .gte('published_at', ninetyDaysAgo)
    .order('published_at', { ascending: false });

  if (postsError) {
    console.warn('Failed to load historical post data:', postsError);
  }

  const { data: metrics, error: metricsError } = await supabase
    .from('platform_metrics_history')
    .select('*')
    .eq('user_id', userId)
    .in('platform', platforms)
    .gte('recorded_at', thirtyDaysAgo);

  if (metricsError) {
    console.warn('Failed to load platform metrics history:', metricsError);
  }

  return {
    posts: (posts as PostResultRow[] | null) ?? [],
    metrics: (metrics as PlatformMetricRow[] | null) ?? []
  };
}

async function analyzeAudiencePatterns(
  userId: string,
  historicalData: HistoricalData
): Promise<AudienceInsights> {
  if (historicalData.posts.length === 0) {
    return {
      peakHours: [9, 12, 17, 20],
      activeWeekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'UTC',
      demographics: ['professionals', '25-34']
    };
  }

  type HourStat = { total: number; successful: number };
  const hourlySuccess = new Map<number, HourStat>();
  const dailySuccess = new Map<number, HourStat>();

  historicalData.posts.forEach((post) => {
    if (!post.published_at) return;
    const publishedAt = new Date(post.published_at);
    const hour = publishedAt.getHours();
    const day = publishedAt.getDay();
    const success = Boolean(post.success);

    const hourStat = hourlySuccess.get(hour) ?? { total: 0, successful: 0 };
    hourStat.total += 1;
    hourStat.successful += success ? 1 : 0;
    hourlySuccess.set(hour, hourStat);

    const dayStat = dailySuccess.get(day) ?? { total: 0, successful: 0 };
    dayStat.total += 1;
    dayStat.successful += success ? 1 : 0;
    dailySuccess.set(day, dayStat);
  });

  const peakHours = Array.from(hourlySuccess.entries())
    .filter(([, stats]) => stats.total >= 2)
    .map(([hour, stats]) => ({ hour, rate: stats.successful / stats.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 4)
    .map(({ hour }) => hour);

  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const activeWeekdays = Array.from(dailySuccess.entries())
    .filter(([, stats]) => stats.total > 0 && stats.successful / stats.total > 0.5)
    .map(([day]) => weekdayNames[day]);

  return {
    peakHours: peakHours.length > 0 ? peakHours : [9, 12, 17, 20],
    activeWeekdays: activeWeekdays.length > 0 ? activeWeekdays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timezone: 'UTC',
    demographics: ['professionals']
  };
}

async function analyzeContentForScheduling(content: string): Promise<ContentAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Analyze this content for scheduling purposes. Return a JSON object with readabilityScore (0-100), sentimentScore (0-100, 50=neutral), urgencyLevel (low/medium/high), and recommendedFrequency (daily/weekly/bi-weekly/monthly).'
        },
        {
          role: 'user',
          content: `Analyze this content: "${content}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      const parsed = JSON.parse(result) as Partial<ContentAnalysisResult>;
      if (
        typeof parsed.readabilityScore === 'number' &&
        typeof parsed.sentimentScore === 'number' &&
        parsed.urgencyLevel &&
        parsed.recommendedFrequency
      ) {
        return parsed as ContentAnalysisResult;
      }
    }
  } catch (error) {
    console.error('Content analysis error:', error);
  }

  const urgencyKeywords = ['urgent', 'breaking', 'now', 'immediate', 'asap'];
  const hasUrgency = urgencyKeywords.some((keyword) => content.toLowerCase().includes(keyword));

  return {
    readabilityScore: 75,
    sentimentScore: 60,
    urgencyLevel: hasUrgency ? 'high' : 'medium',
    recommendedFrequency: 'weekly'
  };
}

async function getIndustryBenchmarks(platforms: string[]): Promise<IndustryBenchmark[]> {
  const benchmarkLookup: Record<string, IndustryBenchmark> = {
    twitter: {
      platform: 'twitter',
      optimalTimes: ['9:00 AM', '1:00 PM', '5:00 PM'],
      avgEngagement: 1.5
    },
    instagram: {
      platform: 'instagram',
      optimalTimes: ['11:00 AM', '1:00 PM', '5:00 PM'],
      avgEngagement: 1.8
    },
    linkedin: {
      platform: 'linkedin',
      optimalTimes: ['8:00 AM', '12:00 PM', '6:00 PM'],
      avgEngagement: 2.3
    },
    facebook: {
      platform: 'facebook',
      optimalTimes: ['9:00 AM', '1:00 PM', '7:00 PM'],
      avgEngagement: 1.2
    },
    tiktok: {
      platform: 'tiktok',
      optimalTimes: ['7:00 PM', '9:00 PM', '11:00 PM'],
      avgEngagement: 4.2
    }
  };

  return platforms
    .map((platform) => benchmarkLookup[platform.toLowerCase()])
    .filter((benchmark): benchmark is IndustryBenchmark => Boolean(benchmark));
}

function analyzeCompetitors(
  platforms: string[],
  historicalData: HistoricalData,
  benchmarks: IndustryBenchmark[]
): SchedulingAnalysis['competitorAnalysis'] {
  const suggestions = new Set<string>();

  benchmarks.forEach((benchmark) => {
    suggestions.add(`Consider posting on ${benchmark.platform} around ${benchmark.optimalTimes.join(', ')}`);
  });

  if (historicalData.metrics.length === 0) {
    suggestions.add('Collect more performance data to personalise competitor insights');
  }

  platforms.forEach((platform) => {
    const benchmark = benchmarks.find((item) => item.platform === platform);
    if (!benchmark) return;

    const platformMetrics = historicalData.metrics.filter((metric) => metric.platform === platform);
    if (platformMetrics.length === 0) {
      suggestions.add(`Connect ${platform} analytics to compare against industry benchmarks`);
    } else if ((platformMetrics[0]?.engagement_rate ?? 0) < benchmark.avgEngagement) {
      suggestions.add(`Experiment with new content formats on ${platform} to exceed industry engagement (${benchmark.avgEngagement}%)`);
    }
  });

  return {
    industryBenchmarks: benchmarks,
    suggestions: Array.from(suggestions)
  };
}

async function calculateOptimalTimes(
  platforms: string[],
  historicalData: HistoricalData,
  audienceInsights: AudienceInsights,
  contentAnalysis: ContentAnalysisResult,
  timezone: string
): Promise<OptimalTime[]> {
  const optimalTimes: OptimalTime[] = [];

  const now = new Date();

  platforms.forEach((platform) => {
    const peakHours = audienceInsights.peakHours.length > 0 ? audienceInsights.peakHours : [9, 12, 17, 20];
    const primaryHour = peakHours[0] ?? 9;
    const bestHour = primaryHour + determineContentAdjustment(contentAnalysis, platform);

    const scheduledDate = new Date(now);
    scheduledDate.setUTCHours(bestHour, 0, 0, 0);

    const confidence = calculateConfidence(platform, historicalData, audienceInsights);
    const engagement = estimateEngagement(platform, bestHour, contentAnalysis);

    optimalTimes.push({
      platform,
      datetime: scheduledDate,
      confidence,
      reason: buildReason(platform, bestHour, audienceInsights, contentAnalysis),
      expectedEngagement: engagement,
      alternativeTimes: buildAlternatives(scheduledDate, platform, 3)
    });
  });

  return optimalTimes;
}

function determineContentAdjustment(contentAnalysis: ContentAnalysisResult, platform: string): number {
  let adjustment = 0;
  if (contentAnalysis.urgencyLevel === 'high') {
    adjustment -= 2;
  } else if (contentAnalysis.urgencyLevel === 'low') {
    adjustment += 1;
  }

  if (platform === 'instagram' && contentAnalysis.sentimentScore > 70) {
    adjustment += 1;
  }

  return adjustment;
}

function calculateConfidence(
  platform: string,
  historicalData: HistoricalData,
  audienceInsights: AudienceInsights
): number {
  let confidence = 70;

  const postCount = historicalData.posts.filter((post) => post.platform === platform).length;
  if (postCount > 10) {
    confidence += 15;
  } else if (postCount > 5) {
    confidence += 10;
  }

  if (audienceInsights.peakHours.length >= 3) {
    confidence += 10;
  }

  return Math.min(95, confidence);
}

function estimateEngagement(
  platform: string,
  hour: number,
  contentAnalysis: ContentAnalysisResult
): number {
  const baseEngagement: Record<string, number> = {
    twitter: 1.5,
    instagram: 1.8,
    linkedin: 2.3,
    facebook: 1.2,
    tiktok: 4.2
  };

  let engagement = baseEngagement[platform.toLowerCase()] ?? 1.0;

  if ([9, 12, 17, 20].includes(hour)) {
    engagement *= 1.2;
  }

  if (contentAnalysis.readabilityScore > 80) {
    engagement *= 1.1;
  }

  if (contentAnalysis.sentimentScore > 70) {
    engagement *= 1.05;
  }

  return Math.round(engagement * 100) / 100;
}

function buildAlternatives(optimal: Date, platform: string, count: number): OptimalTime['alternativeTimes'] {
  const alternatives: OptimalTime['alternativeTimes'] = [];

  for (let i = 1; i <= count; i += 1) {
    const alt = new Date(optimal);

    if (i === 1) {
      alt.setHours(alt.getHours() + 2);
    } else if (i === 2) {
      alt.setHours(alt.getHours() + 4);
    } else {
      alt.setDate(alt.getDate() + 1);
    }

    alternatives.push({
      datetime: alt,
      confidence: Math.max(50, 85 - i * 10),
      reason: `Alternative ${i} posting window for ${platform}`
    });
  }

  return alternatives;
}

function buildReason(
  platform: string,
  hour: number,
  audienceInsights: AudienceInsights,
  contentAnalysis: ContentAnalysisResult
): string {
  const reasons: string[] = [];

  if (audienceInsights.peakHours.includes(hour)) {
    reasons.push('matches recent audience activity patterns');
  }

  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  reasons.push(`${timeOfDay} slots perform well on ${platform}`);

  if (contentAnalysis.urgencyLevel === 'high') {
    reasons.push('content urgency suggests publishing sooner');
  }

  return reasons.join(', ');
}

function generateCrossPlatformStrategy(optimalTimes: OptimalTime[], platforms: string[]) {
  const sortedTimes = [...optimalTimes].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  const sequence = sortedTimes.map((time, index) => {
    if (index === 0) {
      return {
        platform: time.platform,
        delayMinutes: 0,
        reason: 'Kick off campaign with this platform to establish momentum'
      };
    }

    const previous = sortedTimes[index - 1];
    const delayMinutes = Math.max(
      0,
      Math.round((time.datetime.getTime() - previous.datetime.getTime()) / (1000 * 60))
    );

    const reason =
      delayMinutes < 30
        ? 'Rapid follow-up keeps audience warm'
        : delayMinutes < 120
        ? 'Staggering posts to reach different segments'
        : 'Spacing posts to avoid fatigue';

    return {
      platform: time.platform,
      delayMinutes,
      reason
    };
  });

  const totalDuration = sequence.reduce((sum, step) => sum + step.delayMinutes, 0);

  return {
    sequence,
    totalDuration
  };
}

async function generateSchedulingRecommendations(
  request: SchedulingRequest,
  optimalTimes: OptimalTime[],
  audienceInsights: AudienceInsights,
  contentAnalysis: ContentAnalysisResult
): Promise<string[]> {
  const recommendations: string[] = [];

  const averageConfidence =
    optimalTimes.reduce((sum, time) => sum + time.confidence, 0) / optimalTimes.length;
  if (averageConfidence < 70) {
    recommendations.push('Build up more posting history to improve scheduling accuracy');
  }

  if (contentAnalysis.urgencyLevel === 'high') {
    recommendations.push('Publish across all platforms promptly due to high urgency');
  } else {
    recommendations.push('Stagger posts to keep engagement rolling throughout the day');
  }

  if (audienceInsights.peakHours.length < 2) {
    recommendations.push('Experiment with different posting times to learn more about your audience');
  }

  recommendations.push(
    contentAnalysis.recommendedFrequency === 'daily'
      ? 'Consider a daily cadence for similar high-performing content'
      : `Aim for ${contentAnalysis.recommendedFrequency} publishing based on analysis`
  );

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a social media scheduling expert. Provide 2 specific, actionable scheduling recommendations based on the provided data.'
        },
        {
          role: 'user',
          content: `Content: "${request.content}". Platforms: ${request.platforms.join(
            ', '
          )}. Urgency: ${contentAnalysis.urgencyLevel}.`
        }
      ],
      temperature: 0.6,
      max_tokens: 180
    });

    const aiText = response.choices[0]?.message?.content;
    if (aiText) {
      aiText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .forEach((line) => recommendations.push(line));
    }
  } catch (error) {
    console.error('AI recommendation error:', error);
  }

  return recommendations.slice(0, 8);
}
