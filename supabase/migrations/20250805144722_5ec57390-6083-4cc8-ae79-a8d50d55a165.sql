-- Add INSERT policy to allow users to create pending join requests
CREATE POLICY "Users can create pending join requests" 
ON public.organization_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
  AND role = 'member'
);