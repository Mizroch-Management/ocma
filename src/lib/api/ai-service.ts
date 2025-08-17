// Real AI Service Integration
import { Configuration, OpenAIApi } from 'openai';

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  readabilityScore: number;
  engagementScore: number;
  keywords: string[];
  suggestions: string[];
  platformOptimizations: Record<string, string>;
}

export interface SchedulingInsight {
  optimalTimes: Array<{
    time: string;
    score: number;
    reason: string;
  }>;
  audienceActivity: Array<{
    hour: number;
    activity: number;
  }>;
  competitionAnalysis: {
    level: 'low' | 'medium' | 'high';
    bestGaps: string[];
  };
}

export class AIService {
  private openai: OpenAIApi;
  private apiKey: string;

  constructor(apiKey: string = process.env.OPENAI_API_KEY!) {
    this.apiKey = apiKey;
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  async analyzeContent(content: string, platform: string): Promise<ContentAnalysis> {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a social media content analyzer. Analyze the following content for ${platform} and provide detailed insights in JSON format.`,
          },
          {
            role: 'user',
            content: `Analyze this content: "${content}"
            
            Return a JSON object with:
            - sentiment: "positive", "negative", or "neutral"
            - readabilityScore: 0-100
            - engagementScore: 0-100
            - keywords: array of key terms
            - suggestions: array of improvement suggestions
            - platformOptimizations: object with platform-specific versions`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const result = JSON.parse(response.data.choices[0].message?.content || '{}');
      
      return {
        sentiment: result.sentiment || 'neutral',
        readabilityScore: result.readabilityScore || 75,
        engagementScore: result.engagementScore || 70,
        keywords: result.keywords || [],
        suggestions: result.suggestions || [],
        platformOptimizations: result.platformOptimizations || {},
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fallback to basic analysis
      return this.basicContentAnalysis(content);
    }
  }

  private basicContentAnalysis(content: string): ContentAnalysis {
    // Basic analysis without AI
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const readability = Math.min(100, Math.max(0, 100 - (words / sentences - 15) * 5));
    
    const positiveWords = ['great', 'amazing', 'excellent', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor'];
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    const lowerContent = content.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    return {
      sentiment,
      readabilityScore: readability,
      engagementScore: 65 + (sentiment === 'positive' ? 10 : sentiment === 'negative' ? -10 : 0),
      keywords: this.extractKeywords(content),
      suggestions: this.generateSuggestions(content),
      platformOptimizations: this.optimizeForPlatforms(content),
    };
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but']);
    
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private generateSuggestions(content: string): string[] {
    const suggestions = [];
    
    if (content.length < 50) {
      suggestions.push('Consider adding more detail to your content');
    }
    if (content.length > 280) {
      suggestions.push('Content may be too long for Twitter');
    }
    if (!content.includes('#')) {
      suggestions.push('Add relevant hashtags to increase discoverability');
    }
    if (!content.includes('?') && !content.includes('!')) {
      suggestions.push('Consider adding a question or call-to-action');
    }
    if (!/[😀-🙏]|[\u{1F300}-\u{1F9FF}]/u.test(content)) {
      suggestions.push('Consider adding emojis to increase engagement');
    }
    
    return suggestions;
  }

  private optimizeForPlatforms(content: string): Record<string, string> {
    return {
      twitter: content.length > 280 ? content.substring(0, 277) + '...' : content,
      instagram: content + '\n\n#socialmedia #marketing #content',
      linkedin: `💡 ${content}\n\nWhat are your thoughts on this?`,
      facebook: content,
    };
  }

  async generateContent(
    prompt: string,
    platform: string,
    tone: string = 'professional'
  ): Promise<string[]> {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a social media content creator specializing in ${platform}. Generate engaging content in a ${tone} tone.`,
          },
          {
            role: 'user',
            content: `Create 3 variations of content based on this prompt: "${prompt}"
            
            Requirements:
            - Optimized for ${platform}
            - ${tone} tone
            - Include relevant hashtags
            - Engaging and shareable`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
        n: 1,
      });

      const content = response.data.choices[0].message?.content || '';
      // Split variations by double newline or numbered list
      const variations = content.split(/\n\n|\d+\.\s+/).filter(v => v.trim());
      
