-- Complete cleanup of organization_members policies to fix infinite recursion
-- Drop ALL existing policies on organization_members
DROP POLICY IF EXISTS "App owner can manage all organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members for their orgs" ON public.organization_members;

-- Create only essential non-recursive policies
-- 1. App owner (elimizroch@gmail.com) can manage everything
CREATE POLICY "App owner full access" 
ON public.organization_members 
FOR ALL 
USING (public.is_app_owner(auth.uid()));

-- 2. Basic view access for authenticated users (no self-referencing)
CREATE POLICY "Authenticated users can view organization members" 
ON public.organization_members 
FOR SELECT 
USING (auth.role() = 'authenticated');