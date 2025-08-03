-- Create organizations table
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization roles enum
CREATE TYPE public.organization_role AS ENUM ('owner', 'admin', 'member');

-- Create organization members table
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Add organization_id to existing tables
ALTER TABLE public.workflows ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.generated_content ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.team_members ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.team_invitations ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create function to check organization role
CREATE OR REPLACE FUNCTION public.has_organization_role(_user_id uuid, _organization_id uuid, _role organization_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role = _role
      AND status = 'active'
  )
$$;

-- Create function to check if user is app owner
CREATE OR REPLACE FUNCTION public.is_app_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND email = 'elimizroch@gmail.com'
  )
$$;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
    AND status = 'active'
  LIMIT 1
$$;

-- RLS Policies for organizations
CREATE POLICY "App owner can manage all organizations" 
ON public.organizations 
FOR ALL 
USING (public.is_app_owner(auth.uid()));

CREATE POLICY "Organization members can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = id 
      AND user_id = auth.uid() 
      AND status = 'active'
  )
);

CREATE POLICY "Organization owners can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (public.has_organization_role(auth.uid(), id, 'owner'));

-- RLS Policies for organization members
CREATE POLICY "App owner can manage all organization members" 
ON public.organization_members 
FOR ALL 
USING (public.is_app_owner(auth.uid()));

CREATE POLICY "Organization owners can manage their members" 
ON public.organization_members 
FOR ALL 
USING (public.has_organization_role(auth.uid(), organization_id, 'owner'));

CREATE POLICY "Users can view their organization members" 
ON public.organization_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.status = 'active'
  )
);

-- Update existing RLS policies for workflows
DROP POLICY IF EXISTS "Users can view their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can create their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;

CREATE POLICY "Users can view organization workflows" 
ON public.workflows 
FOR SELECT 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Users can create organization workflows" 
ON public.workflows 
FOR INSERT 
WITH CHECK (
  (organization_id = public.get_user_organization(auth.uid()) AND user_id = auth.uid()) OR
  (organization_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can update organization workflows" 
ON public.workflows 
FOR UPDATE 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Users can delete organization workflows" 
ON public.workflows 
FOR DELETE 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

-- Update existing RLS policies for generated content
DROP POLICY IF EXISTS "Users can view their own generated content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can create their own generated content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can update their own generated content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can delete their own generated content" ON public.generated_content;

CREATE POLICY "Users can view organization content" 
ON public.generated_content 
FOR SELECT 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Users can create organization content" 
ON public.generated_content 
FOR INSERT 
WITH CHECK (
  (organization_id = public.get_user_organization(auth.uid()) AND user_id = auth.uid()) OR
  (organization_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can update organization content" 
ON public.generated_content 
FOR UPDATE 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Users can delete organization content" 
ON public.generated_content 
FOR DELETE 
USING (
  organization_id = public.get_user_organization(auth.uid()) OR
  user_id = auth.uid()
);

-- Create trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for organization_members updated_at
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();