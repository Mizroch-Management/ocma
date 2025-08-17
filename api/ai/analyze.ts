import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { cache } from '@/lib/cache/redis-cache';
import { withAIRetry, withRateLimitRetry } from '@/lib/error-handling/api-error-handler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface ContentAnalysisRequest {
  content: string;
  platform: string;
  contentType?: string;
  targetAudience?: string;
  metrics?: {
    impressions?: number;
    engagement?: number;
    reach?: number;
  };
}

interface AIAnalysisResult {
  contentScore: number;
  sentimentAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: string[];
  };
  readabilityScore: number;
  seoScore: number;
  platformOptimization: {
    score: number;
    recommendations: string[];
    optimalLength: number;
    hashtagSuggestions: string[];
  };
  engagementPrediction: {
    expectedEngagement: number;
    confidence: number;
    factors: string[];
  };
  audienceInsights: {
    primaryDemographic: string;
    interests: string[];
    optimalPostingTime: string;
  };
  improvementSuggestions: string[];
  competitorInsights?: {
    benchmarkScore: number;
    topPerformingElements: string[];
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

    const { content, platform, contentType, targetAudience, metrics }: ContentAnalysisRequest = req.body;

    if (!content || !platform) {
      return res.status(400).json({ error: 'Missing content or platform' });
    }

    // Check cache first
    const cached = await cache.getAIAnalysis(content, platform);
    if (cached) {
      return res.status(200).json({
        success: true,
        analysis: cached,
        cached: true,
        analyzedAt: cached.analyzedAt
      });
    }

    // Check rate limit (10 requests per minute per user)
    const rateLimitKey = `ai-analysis-rate:${user.id}`;
    
    // Perform comprehensive AI analysis with rate limiting and retry
    const analysis = await withRateLimitRetry(
      rateLimitKey,
      10, // 10 requests
      60, // per minute
      () => performContentAnalysis({
        content,
        platform,
        contentType,
        targetAudience,
        metrics
      }),
      { userId: user.id, content: content.substring(0, 100) }
    );

    // Store analysis result for future reference
    await supabase
      .from('content_analyses')
      .insert({
        user_id: user.id,
        content,
        platform,
        content_type: contentType,
        analysis_result: analysis,
        analyzed_at: new Date().toISOString()
      });

    // Cache the analysis result
    await cache.cacheAIAnalysis(content, platform, analysis);
    
    const response = {
      success: true,
      analysis,
      analyzedAt: new Date().toISOString()
    };
    
    res.status(200).json(response);

  } catch (error) {
    console.error('Content analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function performContentAnalysis(request: ContentAnalysisRequest): Promise<AIAnalysisResult> {
  const { content, platform, contentType = 'post', targetAudience = 'general', metrics } = request;

  // 1. Sentiment Analysis using OpenAI
  const sentimentAnalysis = await analyzeSentiment(content);
  
  // 2. Readability Analysis
  const readabilityScore = calculateReadabilityScore(content);
  
  // 3. SEO Score Analysis
  const seoScore = calculateSEOScore(content, platform);
  
  // 4. Platform-specific optimization
  const platformOptimization = await analyzePlatformOptimization(content, platform);
  
  // 5. Engagement prediction using AI
  const engagementPrediction = await predictEngagement(content, platform, metrics);
  
  // 6. Audience insights
  const audienceInsights = await generateAudienceInsights(content, targetAudience, platform);
  
  // 7. Generate improvement suggestions
  const improvementSuggestions = await generateImprovementSuggestions(
    content, 
    platform, 
    sentimentAnalysis, 
    readabilityScore, 
    platformOptimization
  );
  
  // 8. Calculate overall content score
  const contentScore = calculateOverallScore({
    sentiment: sentimentAnalysis.confidence,
    readability: readabilityScore,
    seo: seoScore,
    platformOptimization: platformOptimization.score,
    engagement: engagementPrediction.confidence
  });

  return {
    contentScore,
    sentimentAnalysis,
    readabilityScore,
    seoScore,
    platformOptimization,
    engagementPrediction,
    audienceInsights,
    improvementSuggestions
  };
}

async function analyzeSentiment(content: string) {
  return withAIRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze the sentiment of the given content and return a JSON response with sentiment (positive/negative/neutral), confidence (0-1), and detected emotions as an array.'
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this content: "${content}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error('No response from OpenAI');

    try {
      return JSON.parse(result);
    } catch {
      // Fallback parsing if JSON is malformed
      const sentiment = result.toLowerCase().includes('positive') ? 'positive' : 
                       result.toLowerCase().includes('negative') ? 'negative' : 'neutral';
      return {
        sentiment,
        confidence: 0.7,
        emotions: ['neutral']
      };
    }
  }, { operation: 'sentiment_analysis', content: content.substring(0, 100) });
}

