-- Create team_members table for team management functionality
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_owner_id UUID NOT NULL,
  member_email TEXT NOT NULL,
  member_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  permissions JSONB NOT NULL DEFAULT '{}',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for team management
CREATE POLICY "Team owners can manage their team members" 
ON public.team_members 
FOR ALL 
USING (auth.uid() = team_owner_id);

CREATE POLICY "Team members can view their own record" 
ON public.team_members 
FOR SELECT 
USING (auth.uid()::text = (SELECT user_id::text FROM profiles WHERE email = team_members.member_email));

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create invitations table for team invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_owner_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Team owners can manage their invitations" 
ON public.team_invitations 
FOR ALL 
USING (auth.uid() = team_owner_id);

CREATE POLICY "Anyone can view valid invitations by token" 
ON public.team_invitations 
FOR SELECT 
USING (status = 'pending' AND expires_at > now());

-- Create trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();