import { z } from 'zod';

// Team member invitation validation
export const teamInvitationSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long')
    .toLowerCase(),
  
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' })
  }).default('member'),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .optional(),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .optional(),
  
  customMessage: z
    .string()
    .max(500, 'Custom message is too long')
    .optional()
    .or(z.literal('')),
  
  permissions: z.array(z.enum([
    'create_content', 'edit_content', 'delete_content', 'schedule_content',
    'view_analytics', 'manage_team', 'manage_settings', 'manage_billing'
  ])).optional(),
  
  departments: z.array(z.string().max(100)).max(5, 'Maximum 5 departments allowed').optional(),
  
  expiresAt: z
    .date()
    .min(new Date(), 'Expiration date must be in the future')
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Invitation cannot expire more than 30 days from now')
    .optional()
});

// Team member profile validation
export const teamMemberProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  
  jobTitle: z
    .string()
    .max(100, 'Job title is too long')
    .optional()
    .or(z.literal('')),
  
  department: z
    .string()
    .max(100, 'Department name is too long')
    .optional()
    .or(z.literal('')),
  
  bio: z
    .string()
    .max(500, 'Bio is too long')
    .optional()
    .or(z.literal('')),
  
  skills: z
    .array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 skills allowed')
    .optional(),
  
  timezone: z
    .string()
    .max(50, 'Timezone is invalid')
    .optional(),
  
  avatar: z
    .string()
    .url('Invalid avatar URL')
    .optional(),
  
  socialProfiles: z.object({
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional()
  }).optional()
});

// Team role update validation
export const teamRoleUpdateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  newRole: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be owner, admin, or member' })
  }),
  reason: z
    .string()
    .max(200, 'Reason is too long')
    .optional()
    .or(z.literal(''))
});

// Team settings validation
export const teamSettingsSchema = z.object({
  allowMemberInvites: z.boolean().default(false),
  requireApprovalForContent: z.boolean().default(true),
  allowContentCollaboration: z.boolean().default(true),
  defaultMemberPermissions: z.array(z.string()).default([]),
  maxTeamSize: z.number().min(1).max(1000).default(50),
  invitationExpiryDays: z.number().min(1).max(30).default(7)
});

export type TeamInvitation = z.infer<typeof teamInvitationSchema>;
export type TeamMemberProfile = z.infer<typeof teamMemberProfileSchema>;
export type TeamRoleUpdate = z.infer<typeof teamRoleUpdateSchema>;
export type TeamSettings = z.infer<typeof teamSettingsSchema>;