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
    .from('post_results')\n    .select(`\n      platform,\n      published_at,\n      success,\n      scheduled_posts (\n        content,\n        scheduled_at\n      )\n    `)\n    .in('platform', platforms)\n    .gte('published_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days\n    .order('published_at', { ascending: false });\n\n  // Get engagement metrics from social platforms\n  const { data: metrics } = await supabase\n    .from('platform_metrics_history')\n    .select('*')\n    .eq('user_id', userId)\n    .in('platform', platforms)\n    .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days\n\n  return {\n    posts: posts || [],\n    metrics: metrics || []\n  };\n}\n\nasync function analyzeAudiencePatterns(userId: string, historicalData: any) {\n  const posts = historicalData.posts;\n  \n  if (posts.length === 0) {\n    // Default audience insights if no historical data\n    return {\n      peakHours: [9, 12, 17, 20], // 9 AM, 12 PM, 5 PM, 8 PM\n      activeWeekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],\n      timezone: 'UTC',\n      demographics: ['professionals', '25-34']\n    };\n  }\n\n  // Analyze posting times and engagement patterns\n  const postTimes = posts.map((post: any) => {\n    const date = new Date(post.published_at);\n    return {\n      hour: date.getHours(),\n      day: date.getDay(), // 0 = Sunday\n      success: post.success\n    };\n  });\n\n  // Find peak hours (hours with highest success rate)\n  const hourlySuccess = new Map<number, { total: number; successful: number }>();\n  \n  postTimes.forEach(({ hour, success }) => {\n    if (!hourlySuccess.has(hour)) {\n      hourlySuccess.set(hour, { total: 0, successful: 0 });\n    }\n    const stats = hourlySuccess.get(hour)!;\n    stats.total++;\n    if (success) stats.successful++;\n  });\n\n  const peakHours = Array.from(hourlySuccess.entries())\n    .filter(([_, stats]) => stats.total >= 2) // At least 2 posts\n    .map(([hour, stats]) => ({ hour, rate: stats.successful / stats.total }))\n    .sort((a, b) => b.rate - a.rate)\n    .slice(0, 4)\n    .map(({ hour }) => hour);\n\n  // Find active weekdays\n  const dailySuccess = new Map<number, { total: number; successful: number }>();\n  \n  postTimes.forEach(({ day, success }) => {\n    if (!dailySuccess.has(day)) {\n      dailySuccess.set(day, { total: 0, successful: 0 });\n    }\n    const stats = dailySuccess.get(day)!;\n    stats.total++;\n    if (success) stats.successful++;\n  });\n\n  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];\n  const activeWeekdays = Array.from(dailySuccess.entries())\n    .filter(([_, stats]) => stats.total >= 1 && stats.successful / stats.total > 0.5)\n    .map(([day, _]) => weekdays[day]);\n\n  return {\n    peakHours: peakHours.length > 0 ? peakHours : [9, 12, 17, 20],\n    activeWeekdays: activeWeekdays.length > 0 ? activeWeekdays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],\n    timezone: 'UTC', // Would be determined from user settings\n    demographics: ['professionals'] // Would be determined from audience analysis\n  };\n}\n\nasync function analyzeContentForScheduling(content: string) {\n  try {\n    const response = await openai.chat.completions.create({\n      model: 'gpt-3.5-turbo',\n      messages: [\n        {\n          role: 'system',\n          content: 'Analyze this content for scheduling purposes. Return a JSON object with readabilityScore (0-100), sentimentScore (0-100, 50=neutral), urgencyLevel (low/medium/high), and recommendedFrequency (daily/weekly/bi-weekly/monthly).'\n        },\n        {\n          role: 'user',\n          content: `Analyze this content: \"${content}\"`\n        }\n      ],\n      temperature: 0.3,\n      max_tokens: 200\n    });\n\n    const result = response.choices[0].message.content;\n    if (result) {\n      try {\n        return JSON.parse(result);\n      } catch {\n        // Fallback parsing\n      }\n    }\n  } catch (error) {\n    console.error('Content analysis error:', error);\n  }\n\n  // Fallback analysis\n  const urgencyKeywords = ['urgent', 'breaking', 'now', 'immediate', 'asap'];\n  const hasUrgency = urgencyKeywords.some(keyword => \n    content.toLowerCase().includes(keyword)\n  );\n\n  return {\n    readabilityScore: 75,\n    sentimentScore: 60,\n    urgencyLevel: hasUrgency ? 'high' : 'medium' as const,\n    recommendedFrequency: 'weekly'\n  };\n}\n\nasync function getIndustryBenchmarks(platforms: string[]) {\n  // Industry benchmark data (in production, this would come from a comprehensive database)\n  const benchmarks = {\n    twitter: {\n      optimalTimes: ['9:00 AM', '1:00 PM', '5:00 PM'],\n      avgEngagement: 1.5\n    },\n    instagram: {\n      optimalTimes: ['11:00 AM', '1:00 PM', '5:00 PM'],\n      avgEngagement: 1.8\n    },\n    linkedin: {\n      optimalTimes: ['8:00 AM', '12:00 PM', '6:00 PM'],\n      avgEngagement: 2.3\n    },\n    facebook: {\n      optimalTimes: ['9:00 AM', '3:00 PM', '7:00 PM'],\n      avgEngagement: 1.2\n    },\n    tiktok: {\n      optimalTimes: ['6:00 AM', '10:00 AM', '7:00 PM'],\n      avgEngagement: 4.2\n    }\n  };\n\n  const industryBenchmarks = platforms.map(platform => ({\n    platform,\n    optimalTimes: benchmarks[platform as keyof typeof benchmarks]?.optimalTimes || ['12:00 PM'],\n    avgEngagement: benchmarks[platform as keyof typeof benchmarks]?.avgEngagement || 1.0\n  }));\n\n  return {\n    industryBenchmarks,\n    suggestions: [\n      'Consider posting during industry peak hours for maximum reach',\n      'Cross-reference with your audience analytics for personalized timing',\n      'Test different posting times to find your optimal schedule'\n    ]\n  };\n}\n\nasync function calculateOptimalTimes(\n  platforms: string[],\n  historicalData: any,\n  audienceInsights: any,\n  contentAnalysis: any,\n  timezone: string\n): Promise<OptimalTime[]> {\n  \n  const optimalTimes: OptimalTime[] = [];\n  \n  for (const platform of platforms) {\n    // Calculate optimal time based on multiple factors\n    const baseHour = getBaseOptimalHour(platform);\n    const audienceAdjustment = getAudienceAdjustment(audienceInsights, platform);\n    const contentAdjustment = getContentAdjustment(contentAnalysis, platform);\n    \n    // Combine factors to get optimal hour\n    const optimalHour = Math.round(baseHour + audienceAdjustment + contentAdjustment);\n    const finalHour = Math.max(6, Math.min(22, optimalHour)); // Keep between 6 AM and 10 PM\n    \n    // Create datetime for next occurrence\n    const now = new Date();\n    const optimal = new Date(now);\n    optimal.setHours(finalHour, 0, 0, 0);\n    \n    // If time has passed today, schedule for tomorrow\n    if (optimal <= now) {\n      optimal.setDate(optimal.getDate() + 1);\n    }\n    \n    // Avoid weekends for professional platforms\n    if ((platform === 'linkedin') && (optimal.getDay() === 0 || optimal.getDay() === 6)) {\n      optimal.setDate(optimal.getDate() + (8 - optimal.getDay())); // Move to next Monday\n    }\n    \n    const confidence = calculateConfidence(platform, historicalData, audienceInsights);\n    const expectedEngagement = estimateEngagement(platform, finalHour, contentAnalysis);\n    \n    // Generate alternative times\n    const alternativeTimes = generateAlternativeTimes(optimal, platform, 3);\n    \n    optimalTimes.push({\n      platform,\n      datetime: optimal,\n      confidence,\n      reason: generateReason(platform, finalHour, audienceInsights, contentAnalysis),\n      expectedEngagement,\n      alternativeTimes\n    });\n  }\n  \n  return optimalTimes;\n}\n\nfunction getBaseOptimalHour(platform: string): number {\n  const baseHours = {\n    twitter: 12,\n    instagram: 13,\n    linkedin: 9,\n    facebook: 15,\n    tiktok: 19\n  };\n  \n  return baseHours[platform as keyof typeof baseHours] || 12;\n}\n\nfunction getAudienceAdjustment(audienceInsights: any, platform: string): number {\n  // Adjust based on audience peak hours\n  const peakHours = audienceInsights.peakHours;\n  if (peakHours.length === 0) return 0;\n  \n  // Use the first peak hour as primary adjustment\n  const primaryPeak = peakHours[0];\n  const baseOptimal = getBaseOptimalHour(platform);\n  \n  // Adjust towards audience peak, but not too drastically\n  const diff = primaryPeak - baseOptimal;\n  return Math.sign(diff) * Math.min(Math.abs(diff), 3); // Max 3 hour adjustment\n}\n\nfunction getContentAdjustment(contentAnalysis: any, platform: string): number {\n  let adjustment = 0;\n  \n  // Urgent content should be posted earlier\n  if (contentAnalysis.urgencyLevel === 'high') {\n    adjustment -= 2;\n  } else if (contentAnalysis.urgencyLevel === 'low') {\n    adjustment += 1;\n  }\n  \n  // Positive content performs better in afternoon/evening\n  if (contentAnalysis.sentimentScore > 70) {\n    adjustment += 1;\n  }\n  \n  return adjustment;\n}\n\nfunction calculateConfidence(platform: string, historicalData: any, audienceInsights: any): number {\n  let baseConfidence = 70; // Base confidence\n  \n  // Increase confidence if we have historical data\n  if (historicalData.posts.length > 10) {\n    baseConfidence += 15;\n  } else if (historicalData.posts.length > 5) {\n    baseConfidence += 10;\n  }\n  \n  // Increase confidence if audience insights are strong\n  if (audienceInsights.peakHours.length >= 3) {\n    baseConfidence += 10;\n  }\n  \n  return Math.min(95, baseConfidence);\n}\n\nfunction estimateEngagement(platform: string, hour: number, contentAnalysis: any): number {\n  const baseEngagement = {\n    twitter: 1.5,\n    instagram: 1.8,\n    linkedin: 2.3,\n    facebook: 1.2,\n    tiktok: 4.2\n  };\n  \n  let engagement = baseEngagement[platform as keyof typeof baseEngagement] || 1.0;\n  \n  // Adjust based on hour (peak hours get boost)\n  const peakHours = [9, 12, 17, 20];\n  if (peakHours.includes(hour)) {\n    engagement *= 1.2;\n  }\n  \n  // Adjust based on content quality\n  if (contentAnalysis.readabilityScore > 80) {\n    engagement *= 1.1;\n  }\n  \n  if (contentAnalysis.sentimentScore > 70) {\n    engagement *= 1.05;\n  }\n  \n  return Math.round(engagement * 100) / 100;\n}\n\nfunction generateAlternativeTimes(optimal: Date, platform: string, count: number) {\n  const alternatives = [];\n  \n  for (let i = 1; i <= count; i++) {\n    const alt = new Date(optimal);\n    \n    // Create alternatives: +2h, +4h, next day same time\n    if (i === 1) {\n      alt.setHours(alt.getHours() + 2);\n    } else if (i === 2) {\n      alt.setHours(alt.getHours() + 4);\n    } else {\n      alt.setDate(alt.getDate() + 1);\n    }\n    \n    alternatives.push({\n      datetime: alt,\n      confidence: Math.max(50, 85 - (i * 10)),\n      reason: `Alternative ${i}: ${i === 3 ? 'Next day' : `${i * 2}h later`} option`\n    });\n  }\n  \n  return alternatives;\n}\n\nfunction generateReason(platform: string, hour: number, audienceInsights: any, contentAnalysis: any): string {\n  const reasons = [];\n  \n  if (audienceInsights.peakHours.includes(hour)) {\n    reasons.push('matches your audience peak activity');\n  }\n  \n  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';\n  reasons.push(`${timeOfDay} posting performs well on ${platform}`);\n  \n  if (contentAnalysis.urgencyLevel === 'high') {\n    reasons.push('urgent content benefits from immediate posting');\n  }\n  \n  return reasons.join(', ');\n}\n\nfunction generateCrossPlatformStrategy(optimalTimes: OptimalTime[], platforms: string[]) {\n  // Sort platforms by optimal time\n  const sortedTimes = optimalTimes.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());\n  \n  const sequence = sortedTimes.map((time, index) => {\n    let delayMinutes = 0;\n    let reason = 'Start of sequence';\n    \n    if (index > 0) {\n      const prevTime = sortedTimes[index - 1].datetime;\n      delayMinutes = Math.round((time.datetime.getTime() - prevTime.getTime()) / (1000 * 60));\n      \n      if (delayMinutes < 30) {\n        reason = 'Quick follow-up to maintain momentum';\n      } else if (delayMinutes < 120) {\n        reason = 'Staggered timing for different audiences';\n      } else {\n        reason = 'Separate timing windows for maximum reach';\n      }\n    }\n    \n    return {\n      platform: time.platform,\n      delayMinutes,\n      reason\n    };\n  });\n  \n  const totalDuration = sequence.reduce((sum, seq) => sum + seq.delayMinutes, 0);\n  \n  return {\n    sequence,\n    totalDuration\n  };\n}\n\nasync function generateSchedulingRecommendations(\n  request: SchedulingRequest,\n  optimalTimes: OptimalTime[],\n  audienceInsights: any,\n  contentAnalysis: any\n): Promise<string[]> {\n  \n  const recommendations = [];\n  \n  // Time-based recommendations\n  const avgConfidence = optimalTimes.reduce((sum, t) => sum + t.confidence, 0) / optimalTimes.length;\n  if (avgConfidence < 70) {\n    recommendations.push('Consider building more posting history to improve scheduling accuracy');\n  }\n  \n  // Content-based recommendations\n  if (contentAnalysis.urgencyLevel === 'high') {\n    recommendations.push('This urgent content should be posted immediately across all platforms');\n  } else {\n    recommendations.push('Stagger posting across platforms for maximum reach');\n  }\n  \n  // Platform-specific recommendations\n  const hasLinkedIn = request.platforms.includes('linkedin');\n  const hasInstagram = request.platforms.includes('instagram');\n  \n  if (hasLinkedIn && hasInstagram) {\n    recommendations.push('Post to LinkedIn first for professional audience, then Instagram for broader reach');\n  }\n  \n  // Audience recommendations\n  if (audienceInsights.peakHours.length < 2) {\n    recommendations.push('Try posting at different times to identify your audience peak hours');\n  }\n  \n  // Frequency recommendations\n  if (contentAnalysis.recommendedFrequency === 'daily') {\n    recommendations.push('High-engagement content like this can be posted daily');\n  } else {\n    recommendations.push(`Based on content analysis, ${contentAnalysis.recommendedFrequency} posting is recommended`);\n  }\n  \n  // Use AI for additional creative recommendations\n  try {\n    const response = await openai.chat.completions.create({\n      model: 'gpt-3.5-turbo',\n      messages: [\n        {\n          role: 'system',\n          content: 'You are a social media scheduling expert. Provide 2-3 specific, actionable scheduling recommendations based on the provided data.'\n        },\n        {\n          role: 'user',\n          content: `Content: \"${request.content}\", Platforms: ${request.platforms.join(', ')}, Urgency: ${contentAnalysis.urgencyLevel}`\n        }\n      ],\n      temperature: 0.6,\n      max_tokens: 200\n    });\n\n    const aiRecommendations = response.choices[0].message.content;\n    if (aiRecommendations) {\n      const aiSuggestions = aiRecommendations.split('\\n')\n        .filter(s => s.trim())\n        .slice(0, 3);\n      recommendations.push(...aiSuggestions);\n    }\n  } catch (error) {\n    console.error('AI recommendations error:', error);\n  }\n  \n  return recommendations.slice(0, 8); // Limit to 8 recommendations\n}