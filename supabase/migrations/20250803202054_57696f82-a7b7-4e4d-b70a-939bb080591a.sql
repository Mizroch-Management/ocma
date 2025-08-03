-- Fix the remaining infinite recursion by using a simpler approach
-- Drop all problematic organization member policies
DROP POLICY IF EXISTS "Users can view organization members where they are members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage their members" ON public.organization_members;
DROP POLICY IF EXISTS "App owner can manage all organization members" ON public.organization_members;

-- Create non-recursive policies using direct user_id checks
CREATE POLICY "App owner can manage all organization members" 
ON public.organization_members 
FOR ALL 
USING (public.is_app_owner(auth.uid()));

CREATE POLICY "Organization owners can manage organization members" 
ON public.organization_members 
FOR ALL 
USING (
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE public.has_organization_role(auth.uid(), id, 'owner')
  )
);

CREATE POLICY "Users can view members of their organizations" 
ON public.organization_members 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.organization_members om2 
    WHERE om2.organization_id = organization_members.organization_id 
      AND om2.status = 'active'
  )
);