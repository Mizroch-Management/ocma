-- Update RLS policy to allow both owners and admins to manage system settings
DROP POLICY "Only owners can manage system settings" ON public.system_settings;

CREATE POLICY "Owners and admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);