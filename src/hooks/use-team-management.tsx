import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { useOrganization } from './use-organization';

export interface TeamMember {
  id: string;
  member_email: string;
  member_name: string | null;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  permissions: Record<string, boolean>;
  invited_at: string;
  joined_at: string | null;
}

export interface TeamInvitation {
  id: string;
  invitee_email: string;
  invitee_name: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

export const useTeamManagement = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch team members for current organization
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('invited_at', { ascending: false });

      if (membersError) throw membersError;

      // Fetch pending invitations for current organization
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      setMembers((membersData || []).map(member => ({
        ...member,
        status: member.status as 'pending' | 'active' | 'inactive',
        permissions: typeof member.permissions === 'object' && member.permissions !== null 
          ? member.permissions as Record<string, boolean>
          : {}
      })));
      setInvitations((invitationsData || []).map(invitation => ({
        ...invitation,
        status: invitation.status as 'pending' | 'accepted' | 'declined' | 'expired'
      })));

    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (email: string, name: string, role: string = 'member') => {
    try {
      // Get current user for team_owner_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate unique invitation token
      const invitationToken = crypto.randomUUID();

      // Create invitation record
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_owner_id: user.id,
          organization_id: currentOrganization.id,
          invitee_email: email,
          invitee_name: name,
          role: role,
          invitation_token: invitationToken
        });

      if (inviteError) throw inviteError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          name,
          role,
          invitationToken
        }
      });

      if (emailError) {
        console.warn('Failed to send invitation email:', emailError);
        // Don't throw error for email failure - invitation is still created
      }

      await fetchTeamData();
      return { success: true };

    } catch (err) {
      console.error('Error inviting member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to invite member' 
      };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };

    } catch (err) {
      console.error('Error updating member role:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update member role' 
      };
    }
  };

  const updateMemberPermissions = async (memberId: string, permissions: Record<string, boolean>) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions })
        .eq('id', memberId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };

    } catch (err) {
      console.error('Error updating member permissions:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update member permissions' 
      };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };

    } catch (err) {
      console.error('Error removing member:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to remove member' 
      };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };

    } catch (err) {
      console.error('Error canceling invitation:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to cancel invitation' 
      };
    }
  };

  useEffect(() => {
    if (user && currentOrganization) {
      fetchTeamData();
    }
  }, [user, currentOrganization]);

  return {
    members,
    invitations,
    loading,
    error,
    inviteMember,
    updateMemberRole,
    updateMemberPermissions,
    removeMember,
    cancelInvitation,
    refetch: fetchTeamData
  };
}