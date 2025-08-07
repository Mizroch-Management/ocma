-- Performance Optimization: Add Critical Missing Indexes
-- Phase 2: Database Query Optimization
-- Created: 2025-08-07

-- Organization members indexes (highest priority)
-- These are critical for RLS policies and organization-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_org_id 
ON public.organization_members(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_user_id 
ON public.organization_members(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_org_user 
ON public.organization_members(organization_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_status 
ON public.organization_members(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_org_status 
ON public.organization_members(organization_id, status);

-- Generated content indexes
-- Critical for dashboard, analytics, and content management queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_org_id 
ON public.generated_content(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_user_id 
ON public.generated_content(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_created_at 
ON public.generated_content(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_org_created 
ON public.generated_content(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_publication_status 
ON public.generated_content(publication_status);

-- Composite index for common dashboard and analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_org_status_created 
ON public.generated_content(organization_id, publication_status, created_at DESC);

-- Publication logs indexes
-- Critical for analytics and performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_logs_content_id 
ON public.publication_logs(content_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_logs_created_at 
ON public.publication_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_logs_platform 
ON public.publication_logs(platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_logs_status 
ON public.publication_logs(status);

-- Composite index for analytics joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_logs_content_created 
ON public.publication_logs(content_id, created_at DESC, status);

-- Team management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invitations_org_id 
ON public.team_invitations(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invitations_status 
ON public.team_invitations(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invitations_expires_at 
ON public.team_invitations(expires_at);

-- Profile optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(user_id);

-- Workflows optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_id 
ON public.workflows(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_updated 
ON public.workflows(organization_id, updated_at DESC);

-- Add index for scheduled content queries (filtered index for better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_scheduled_org 
ON public.generated_content(organization_id, scheduled_date) 
WHERE is_scheduled = true;

-- Add index for system_settings organization queries (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_org_id 
ON public.system_settings(organization_id);

-- Comment explaining the performance improvements
COMMENT ON INDEX idx_organization_members_org_id IS 'Critical for RLS policies and organization filtering';
COMMENT ON INDEX idx_generated_content_org_status_created IS 'Composite index for dashboard queries';
COMMENT ON INDEX idx_publication_logs_content_created IS 'Optimizes analytics join queries';
COMMENT ON INDEX idx_generated_content_scheduled_org IS 'Filtered index for scheduled content queries only';