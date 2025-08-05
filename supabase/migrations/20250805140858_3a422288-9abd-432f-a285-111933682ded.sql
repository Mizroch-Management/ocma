-- Add unique constraint to prevent users from joining multiple organizations
-- First, let's check if any user is already in multiple organizations and clean up
WITH duplicate_memberships AS (
  SELECT user_id, COUNT(*) as org_count
  FROM organization_members 
  WHERE status = 'active'
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
SELECT 'Found users with multiple active memberships: ' || COUNT(*) FROM duplicate_memberships;

-- Add unique constraint to ensure one active membership per user
-- This will prevent users from being active members of multiple organizations
ALTER TABLE public.organization_members 
ADD CONSTRAINT unique_active_user_membership 
UNIQUE (user_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Update the constraint to only apply to active memberships
-- We need to drop and recreate as a partial unique index instead
ALTER TABLE public.organization_members 
DROP CONSTRAINT IF EXISTS unique_active_user_membership;

-- Create partial unique index for active memberships only
CREATE UNIQUE INDEX unique_active_user_membership 
ON public.organization_members (user_id) 
WHERE status = 'active';

-- Create policy to allow organization admins and owners to manage member roles
CREATE POLICY "Organization admins can manage member roles" 
ON public.organization_members 
FOR UPDATE 
USING (
  has_organization_role(auth.uid(), organization_id, 'owner'::organization_role) 
  OR has_organization_role(auth.uid(), organization_id, 'admin'::organization_role)
);