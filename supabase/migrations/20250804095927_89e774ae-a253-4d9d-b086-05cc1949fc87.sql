-- Add organization_id to system_settings to make them organization-specific
ALTER TABLE public.system_settings 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_system_settings_organization_id ON public.system_settings(organization_id);

-- Update RLS policies for system_settings to be organization-specific
DROP POLICY IF EXISTS "Owners and admins can manage system settings" ON public.system_settings;

-- New organization-specific policies
CREATE POLICY "Organization owners can manage their settings" 
ON public.system_settings 
FOR ALL 
USING (
  organization_id = get_user_organization(auth.uid()) 
  OR has_organization_role(auth.uid(), organization_id, 'owner')
  OR has_organization_role(auth.uid(), organization_id, 'admin')
);

CREATE POLICY "App owner can manage all settings" 
ON public.system_settings 
FOR ALL 
USING (is_app_owner(auth.uid()));