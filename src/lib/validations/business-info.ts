import { z } from 'zod';

// Business Information Validation Schema
export const businessInfoSchema = z.object({
  company: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, 'Company name contains invalid characters'),
  
  industry: z
    .string()
    .min(2, 'Industry must be at least 2 characters')
    .max(50, 'Industry must not exceed 50 characters'),
  
  productService: z
    .string()
    .min(10, 'Product/Service description must be at least 10 characters')
    .max(500, 'Product/Service description must not exceed 500 characters'),
  
  primaryObjectives: z
    .string()
    .min(10, 'Primary objectives must be at least 10 characters')
    .max(1000, 'Primary objectives must not exceed 1000 characters'),
  
  targetAudience: z
    .string()
    .min(10, 'Target audience must be at least 10 characters')
    .max(500, 'Target audience must not exceed 500 characters'),
  
  targetMarkets: z
    .string()
    .min(2, 'Target markets must be at least 2 characters')
    .max(200, 'Target markets must not exceed 200 characters'),
  
  budget: z
    .string()
    .min(1, 'Budget information is required')
    .max(100, 'Budget information must not exceed 100 characters'),
  
  uniqueSellingPoints: z
    .string()
    .min(10, 'Unique selling points must be at least 10 characters')
    .max(500, 'Unique selling points must not exceed 500 characters'),
  
  competitors: z
    .string()
    .min(2, 'Competitors information must be at least 2 characters')
    .max(300, 'Competitors information must not exceed 300 characters'),
  
  brandPersonality: z
    .string()
    .min(5, 'Brand personality must be at least 5 characters')
    .max(200, 'Brand personality must not exceed 200 characters'),
  
  keyMetrics: z
    .string()
    .min(5, 'Key metrics must be at least 5 characters')
    .max(300, 'Key metrics must not exceed 300 characters'),
  
  additionalContext: z
    .string()
    .max(1000, 'Additional context must not exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  
  teamMembers: z
    .array(z.string().min(1, 'Team member description cannot be empty').max(200))
    .min(1, 'At least one team member is required')
    .max(10, 'Maximum 10 team members allowed'),
  
  uploadedFiles: z
    .array(z.object({
      id: z.string(),
      name: z.string(),
      size: z.number(),
      type: z.string(),
      url: z.string(),
      thumbnailUrl: z.string().optional(),
      uploadedAt: z.date()
    }))
    .optional()
    .default([])
});

// Individual field validation for real-time feedback
export const businessInfoFieldSchemas = {
  company: businessInfoSchema.shape.company,
  industry: businessInfoSchema.shape.industry,
  productService: businessInfoSchema.shape.productService,
  primaryObjectives: businessInfoSchema.shape.primaryObjectives,
  targetAudience: businessInfoSchema.shape.targetAudience,
  targetMarkets: businessInfoSchema.shape.targetMarkets,
  budget: businessInfoSchema.shape.budget,
  uniqueSellingPoints: businessInfoSchema.shape.uniqueSellingPoints,
  competitors: businessInfoSchema.shape.competitors,
  brandPersonality: businessInfoSchema.shape.brandPersonality,
  keyMetrics: businessInfoSchema.shape.keyMetrics,
  additionalContext: businessInfoSchema.shape.additionalContext,
  teamMembers: businessInfoSchema.shape.teamMembers,
  uploadedFiles: businessInfoSchema.shape.uploadedFiles,
};

export type BusinessInfo = z.infer<typeof businessInfoSchema>;