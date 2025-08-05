-- Remove the problematic unique constraint that prevents users from being active in multiple organizations
DROP INDEX IF EXISTS public.unique_active_user_membership;

-- Now update Eli's membership in ScamDunk to active
UPDATE organization_members 
SET status = 'active', updated_at = now()
WHERE user_id = '538f4327-9f62-459c-b81a-ec567e089aae'
  AND organization_id = 'bc3dcaec-3aa8-4f99-8f23-98cdc120f6c1';