-- Add current organization tracking to user profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_current_organization
  ON public.profiles(current_organization_id);

-- Populate the column with the most recent active organization membership when available
WITH user_latest_membership AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    organization_id
  FROM public.organization_members
  WHERE status = 'active'
  ORDER BY user_id, joined_at DESC
)
UPDATE public.profiles p
SET current_organization_id = ulm.organization_id
FROM user_latest_membership ulm
WHERE ulm.user_id = p.user_id
  AND p.current_organization_id IS NULL;
