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

async function getUserHistoricalData(userId: string, platforms: string[]) {
  // Get user's past posting data and performance
  const { data: posts } = await supabase
    .from('post_results')
    .select(`
      platform,
      published_at,
      success,
      scheduled_posts (
        content,
        scheduled_at
      )
    `)
    .in('platform', platforms)
    .gte('published_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
    .order('published_at', { ascending: false });

  // Get engagement metrics from social platforms
  const { data: metrics } = await supabase
    .from('platform_metrics_history')
    .select('*')
    .eq('user_id', userId)
    .in('platform', platforms)
    .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  return {
    posts: posts || [],
    metrics: metrics || []
  };
}

async function analyzeAudiencePatterns(userId: string, historicalData: any) {
  const posts = historicalData.posts;
  
  if (posts.length === 0) {
    // Default audience insights if no historical data
    return {
      peakHours: [9, 12, 17, 20], // 9 AM, 12 PM, 5 PM, 8 PM
      activeWeekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'UTC',
      demographics: ['professionals', '25-34']
    };
  }

  // Analyze posting times and engagement patterns
  const postTimes = posts.map((post: any) => {
    const date = new Date(post.published_at);
    return {
      hour: date.getHours(),
      day: date.getDay(), // 0 = Sunday
      success: post.success
    };
  });

  // Find peak hours (hours with highest success rate)
  const hourlySuccess = new Map<number, { total: number; successful: number }>();
  
  postTimes.forEach(({ hour, success }) => {
    if (!hourlySuccess.has(hour)) {
      hourlySuccess.set(hour, { total: 0, successful: 0 });
    }
    const stats = hourlySuccess.get(hour)!;
    stats.total++;
    if (success) stats.successful++;
  });

  const peakHours = Array.from(hourlySuccess.entries())
    .filter(([_, stats]) => stats.total >= 2) // At least 2 posts
    .map(([hour, stats]) => ({ hour, rate: stats.successful / stats.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 4)
    .map(({ hour }) => hour);

  // Find active weekdays
  const dailySuccess = new Map<number, { total: number; successful: number }>();
  
  postTimes.forEach(({ day, success }) => {
    if (!dailySuccess.has(day)) {
      dailySuccess.set(day, { total: 0, successful: 0 });
    }
    const stats = dailySuccess.get(day)!;
    stats.total++;
    if (success) stats.successful++;
  });

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const activeWeekdays = Array.from(dailySuccess.entries())
    .filter(([_, stats]) => stats.total >= 1 && stats.successful / stats.total > 0.5)
    .map(([day, _]) => weekdays[day]);

  return {
    peakHours: peakHours.length > 0 ? peakHours : [9, 12, 17, 20],
    activeWeekdays: activeWeekdays.length > 0 ? activeWeekdays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timezone: 'UTC', // Would be determined from user settings
    demographics: ['professionals'] // Would be determined from audience analysis
  };
}

async function analyzeContentForScheduling(content: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze this content for scheduling purposes. Return a JSON object with readabilityScore (0-100), sentimentScore (0-100, 50=neutral), urgencyLevel (low/medium/high), and recommendedFrequency (daily/weekly/bi-weekly/monthly).'
        },
        {
          role: 'user',
          content: `Analyze this content: \"${content}\"`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const result = response.choices[0].message.content;
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        // Fallback parsing
      }
    }
  } catch (error) {
    console.error('Content analysis error:', error);
  }

  // Fallback analysis
  const urgencyKeywords = ['urgent', 'breaking', 'now', 'immediate', 'asap'];
  const hasUrgency = urgencyKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );

  return {
    readabilityScore: 75,
    sentimentScore: 60,
    urgencyLevel: hasUrgency ? 'high' : 'medium' as const,
    recommendedFrequency: 'weekly'
  };
}

async function getIndustryBenchmarks(platforms: string[]) {
  // Industry benchmark data (in production, this would come from a comprehensive database)
  const benchmarks = {
    twitter: {
      optimalTimes: ['9:00 AM', '1:00 PM', '5:00 PM'],
      avgEngagement: 1.5
    },
    instagram: {
      optimalTimes: ['11:00 AM', '1:00 PM', '5:00 PM'],
      avgEngagement: 1.8
    },
    linkedin: {
      optimalTimes: ['8:00 AM', '12:00 PM', '6:00 PM'],
      avgEngagement: 2.3
    },
    facebook: {
      optimalTimes: ['9:00 AM', '3:00 PM', '7:00 PM'],
      avgEngagement: 1.2
    },
    tiktok: {
      optimalTimes: ['6:00 AM', '10:00 AM', '7:00 PM'],
      avgEngagement: 4.2
    }
  };

  const industryBenchmarks = platforms.map(platform => ({
    platform,
    optimalTimes: benchmarks[platform as keyof typeof benchmarks]?.optimalTimes || ['12:00 PM'],
    avgEngagement: benchmarks[platform as keyof typeof benchmarks]?.avgEngagement || 1.0
  }));

  return {
    industryBenchmarks,
    suggestions: [
      'Consider posting during industry peak hours for maximum reach',
      'Cross-reference with your audience analytics for personalized timing',
      'Test different posting times to find your optimal schedule'
    ]
  };
}

