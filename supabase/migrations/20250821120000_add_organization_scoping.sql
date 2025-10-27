-- Phase 2: add organization scoping to integration tables

-- platform_accounts organization association
ALTER TABLE platform_accounts
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE platform_accounts pa
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = pa.user_id
    AND om.status = 'active'
  ORDER BY om.joined_at DESC
  LIMIT 1
)
WHERE pa.organization_id IS NULL;

ALTER TABLE platform_accounts
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_accounts_org_platform
  ON platform_accounts(organization_id, platform);

-- api_keys organization association
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_platform
  ON api_keys(organization_id, platform);

-- social_mentions organization association
ALTER TABLE social_mentions
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE social_mentions
DROP CONSTRAINT IF EXISTS social_mentions_platform_mention_id_key;

ALTER TABLE social_mentions
ADD CONSTRAINT social_mentions_unique_org UNIQUE (organization_id, platform, mention_id);

-- hashtag_metrics organization association
ALTER TABLE hashtag_metrics
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE hashtag_metrics
DROP CONSTRAINT IF EXISTS hashtag_metrics_platform_hashtag_tracked_at_key;

CREATE INDEX IF NOT EXISTS idx_hashtag_metrics_org
  ON hashtag_metrics(organization_id, platform, hashtag);

-- Ensure existing rows have organization_id seeded using latest active membership
-- Default organization_id for social_mentions and hashtag_metrics to null-safe value
UPDATE social_mentions
SET organization_id = (
  SELECT organization_id
  FROM platform_accounts
  WHERE platform_accounts.platform = social_mentions.platform
  LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE hashtag_metrics
SET organization_id = (
  SELECT organization_id
  FROM platform_accounts
  WHERE platform_accounts.platform = hashtag_metrics.platform
  LIMIT 1
)
WHERE organization_id IS NULL;
