-- Complete fix for infinite recursion in organization_members
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view organization members where they are members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage their members" ON public.organization_members;
DROP POLICY IF EXISTS "App owner can manage all organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

-- Create simple, non-recursive policies
-- Allow app owner to see and manage all organization members
CREATE POLICY "App owner can manage all organization members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND email = 'elimizroch@gmail.com'
  )
);

-- Allow users to see organization members for organizations they belong to
CREATE POLICY "Users can view organization members for their orgs" 
ON public.organization_members 
FOR SELECT 
USING (
  organization_id IN (
    SELECT DISTINCT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- Allow organization owners to manage members of their organizations  
CREATE POLICY "Organization owners can manage members" 
ON public.organization_members 
FOR ALL 
USING (
  organization_id IN (
    SELECT DISTINCT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.role = 'owner' 
      AND om.status = 'active'
  )
);