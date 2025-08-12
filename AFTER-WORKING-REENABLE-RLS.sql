-- Run this ONLY AFTER confirming everything works with RLS disabled
-- This will re-enable RLS with very permissive policies

-- Step 1: Re-enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies
DROP POLICY IF EXISTS "Public access" ON public.organizations;
DROP POLICY IF EXISTS "Public access" ON public.organization_members;
DROP POLICY IF EXISTS "Public access" ON public.system_settings;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;

-- Step 3: Create very permissive policies (authenticated users can do anything)

-- Organizations: Any logged-in user can do anything
CREATE POLICY "Public access" 
ON public.organizations 
FOR ALL 
USING (true)  -- Anyone can read
WITH CHECK (auth.uid() IS NOT NULL);  -- Must be logged in to write

-- Organization Members: Any logged-in user can do anything
CREATE POLICY "Public access" 
ON public.organization_members 
FOR ALL 
USING (true)  -- Anyone can read
WITH CHECK (auth.uid() IS NOT NULL);  -- Must be logged in to write

-- System Settings: Any logged-in user can do anything
CREATE POLICY "Public access" 
ON public.system_settings 
FOR ALL 
USING (true)  -- Anyone can read
WITH CHECK (auth.uid() IS NOT NULL);  -- Must be logged in to write

-- Profiles: Public read, authenticated write
CREATE POLICY "Public profiles access" 
ON public.profiles 
FOR ALL 
USING (true)
WITH CHECK (auth.uid() = user_id);

SELECT '✅ RLS re-enabled with permissive policies. App should still work!' as message;