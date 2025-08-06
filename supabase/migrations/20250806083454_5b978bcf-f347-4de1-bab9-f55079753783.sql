-- Drop the existing unique constraint on setting_key
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;

-- Add a new unique constraint on the combination of setting_key and organization_id
-- This allows different organizations to have their own settings with the same key
ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_setting_key_organization_id_key 
UNIQUE (setting_key, organization_id);

-- Also add an index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_system_settings_org_key 
ON public.system_settings (organization_id, setting_key);