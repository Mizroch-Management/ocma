import { z } from 'zod';

// Organization creation validation
export const organizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, 'Organization name contains invalid characters'),
  
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  
  settings: z.object({
    allowPublicJoining: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    maxMembers: z.number().min(1).max(1000).default(50),
    defaultMemberRole: z.enum(['member', 'admin']).default('member')
  }).optional()
});

// Organization member validation
export const organizationMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  organizationId: z.string().uuid('Invalid organization ID format'),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be owner, admin, or member' })
  }),
  status: z.enum(['active', 'pending', 'suspended']).default('pending')
});

// Organization search validation
export const organizationSearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query is too long')
    .transform(str => str.trim()),
  
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10),
  
  offset: z
    .number()
    .min(0, 'Offset cannot be negative')
    .default(0)
});

// Organization invitation validation
export const organizationInvitationSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long')
    .toLowerCase(),
  
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Invitation role must be admin or member' })
  }).default('member'),
  
  message: z
    .string()
    .max(500, 'Invitation message must not exceed 500 characters')
    .optional()
    .or(z.literal(''))
});

export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type OrganizationSearch = z.infer<typeof organizationSearchSchema>;
export type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>;