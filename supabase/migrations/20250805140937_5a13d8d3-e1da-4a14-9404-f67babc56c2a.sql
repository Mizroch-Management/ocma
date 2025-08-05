-- First, let's identify and clean up duplicate active memberships
-- Keep only the most recent active membership for each user
WITH ranked_memberships AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM organization_members
  WHERE status = 'active'
),
duplicates_to_remove AS (
  SELECT id
  FROM ranked_memberships
  WHERE rn > 1
)
UPDATE organization_members 
SET status = 'inactive'
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Now create the unique index for active memberships only
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