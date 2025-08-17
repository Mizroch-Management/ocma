-- Comprehensive RLS Fix Migration
-- This migration consolidates and fixes all RLS policies

-- First, drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posted_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_data ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Organization members can view"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can update"
    ON organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role = 'owner'
        )
    );

CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members policies
CREATE POLICY "Members can view own organization members"
    ON organization_members FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage members"
    ON organization_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role = 'owner'
        )
    );

-- Workspaces policies
CREATE POLICY "Workspace members can view"
    ON workspaces FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can manage workspaces"
    ON workspaces FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = workspaces.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Social connections policies
CREATE POLICY "Users can view own connections"
    ON social_connections FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own connections"
    ON social_connections FOR ALL
    USING (user_id = auth.uid());

-- Scheduled posts policies
CREATE POLICY "Users can view own scheduled posts"
    ON scheduled_posts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own scheduled posts"
    ON scheduled_posts FOR ALL
    USING (user_id = auth.uid());

-- Posted content policies
CREATE POLICY "Users can view own posted content"
    ON posted_content FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own posted content"
    ON posted_content FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- AI usage policies
CREATE POLICY "Users can view own AI usage"
    ON ai_usage FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can insert AI usage"
    ON ai_usage FOR INSERT
    WITH CHECK (true); -- Service role will handle this

-- OAuth states policies (temporary states for OAuth flows)
CREATE POLICY "OAuth states are public during flow"
    ON oauth_states FOR ALL
    USING (true); -- These are temporary and cleaned up after use

-- System settings policies
CREATE POLICY "Users can view own settings"
    ON system_settings FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own settings"
    ON system_settings FOR ALL
    USING (user_id = auth.uid());

-- AI platforms policies
CREATE POLICY "Users can view own AI platforms"
    ON ai_platforms FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own AI platforms"
    ON ai_platforms FOR ALL
    USING (user_id = auth.uid());

-- Social media platforms policies
CREATE POLICY "Users can view own social platforms"
    ON social_media_platforms FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own social platforms"
    ON social_media_platforms FOR ALL
    USING (user_id = auth.uid());

-- Generated content policies
CREATE POLICY "Users can view own generated content"
    ON generated_content FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own generated content"
    ON generated_content FOR ALL
    USING (user_id = auth.uid());

-- Workflow data policies
CREATE POLICY "Users can view own workflow data"
    ON workflow_data FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own workflow data"
    ON workflow_data FOR ALL
    USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id 
    ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id 
    ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_org_id 
    ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id 
    ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id 
    ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posted_content_user_id 
    ON posted_content(user_id);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;