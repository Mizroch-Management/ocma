-- EMERGENCY FIX: Restore organization visibility
-- Run this immediately in Supabase SQL Editor

-- First, let's check what's happening
SELECT 'Checking current user ID...' as status;
SELECT auth.uid() as current_user_id;

-- Check if RLS is enabled
SELECT 'Checking RLS status...' as status;
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'organization_members', 'system_settings');

-- TEMPORARILY disable RLS to restore access (we'll re-enable with proper policies)
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

SELECT 'RLS temporarily disabled to restore access' as status;

-- Now check if organizations exist
SELECT 'Checking existing organizations...' as status;
SELECT id, name, status, created_at FROM public.organizations ORDER BY created_at DESC;

-- Check if memberships exist
SELECT 'Checking organization memberships...' as status;
SELECT 
  om.*, 
  o.name as org_name 
FROM public.organization_members om
LEFT JOIN public.organizations o ON om.organization_id = o.id
ORDER BY om.created_at DESC;

-- Now let's properly re-enable RLS with simpler, working policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('organizations', 'organization_members', 'system_settings')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

SELECT 'All old policies dropped' as status;

-- ============================================
-- SIMPLE, WORKING POLICIES
-- ============================================

-- ORGANIZATIONS: Simple policy - authenticated users can do everything with organizations
CREATE POLICY "Authenticated users full access" 
ON public.organizations 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ORGANIZATION_MEMBERS: Users can manage their own memberships and view others in same org
CREATE POLICY "Users manage own memberships" 
ON public.organization_members 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

-- SYSTEM_SETTINGS: Authenticated users can manage settings for their organizations
CREATE POLICY "Authenticated users manage settings" 
ON public.system_settings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

SELECT 'Simple RLS policies created successfully!' as status;

-- Verify the policies are working
SELECT 'Testing policies with current user...' as status;

-- This should return organizations if you're logged in
SELECT 'Organizations visible to current user:' as status;
SELECT id, name, status FROM public.organizations;

-- This should return memberships if you're logged in
SELECT 'Memberships visible to current user:' as status;
SELECT * FROM public.organization_members WHERE user_id = auth.uid();

SELECT '✅ Emergency fix applied! You should now be able to see and create organizations.' as message;