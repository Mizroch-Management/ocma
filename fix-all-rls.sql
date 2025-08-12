-- Fix ALL RLS policies that are blocking basic functionality

-- 1. Fix organizations table - allow authenticated users to create organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to read organizations they can join
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON public.organizations;
CREATE POLICY "Authenticated users can read organizations" 
ON public.organizations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Fix organization_members table - allow users to join organizations
DROP POLICY IF EXISTS "Users can manage their memberships" ON public.organization_members;
CREATE POLICY "Users can manage their memberships" 
ON public.organization_members 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow reading memberships for organization owners
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
CREATE POLICY "Organization owners can manage members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid() 
    AND om.role = 'owner'
  )
);

-- 3. Ensure system_settings policies are comprehensive
DROP POLICY IF EXISTS "Organization members can read settings" ON public.system_settings;
DROP POLICY IF EXISTS "Organization members can manage settings" ON public.system_settings;

-- Allow organization members to read their organization's settings
CREATE POLICY "Organization members can read org settings" 
ON public.system_settings 
FOR SELECT 
USING (
  organization_id IS NULL -- Global settings
  OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = system_settings.organization_id 
    AND user_id = auth.uid()
  )
);

-- Allow organization owners/admins to manage their organization's settings
CREATE POLICY "Organization owners can manage org settings" 
ON public.system_settings 
FOR ALL 
USING (
  organization_id IS NULL -- Global settings (any authenticated user)
  OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = system_settings.organization_id 
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IS NULL -- Global settings (any authenticated user)
  OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = system_settings.organization_id 
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);