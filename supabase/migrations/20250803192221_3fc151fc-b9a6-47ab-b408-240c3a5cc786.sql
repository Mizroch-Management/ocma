-- Create ScamDunk organization
INSERT INTO public.organizations (name, description, slug, status, settings, metadata)
VALUES (
  'ScamDunk',
  'Anti-scam marketing and awareness organization',
  'scamdunk',
  'active',
  '{"default_organization": true}'::jsonb,
  '{"migrated_from_legacy": true, "migration_date": "2025-08-03"}'::jsonb
);

-- Get the organization ID for reference
DO $$
DECLARE
    org_id uuid;
    user_record RECORD;
BEGIN
    -- Get the ScamDunk organization ID
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'scamdunk';
    
    -- Add all existing users to ScamDunk organization as members
    -- The app owner (elimizroch@gmail.com) will be added as owner
    FOR user_record IN 
        SELECT p.user_id, p.email 
        FROM public.profiles p
    LOOP
        INSERT INTO public.organization_members (organization_id, user_id, role, status)
        VALUES (
            org_id,
            user_record.user_id,
            CASE 
                WHEN user_record.email = 'elimizroch@gmail.com' THEN 'owner'::organization_role
                ELSE 'member'::organization_role
            END,
            'active'
        )
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END LOOP;
    
    -- Migrate all existing workflows to ScamDunk organization
    UPDATE public.workflows 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
    -- Migrate all existing generated content to ScamDunk organization
    UPDATE public.generated_content 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
    -- Migrate all existing team members to ScamDunk organization
    UPDATE public.team_members 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
    -- Migrate all existing team invitations to ScamDunk organization
    UPDATE public.team_invitations 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
END $$;