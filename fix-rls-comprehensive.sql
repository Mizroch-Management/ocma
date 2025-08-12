-- Comprehensive RLS fix for organizations, members, and settings
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================

-- Drop all existing policies on organizations
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "App owner can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create organizations
CREATE POLICY "Anyone can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view organizations they're members of OR all active organizations
CREATE POLICY "View organizations" 
ON public.organizations 
FOR SELECT 
USING (
  -- User can see organizations they're a member of
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid()
  )
  OR 
  -- All users can see active organizations (for joining)
  status = 'active'
  OR
  -- App owner can see all
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'elimizroch@gmail.com'
  )
);

-- Allow organization owners to update their organizations
CREATE POLICY "Owners can update organizations" 
ON public.organizations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- ============================================
-- 2. ORGANIZATION_MEMBERS TABLE
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can manage their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can create memberships" ON public.organization_members;

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Allow users to create their own memberships (when creating org or joining)
CREATE POLICY "Create own membership" 
ON public.organization_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Allow users to view members of organizations they belong to
CREATE POLICY "View organization members" 
ON public.organization_members 
FOR SELECT 
USING (
  -- User is a member of the same organization
  EXISTS (
    SELECT 1 FROM public.organization_members om2
    WHERE om2.organization_id = organization_members.organization_id 
    AND om2.user_id = auth.uid()
  )
  OR
  -- App owner can see all
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'elimizroch@gmail.com'
  )
);

-- Allow organization owners/admins to update members
CREATE POLICY "Manage organization members" 
ON public.organization_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om2
    WHERE om2.organization_id = organization_members.organization_id 
    AND om2.user_id = auth.uid() 
    AND om2.role IN ('owner', 'admin')
  )
);

-- Allow organization owners/admins to delete members
CREATE POLICY "Remove organization members" 
ON public.organization_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om2
    WHERE om2.organization_id = organization_members.organization_id 
    AND om2.user_id = auth.uid() 
    AND om2.role IN ('owner', 'admin')
  )
  OR
  -- Users can remove themselves
  user_id = auth.uid()
);

-- ============================================
-- 3. SYSTEM_SETTINGS TABLE
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Organization owners can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Organization owners can manage org settings" ON public.system_settings;
DROP POLICY IF EXISTS "Global settings are viewable by all" ON public.system_settings;
DROP POLICY IF EXISTS "Organization members can view their org settings" ON public.system_settings;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow organization members to view their organization's settings
CREATE POLICY "View organization settings" 
ON public.system_settings 
FOR SELECT 
USING (
  -- Global settings (no org_id)
  organization_id IS NULL
  OR
  -- User is a member of the organization
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = system_settings.organization_id 
    AND organization_members.user_id = auth.uid()
  )
  OR
  -- App owner can see all
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'elimizroch@gmail.com'
  )
);

-- Allow organization owners/admins to create settings
CREATE POLICY "Create organization settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (
  -- Must have an organization_id
  organization_id IS NOT NULL
  AND
  -- User must be owner/admin of that organization
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = system_settings.organization_id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Allow organization owners/admins to update settings
CREATE POLICY "Update organization settings" 
ON public.system_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = system_settings.organization_id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = system_settings.organization_id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Allow organization owners/admins to delete settings
CREATE POLICY "Delete organization settings" 
ON public.system_settings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = system_settings.organization_id 
    AND organization_members.user_id = auth.uid() 
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- ============================================
-- 4. VERIFY THE POLICIES
-- ============================================

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'organization_members', 'system_settings');

-- Count policies per table
SELECT 
  pc.relname as table_name,
  COUNT(pol.polname) as policy_count
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname IN ('organizations', 'organization_members', 'system_settings')
GROUP BY pc.relname
ORDER BY pc.relname;

-- Success message
SELECT 'RLS policies have been updated successfully!' as message;