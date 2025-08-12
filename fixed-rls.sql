-- CORRECTED SQL - Fix RLS policies with proper syntax

-- 1. Fix organizations table - allow authenticated users to create organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to read organizations
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON public.organizations;
CREATE POLICY "Authenticated users can read organizations" 
ON public.organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Fix organization_members table
DROP POLICY IF EXISTS "Users can manage their memberships" ON public.organization_members;
CREATE POLICY "Users can manage their memberships" 
ON public.organization_members 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Make system_settings work for organization owners
DROP POLICY IF EXISTS "Organization owners can manage org settings" ON public.system_settings;
CREATE POLICY "Organization owners can manage org settings" 
ON public.system_settings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    organization_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = system_settings.organization_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    organization_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = system_settings.organization_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);