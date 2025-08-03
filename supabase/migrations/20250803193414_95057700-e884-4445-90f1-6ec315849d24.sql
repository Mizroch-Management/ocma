-- Fix the infinite recursion in organization member policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their organization members" ON public.organization_members;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view organization members where they are members" 
ON public.organization_members 
FOR SELECT 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
  )
);