-- Restore all social media platform integrations to ScamDunk organization
UPDATE system_settings 
SET organization_id = 'bc3dcaec-3aa8-4f99-8f23-98cdc120f6c1'
WHERE category = 'social_media' AND organization_id IS NULL;