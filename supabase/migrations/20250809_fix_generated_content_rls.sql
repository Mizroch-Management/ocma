-- Fix RLS policy for generated_content table to allow users to create content
-- The previous policy was too restrictive and prevented content creation

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create organization content" ON public.generated_content;

-- Create a more permissive INSERT policy that allows:
-- 1. Users to create content for their organization if they belong to one
-- 2. Users to create content without an organization (personal content)
-- 3. Always requires the user_id to match the authenticated user
CREATE POLICY "Users can create content" 
ON public.generated_content 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  (
    -- Allow if organization_id is NULL (personal content)
    organization_id IS NULL OR
    -- Allow if user is a member of the specified organization
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = generated_content.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    ) OR
    -- Allow if user is the app owner
    public.is_app_owner(auth.uid())
  )
);

-- Also update the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view organization content" ON public.generated_content;

CREATE POLICY "Users can view content" 
ON public.generated_content 
FOR SELECT 
USING (
  -- User can see their own content
  user_id = auth.uid() OR
  -- User can see content from their organization
  (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = generated_content.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  ) OR
  -- App owner can see everything
  public.is_app_owner(auth.uid())
);

-- Update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users can update organization content" ON public.generated_content;

CREATE POLICY "Users can update content" 
ON public.generated_content 
FOR UPDATE 
USING (
  -- User can update their own content
  user_id = auth.uid() OR
  -- App owner can update everything
  public.is_app_owner(auth.uid())
);

-- Update the DELETE policy to be consistent
DROP POLICY IF EXISTS "Users can delete organization content" ON public.generated_content;

CREATE POLICY "Users can delete content" 
ON public.generated_content 
FOR DELETE 
USING (
  -- User can delete their own content
  user_id = auth.uid() OR
  -- App owner can delete everything
  public.is_app_owner(auth.uid())
);