async function calculateOptimalTimes(
  platforms: string[],
  historicalData: any,
  audienceInsights: any,
  contentAnalysis: any,
  timezone: string
): Promise<OptimalTime[]> {
  
  const optimalTimes: OptimalTime[] = [];
  
  for (const platform of platforms) {
    // Calculate optimal time based on multiple factors
    const baseHour = getBaseOptimalHour(platform);
    const audienceAdjustment = getAudienceAdjustment(audienceInsights, platform);
    const contentAdjustment = getContentAdjustment(contentAnalysis, platform);
    
    // Combine factors to get optimal hour
    const optimalHour = Math.round(baseHour + audienceAdjustment + contentAdjustment);
    const finalHour = Math.max(6, Math.min(22, optimalHour)); // Keep between 6 AM and 10 PM
    
    // Create datetime for next occurrence
    const now = new Date();
    const optimal = new Date(now);
    optimal.setHours(finalHour, 0, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (optimal <= now) {
      optimal.setDate(optimal.getDate() + 1);
    }
    
    // Avoid weekends for professional platforms
    if ((platform === 'linkedin') && (optimal.getDay() === 0 || optimal.getDay() === 6)) {
      optimal.setDate(optimal.getDate() + (8 - optimal.getDay())); // Move to next Monday
    }
    
    const confidence = calculateConfidence(platform, historicalData, audienceInsights);
    const expectedEngagement = estimateEngagement(platform, finalHour, contentAnalysis);
    
    // Generate alternative times
    const alternativeTimes = generateAlternativeTimes(optimal, platform, 3);
    
    optimalTimes.push({
      platform,
      datetime: optimal,
      confidence,
      reason: generateReason(platform, finalHour, audienceInsights, contentAnalysis),
      expectedEngagement,
      alternativeTimes
    });
  }
  
  return optimalTimes;
}

function getBaseOptimalHour(platform: string): number {
  const baseHours = {
    twitter: 12,
    instagram: 13,
    linkedin: 9,
    facebook: 15,
    tiktok: 19
  };
  
  return baseHours[platform as keyof typeof baseHours] || 12;
}

function getAudienceAdjustment(audienceInsights: any, platform: string): number {
  // Adjust based on audience peak hours
  const peakHours = audienceInsights.peakHours;
  if (peakHours.length === 0) return 0;
  
  // Use the first peak hour as primary adjustment
  const primaryPeak = peakHours[0];
  const baseOptimal = getBaseOptimalHour(platform);
  
  // Adjust towards audience peak, but not too drastically
  const diff = primaryPeak - baseOptimal;
  return Math.sign(diff) * Math.min(Math.abs(diff), 3); // Max 3 hour adjustment
}

function getContentAdjustment(contentAnalysis: any, platform: string): number {
  let adjustment = 0;
  
  // Urgent content should be posted earlier
  if (contentAnalysis.urgencyLevel === 'high') {
    adjustment -= 2;
  } else if (contentAnalysis.urgencyLevel === 'low') {
    adjustment += 1;
  }
  
  // Positive content performs better in afternoon/evening
  if (contentAnalysis.sentimentScore > 70) {
    adjustment += 1;
  }
  
  return adjustment;
}

function calculateConfidence(platform: string, historicalData: any, audienceInsights: any): number {
  let baseConfidence = 70; // Base confidence
  
  // Increase confidence if we have historical data
  if (historicalData.posts.length > 10) {
    baseConfidence += 15;
  } else if (historicalData.posts.length > 5) {
    baseConfidence += 10;
  }
  
  // Increase confidence if audience insights are strong
  if (audienceInsights.peakHours.length >= 3) {
    baseConfidence += 10;
  }
  
  return Math.min(95, baseConfidence);
}

function estimateEngagement(platform: string, hour: number, contentAnalysis: any): number {
  const baseEngagement = {
    twitter: 1.5,
    instagram: 1.8,
    linkedin: 2.3,
    facebook: 1.2,
    tiktok: 4.2
  };
  
  let engagement = baseEngagement[platform as keyof typeof baseEngagement] || 1.0;
  
  // Adjust based on hour (peak hours get boost)
  const peakHours = [9, 12, 17, 20];
  if (peakHours.includes(hour)) {
    engagement *= 1.2;
  }
  
  // Adjust based on content quality
  if (contentAnalysis.readabilityScore > 80) {
    engagement *= 1.1;
  }
  
  if (contentAnalysis.sentimentScore > 70) {
    engagement *= 1.05;
  }
  
  return Math.round(engagement * 100) / 100;
}

function generateAlternativeTimes(optimal: Date, platform: string, count: number) {
  const alternatives = [];
  
  for (let i = 1; i <= count; i++) {
    const alt = new Date(optimal);
    
    // Create alternatives: +2h, +4h, next day same time
    if (i === 1) {
      alt.setHours(alt.getHours() + 2);
    } else if (i === 2) {
      alt.setHours(alt.getHours() + 4);
    } else {
      alt.setDate(alt.getDate() + 1);
    }
    
    alternatives.push({
      datetime: alt,
      confidence: Math.max(50, 85 - (i * 10)),
      reason: `Alternative ${i}: ${i === 3 ? 'Next day' : `${i * 2}h later`} option`
    });
  }
  
  return alternatives;
}

function generateReason(platform: string, hour: number, audienceInsights: any, contentAnalysis: any): string {
  const reasons = [];
  
  if (audienceInsights.peakHours.includes(hour)) {
    reasons.push('matches your audience peak activity');
  }
  
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  reasons.push(`${timeOfDay} posting performs well on ${platform}`);
  
  if (contentAnalysis.urgencyLevel === 'high') {
    reasons.push('urgent content benefits from immediate posting');
  }
  
  return reasons.join(', ');
}

function generateCrossPlatformStrategy(optimalTimes: OptimalTime[], platforms: string[]) {
  // Sort platforms by optimal time
  const sortedTimes = optimalTimes.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  
  const sequence = sortedTimes.map((time, index) => {
    let delayMinutes = 0;
    let reason = 'Start of sequence';
    
    if (index > 0) {
      const prevTime = sortedTimes[index - 1].datetime;
      delayMinutes = Math.round((time.datetime.getTime() - prevTime.getTime()) / (1000 * 60));
      
      if (delayMinutes < 30) {
        reason = 'Quick follow-up to maintain momentum';
      } else if (delayMinutes < 120) {
        reason = 'Staggered timing for different audiences';
      } else {
        reason = 'Separate timing windows for maximum reach';
      }
    }
    
    return {
      platform: time.platform,
      delayMinutes,
      reason
    };
  });
  
  const totalDuration = sequence.reduce((sum, seq) => sum + seq.delayMinutes, 0);
  
  return {
    sequence,
    totalDuration
  };
}

async function generateSchedulingRecommendations(
  request: SchedulingRequest,
  optimalTimes: OptimalTime[],
  audienceInsights: any,
  contentAnalysis: any
): Promise<string[]> {
  
  const recommendations = [];
  
  // Time-based recommendations
  const avgConfidence = optimalTimes.reduce((sum, t) => sum + t.confidence, 0) / optimalTimes.length;
  if (avgConfidence < 70) {
    recommendations.push('Consider building more posting history to improve scheduling accuracy');
  }
  
  // Content-based recommendations
  if (contentAnalysis.urgencyLevel === 'high') {
    recommendations.push('This urgent content should be posted immediately across all platforms');
  } else {
    recommendations.push('Stagger posting across platforms for maximum reach');
  }
  
  // Platform-specific recommendations
  const hasLinkedIn = request.platforms.includes('linkedin');
  const hasInstagram = request.platforms.includes('instagram');
  
  if (hasLinkedIn && hasInstagram) {
    recommendations.push('Post to LinkedIn first for professional audience, then Instagram for broader reach');
  }
  
  // Audience recommendations
  if (audienceInsights.peakHours.length < 2) {
    recommendations.push('Try posting at different times to identify your audience peak hours');
  }
  
  // Frequency recommendations
  if (contentAnalysis.recommendedFrequency === 'daily') {
    recommendations.push('High-engagement content like this can be posted daily');
  } else {
    recommendations.push(`Based on content analysis, ${contentAnalysis.recommendedFrequency} posting is recommended`);
  }
  
  // Use AI for additional creative recommendations
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a social media scheduling expert. Provide 2-3 specific, actionable scheduling recommendations based on the provided data.'
        },
        {
          role: 'user',
          content: `Content: \"${request.content}\", Platforms: ${request.platforms.join(', ')}, Urgency: ${contentAnalysis.urgencyLevel}`
        }
      ],
      temperature: 0.6,
      max_tokens: 200
    });

    const aiRecommendations = response.choices[0].message.content;
    if (aiRecommendations) {
      const aiSuggestions = aiRecommendations.split('\
')
        .filter(s => s.trim())
        .slice(0, 3);
      recommendations.push(...aiSuggestions);
    }
  } catch (error) {
    console.error('AI recommendations error:', error);
  }
  
  return recommendations.slice(0, 8); // Limit to 8 recommendations
}