import { z } from 'zod';

// Content creation validation
export const contentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .transform(str => str.trim()),
  
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must not exceed 10,000 characters'),
  
  platforms: z
    .array(z.enum(['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok']))
    .min(1, 'At least one platform must be selected')
    .max(6, 'Maximum 6 platforms allowed'),
  
  contentType: z.enum(['post', 'article', 'video', 'image', 'story'], {
    errorMap: () => ({ message: 'Invalid content type' })
  }),
  
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  
  scheduledDate: z
    .date()
    .min(new Date(), 'Scheduled date must be in the future')
    .optional(),
  
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  
  hashtags: z
    .array(z.string().regex(/^#[a-zA-Z0-9_]+$/, 'Invalid hashtag format'))
    .max(30, 'Maximum 30 hashtags allowed')
    .optional(),
  
  targetAudience: z
    .string()
    .max(200, 'Target audience description is too long')
    .optional(),
  
  callToAction: z
    .string()
    .max(100, 'Call to action is too long')
    .optional(),
  
  metadata: z.record(z.any()).optional()
});

// AI prompt validation for content generation
export const aiPromptSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(2000, 'Prompt must not exceed 2000 characters'),
  
  tone: z.enum([
    'professional', 'casual', 'friendly', 'formal', 'humorous', 
    'inspirational', 'educational', 'promotional'
  ]).optional(),
  
  style: z.enum([
    'concise', 'detailed', 'storytelling', 'listicle', 
    'question', 'how-to', 'news', 'opinion'
  ]).optional(),
  
  targetLength: z.enum(['short', 'medium', 'long']).default('medium'),
  
  includeHashtags: z.boolean().default(true),
  includeCallToAction: z.boolean().default(true),
  
  context: z
    .string()
    .max(1000, 'Context must not exceed 1000 characters')
    .optional()
});

// Content scheduling validation
export const contentScheduleSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
  scheduledDate: z.date().min(new Date(), 'Cannot schedule content in the past'),
  timezone: z.string().default('UTC'),
  platforms: z.array(z.string()).min(1, 'At least one platform required'),
  autoPost: z.boolean().default(false),
  notifyOnPublish: z.boolean().default(true)
});

// Content analytics validation
export const contentAnalyticsSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
  platform: z.string(),
  impressions: z.number().min(0),
  engagement: z.number().min(0),
  clicks: z.number().min(0),
  shares: z.number().min(0),
  comments: z.number().min(0),
  likes: z.number().min(0),
  recordedAt: z.date().default(new Date())
});

export type Content = z.infer<typeof contentSchema>;
export type AIPrompt = z.infer<typeof aiPromptSchema>;
export type ContentSchedule = z.infer<typeof contentScheduleSchema>;
export type ContentAnalytics = z.infer<typeof contentAnalyticsSchema>;