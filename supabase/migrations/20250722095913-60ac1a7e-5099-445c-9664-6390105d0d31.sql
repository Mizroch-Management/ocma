-- First, insert the owner user into the profiles table
-- This will create the owner profile with the specified email
INSERT INTO public.profiles (user_id, email, full_name) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'elimizroch@gmail.com', 
  'Owner'
) ON CONFLICT (user_id) DO NOTHING;

-- Set the owner role for this user
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'owner'::app_role
) ON CONFLICT (user_id, role) DO NOTHING;