function calculateReadabilityScore(content: string): number {
  const words = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).length;
  const characters = content.length;
  
  // Simple readability calculation (Flesch-Kincaid inspired)
  if (sentences === 0) return 0;
  
  const avgWordsPerSentence = words / sentences;
  const avgCharactersPerWord = characters / words;
  
  // Optimal ranges: 15-20 words per sentence, 4-6 characters per word
  const sentenceScore = Math.max(0, 100 - Math.abs(avgWordsPerSentence - 17.5) * 5);
  const wordScore = Math.max(0, 100 - Math.abs(avgCharactersPerWord - 5) * 20);
  
  return Math.round((sentenceScore + wordScore) / 2);
}

function calculateSEOScore(content: string, platform: string): number {
  let score = 0;
  const contentLower = content.toLowerCase();
  
  // Check for engagement words
  const engagementWords = ['how', 'why', 'what', 'when', 'best', 'top', 'new', 'amazing', 'incredible'];
  const foundEngagementWords = engagementWords.filter(word => contentLower.includes(word));
  score += foundEngagementWords.length * 10;
  
  // Check for hashtags (platform-specific)
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (platform === 'instagram' && hashtagCount >= 5 && hashtagCount <= 30) score += 20;
  if (platform === 'twitter' && hashtagCount >= 1 && hashtagCount <= 3) score += 20;
  if (platform === 'linkedin' && hashtagCount >= 3 && hashtagCount <= 5) score += 20;
  
  // Check for mentions
  const mentionCount = (content.match(/@\w+/g) || []).length;
  if (mentionCount > 0 && mentionCount <= 3) score += 10;
  
  // Check for call-to-action
  const ctaWords = ['comment', 'share', 'like', 'follow', 'subscribe', 'click', 'learn more', 'read more'];
  const hasCTA = ctaWords.some(word => contentLower.includes(word));
  if (hasCTA) score += 15;
  
  // Check for emojis
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
  if (emojiCount > 0 && emojiCount <= 5) score += 10;
  
  return Math.min(100, score);
}

async function analyzePlatformOptimization(content: string, platform: string) {
  const platformRules = {
    twitter: { optimalLength: 280, maxHashtags: 3 },
    instagram: { optimalLength: 2200, maxHashtags: 30 },
    linkedin: { optimalLength: 1300, maxHashtags: 5 },
    facebook: { optimalLength: 500, maxHashtags: 2 },
    tiktok: { optimalLength: 150, maxHashtags: 5 }
  };
  
  const rules = platformRules[platform as keyof typeof platformRules] || platformRules.twitter;
  const currentLength = content.length;
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  
  let score = 100;
  const recommendations: string[] = [];
  
  // Length optimization
  if (currentLength > rules.optimalLength * 1.2) {
    score -= 20;
    recommendations.push(`Content is too long. Consider reducing to under ${rules.optimalLength} characters.`);
  } else if (currentLength < rules.optimalLength * 0.3) {
    score -= 15;
    recommendations.push(`Content might be too short. Consider expanding to ${Math.round(rules.optimalLength * 0.5)}-${rules.optimalLength} characters.`);
  }
  
  // Hashtag optimization
  if (hashtagCount > rules.maxHashtags) {
    score -= 15;
    recommendations.push(`Too many hashtags. ${platform} performs best with ${rules.maxHashtags} or fewer hashtags.`);
  } else if (hashtagCount === 0 && platform !== 'facebook') {
    score -= 10;
    recommendations.push(`Consider adding 1-${rules.maxHashtags} relevant hashtags to increase discoverability.`);
  }
  
  // Platform-specific recommendations
  if (platform === 'twitter') {
    if (!content.includes('@') && !content.includes('#')) {
      recommendations.push('Consider adding mentions or hashtags to increase engagement.');
    }
  } else if (platform === 'instagram') {
    if (!content.includes('#')) {
      recommendations.push('Instagram posts perform better with hashtags. Consider adding 5-10 relevant hashtags.');
    }
  } else if (platform === 'linkedin') {
    if (!content.includes('?') && !content.toLowerCase().includes('thought')) {
      recommendations.push('LinkedIn posts perform well with questions or professional insights.');
    }
  }
  
  // Generate hashtag suggestions using AI
  const hashtagSuggestions = await generateHashtagSuggestions(content, platform);
  
  return {
    score: Math.max(0, score),
    recommendations,
    optimalLength: rules.optimalLength,
    hashtagSuggestions
  };
}

