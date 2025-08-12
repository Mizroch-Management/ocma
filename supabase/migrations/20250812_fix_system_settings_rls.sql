-- Fix system_settings RLS policies to allow authenticated users to manage global settings
-- and organization members to manage their organization's settings

-- First, enable RLS if not already enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization owners can manage their settings" ON public.system_settings;
DROP POLICY IF EXISTS "Owners and admins can manage system settings" ON public.system_settings;

-- Create new comprehensive policies

-- Policy 1: Allow authenticated users to read global settings (organization_id IS NULL)
CREATE POLICY "Authenticated users can read global settings" 
ON public.system_settings 
FOR SELECT 
USING (
  organization_id IS NULL 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to create/update/delete global settings
CREATE POLICY "Authenticated users can manage global settings" 
ON public.system_settings 
FOR ALL 
USING (
  organization_id IS NULL 
  AND auth.uid() IS NOT NULL
);

-- Policy 3: Organization members can read their organization's settings
CREATE POLICY "Organization members can read their org settings" 
ON public.system_settings 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = system_settings.organization_id 
    AND user_id = auth.uid()
  )
);

-- Policy 4: Organization owners and admins can manage their organization's settings
CREATE POLICY "Organization owners and admins can manage org settings" 
ON public.system_settings 
FOR ALL 
USING (
  organization_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = system_settings.organization_id 
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Add comment explaining the setup
COMMENT ON TABLE public.system_settings IS 
'System settings table with organization-specific and global settings. 
Global settings (organization_id IS NULL) can be managed by any authenticated user.
Organization settings require proper roles (owner/admin) to manage.';