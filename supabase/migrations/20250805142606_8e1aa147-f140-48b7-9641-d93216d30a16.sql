-- Fix the existing RLS policy that has a bug and add policy for viewing organizations to join
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;

-- Create corrected policy for organization members
CREATE POLICY "Organization members can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
  )
);

-- Add policy to allow authenticated users to view all active organizations (needed for joining)
CREATE POLICY "Authenticated users can view active organizations for joining" 
ON public.organizations 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND status = 'active'
);