      return variations.length > 0 ? variations : [content];
    } catch (error) {
      console.error('Content generation failed:', error);
      // Fallback to template-based generation
      return this.generateTemplateContent(prompt, platform, tone);
    }
  }

  private generateTemplateContent(
    prompt: string,
    platform: string,
    tone: string
  ): string[] {
    const templates = {
      twitter: [
        `${prompt} 🚀 What do you think? #thoughts #discussion`,
        `Just discovered: ${prompt} 💡 Share your experience! #community`,
        `Hot take: ${prompt} 🔥 Agree or disagree? #debate`,
      ],
      instagram: [
        `✨ ${prompt} ✨\n\n#instagram #instagood #photooftheday`,
        `${prompt} 📸\n\nDouble tap if you agree! ❤️\n\n#motivation #inspiration`,
        `Story time: ${prompt} 🌟\n\n#storytime #viral #trending`,
      ],
      linkedin: [
        `Industry insight: ${prompt}\n\nWhat's your perspective on this?`,
        `Professional tip: ${prompt}\n\nConnect with me for more insights!`,
        `Thought leadership: ${prompt}\n\nLet's discuss in the comments!`,
      ],
      facebook: [
        `${prompt} 😊\n\nWhat are your thoughts, friends?`,
        `Sharing something important: ${prompt}\n\nPlease share if you agree!`,
        `${prompt} 💭\n\nTag someone who needs to see this!`,
      ],
    };

    const platformTemplates = templates[platform as keyof typeof templates] || templates.twitter;
    return platformTemplates.map(template => 
      tone === 'casual' ? template.replace(/Industry insight:|Professional tip:|Thought leadership:/, '') : template
    );
  }

  async analyzeOptimalSchedule(
    historicalData: Array<{ time: Date; engagement: number }>,
    platform: string
  ): Promise<SchedulingInsight> {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a social media scheduling expert. Analyze posting data and provide optimal scheduling insights.',
          },
          {
            role: 'user',
            content: `Analyze this historical posting data for ${platform}: ${JSON.stringify(historicalData)}
            
            Return a JSON object with:
            - optimalTimes: array of {time: "HH:MM", score: 0-100, reason: string}
            - audienceActivity: array of {hour: 0-23, activity: 0-100}
            - competitionAnalysis: {level: "low/medium/high", bestGaps: array of time strings}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      const result = JSON.parse(response.data.choices[0].message?.content || '{}');
      return result as SchedulingInsight;
    } catch (error) {
      console.error('Schedule analysis failed:', error);
      // Fallback to statistical analysis
      return this.statisticalScheduleAnalysis(historicalData);
    }
  }

  private statisticalScheduleAnalysis(
    historicalData: Array<{ time: Date; engagement: number }>
  ): SchedulingInsight {
    // Group by hour and calculate average engagement
    const hourlyEngagement = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    historicalData.forEach(post => {
      const hour = new Date(post.time).getHours();
      hourlyEngagement[hour] += post.engagement;
      hourlyCounts[hour]++;
    });
    
    const audienceActivity = hourlyEngagement.map((total, hour) => ({
      hour,
      activity: hourlyCounts[hour] > 0 ? (total / hourlyCounts[hour]) : 0,
    }));
    
    // Find top 3 hours
    const sortedHours = [...audienceActivity]
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 3);
    
    const optimalTimes = sortedHours.map(({ hour, activity }) => ({
      time: `${hour.toString().padStart(2, '0')}:00`,
      score: Math.min(100, activity * 10),
      reason: `High engagement historically at ${hour}:00`,
    }));
    
    // Simple competition analysis
    const avgActivity = audienceActivity.reduce((sum, { activity }) => sum + activity, 0) / 24;
    const competitionLevel = avgActivity > 50 ? 'high' : avgActivity > 25 ? 'medium' : 'low';
    
    const bestGaps = audienceActivity
      .filter(({ activity }) => activity < avgActivity * 0.5)
      .map(({ hour }) => `${hour}:00`);
    
    return {
      optimalTimes,
      audienceActivity,
      competitionAnalysis: {
        level: competitionLevel as 'low' | 'medium' | 'high',
        bestGaps,
      },
    };
  }

  async optimizeContent(
    content: string,
    platform: string,
    targetMetrics: { engagement?: number; reach?: number }
  ): Promise<string> {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a content optimization expert for ${platform}. Optimize content for maximum engagement.`,
          },
          {
            role: 'user',
            content: `Optimize this content for ${platform}: "${content}"
            
            Target metrics: ${JSON.stringify(targetMetrics)}
            
            Requirements:
            - Maintain the core message
            - Add engagement elements (questions, CTAs, emojis)
            - Include relevant hashtags
            - Optimize length for platform
            - Return only the optimized content`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.data.choices[0].message?.content || content;
    } catch (error) {
      console.error('Content optimization failed:', error);
      // Fallback to rule-based optimization
      return this.ruleBasedOptimization(content, platform);
    }
  }

  private ruleBasedOptimization(content: string, platform: string): string {
    let optimized = content;
    
    // Platform-specific optimizations
    switch (platform) {
      case 'twitter':
        if (optimized.length > 250) {
          optimized = optimized.substring(0, 247) + '...';
        }
        if (!optimized.includes('#')) {
          optimized += ' #trending';
        }
        break;
        
      case 'instagram':
        if (!optimized.includes('#')) {
          optimized += '\n\n#instagood #photooftheday #love #instadaily';
        }
        if (!optimized.includes('📸') && !optimized.includes('✨')) {
          optimized = '✨ ' + optimized;
        }
        break;
        
      case 'linkedin':
        if (!optimized.includes('?')) {
          optimized += '\n\nWhat are your thoughts on this?';
        }
        break;
        
      case 'facebook':
        if (!optimized.includes('👍') && !optimized.includes('❤️')) {
          optimized += ' 👍';
        }
        break;
    }
    
    return optimized;
  }
}

export const aiService = new AIService();