async function generateHashtagSuggestions(content: string, platform: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a social media expert. Generate relevant hashtags for ${platform} based on the content. Return only a JSON array of hashtag strings without the # symbol.`
        },
        {
          role: 'user',
          content: `Generate 5-10 relevant hashtags for this ${platform} content: "${content}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const result = response.choices[0].message.content;
    if (!result) return [];

    try {
      const hashtags = JSON.parse(result);
      return Array.isArray(hashtags) ? hashtags.slice(0, 10) : [];
    } catch {
      // Fallback: extract hashtags from text response
      const matches = result.match(/\b\w+\b/g) || [];
      return matches.slice(0, 10);
    }
  } catch (error) {
    console.error('Hashtag generation error:', error);
    return ['content', 'social', 'engagement'];
  }
}

async function predictEngagement(content: string, platform: string, metrics?: any) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a social media analytics expert. Predict the engagement rate for content on ${platform}. Consider factors like content quality, platform best practices, and current trends. Return a JSON object with expectedEngagement (percentage), confidence (0-1), and factors (array of strings explaining the prediction).`
        },
        {
          role: 'user',
          content: `Predict engagement for this ${platform} content: "${content}"${metrics ? ` Previous metrics: ${JSON.stringify(metrics)}` : ''}`
        }
      ],
      temperature: 0.3,
      max_tokens: 250
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error('No response from OpenAI');

    try {
      return JSON.parse(result);
    } catch {
      return {
        expectedEngagement: 3.5,
        confidence: 0.7,
        factors: ['Content quality analysis', 'Platform optimization', 'Industry benchmarks']
      };
    }
  } catch (error) {
    console.error('Engagement prediction error:', error);
    return {
      expectedEngagement: 3.0,
      confidence: 0.6,
      factors: ['Baseline prediction due to analysis error']
    };
  }
}

async function generateAudienceInsights(content: string, targetAudience: string, platform: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an audience analysis expert. Analyze content to determine the primary demographic, interests, and optimal posting time for ${platform}. Return a JSON object with primaryDemographic, interests (array), and optimalPostingTime.`
        },
        {
          role: 'user',
          content: `Analyze audience insights for this content on ${platform}: "${content}" Target audience: ${targetAudience}`
        }
      ],
      temperature: 0.4,
      max_tokens: 200
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error('No response from OpenAI');

    try {
      return JSON.parse(result);
    } catch {
      return {
        primaryDemographic: '25-34 professionals',
        interests: ['business', 'technology', 'productivity'],
        optimalPostingTime: '9:00 AM weekdays'
      };
    }
  } catch (error) {
    console.error('Audience insights error:', error);
    return {
      primaryDemographic: 'General audience',
      interests: ['general interest'],
      optimalPostingTime: '12:00 PM'
    };
  }
}

async function generateImprovementSuggestions(
  content: string,
  platform: string,
  sentiment: any,
  readability: number,
  platformOpt: any
): Promise<string[]> {
  const suggestions: string[] = [];
  
  // Sentiment-based suggestions
  if (sentiment.sentiment === 'negative') {
    suggestions.push('Consider adding more positive language to improve audience reception.');
  }
  
  // Readability suggestions
  if (readability < 60) {
    suggestions.push('Simplify language and shorten sentences for better readability.');
  }
  
  // Platform-specific suggestions
  suggestions.push(...platformOpt.recommendations);
  
  // Add AI-generated creative suggestions
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a creative content strategist. Provide 2-3 specific, actionable suggestions to improve this social media content. Focus on engagement, clarity, and platform best practices.'
        },
        {
          role: 'user',
          content: `Improve this ${platform} content: "${content}"`
        }
      ],
      temperature: 0.6,
      max_tokens: 200
    });

    const result = response.choices[0].message.content;
    if (result) {
      const aiSuggestions = result.split('\n').filter(s => s.trim()).slice(0, 3);
      suggestions.push(...aiSuggestions);
    }
  } catch (error) {
    console.error('AI suggestions error:', error);
  }
  
  return suggestions.slice(0, 8); // Limit to 8 suggestions
}

function calculateOverallScore(scores: Record<string, number>): number {
  const weights = {
    sentiment: 0.2,
    readability: 0.2,
    seo: 0.2,
    platformOptimization: 0.25,
    engagement: 0.15
  };
  
  let totalScore = 0;
  for (const [key, value] of Object.entries(scores)) {
    const weight = weights[key as keyof typeof weights] || 0;
    totalScore += (value / 100) * weight * 100;
  }
  
  return Math.round(Math.min(100, Math.max(0, totalScore)));
}