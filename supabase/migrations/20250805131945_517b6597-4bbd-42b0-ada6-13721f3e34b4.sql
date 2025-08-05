-- Create policy to allow organization owners to manage members in their organization
CREATE POLICY "Organization owners can manage their members" 
ON public.organization_members 
FOR UPDATE 
USING (
  has_organization_role(auth.uid(), organization_id, 'owner'::organization_role)
);

-- Create policy to allow organization owners to delete pending member requests
CREATE POLICY "Organization owners can delete pending requests" 
ON public.organization_members 
FOR DELETE 
USING (
  has_organization_role(auth.uid(), organization_id, 'owner'::organization_role) 
  AND status = 'pending'
);