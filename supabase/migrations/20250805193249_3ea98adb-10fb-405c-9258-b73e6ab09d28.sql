-- Fix workflows RLS policies to allow users to create workflows in any organization they're a member of

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can update organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete organization workflows" ON workflows;

-- Create improved policies that check organization membership
CREATE POLICY "Users can create workflows in their organizations" 
ON workflows 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) AND 
  (
    organization_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = workflows.organization_id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
  )
);

CREATE POLICY "Users can view workflows in their organizations" 
ON workflows 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR
  (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = workflows.organization_id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
  )
);

CREATE POLICY "Users can update workflows in their organizations" 
ON workflows 
FOR UPDATE 
USING (
  (user_id = auth.uid()) OR
  (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = workflows.organization_id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
  )
);

CREATE POLICY "Users can delete workflows in their organizations" 
ON workflows 
FOR DELETE 
USING (
  (user_id = auth.uid()) OR
  (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = workflows.organization_id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
  )
);