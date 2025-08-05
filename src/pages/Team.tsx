import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Users, UserMinus, Clock, CheckCircle, XCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { InvitationStatusCard } from "@/components/team/invitation-status-card";

interface OrganizationMemberWithProfile {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function Team() {
  const [members, setMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [pendingMembers, setPendingMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchOrganizationMembers();
    }
  }, [currentOrganization, user]);

  const fetchOrganizationMembers = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoading(true);
      
      // Get active organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Get pending organization members
      const { data: pendingData, error: pendingError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (pendingError) throw pendingError;

      // Get profiles for all members (active + pending)
      const allUserIds = [
        ...(membersData?.map(member => member.user_id) || []),
        ...(pendingData?.map(member => member.user_id) || [])
      ];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', allUserIds);

      if (profilesError) throw profilesError;

      // Combine the data for active members
      const membersWithProfiles = membersData?.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profiles: profile || { full_name: '', email: '' }
        };
      }) || [];

      // Combine the data for pending members
      const pendingWithProfiles = pendingData?.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profiles: profile || { full_name: '', email: '' }
        };
      }) || [];

      setMembers(membersWithProfiles);
      setPendingMembers(pendingWithProfiles);
      
      // Get current user's role in this organization
      const currentUserMember = membersData?.find(member => member.user_id === user?.id);
      setCurrentUserRole(currentUserMember?.role || null);

    } catch (error: any) {
      console.error('Error fetching organization members:', error);
      toast({
        title: "Error loading team members",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'owner' | 'admin' | 'member') => {
    if (!currentOrganization) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });

      fetchOrganizationMembers();
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeUserFromOrganization = async (userId: string, userName: string) => {
    if (!currentOrganization) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: "User removed",
        description: `${userName} has been removed from the organization.`,
      });

      fetchOrganizationMembers();
    } catch (error: any) {
      toast({
        title: "Error removing user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveMember = async (memberId: string, userName: string) => {
    if (!currentOrganization) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ status: 'active' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member approved",
        description: `${userName} has been approved and added to the organization.`,
      });

      fetchOrganizationMembers();
    } catch (error: any) {
      toast({
        title: "Error approving member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectMember = async (memberId: string, userName: string) => {
    if (!currentOrganization) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member rejected",
        description: `${userName}'s join request has been rejected.`,
      });

      fetchOrganizationMembers();
    } catch (error: any) {
      toast({
        title: "Error rejecting member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their permissions.
          </p>
        </div>
        {canManageUsers && (
          <InviteMemberDialog onInviteSent={fetchOrganizationMembers} />
        )}
      </div>

      <div className="grid gap-6">
        <InvitationStatusCard />
        
        {/* Pending Members Card */}
        {canManageUsers && pendingMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                Pending Join Requests ({pendingMembers.length})
              </CardTitle>
              <CardDescription>
                Members waiting for approval to join {currentOrganization?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.profiles?.full_name || 'Unnamed User'}
                      </TableCell>
                      <TableCell>{member.profiles?.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMember(member.id, member.profiles?.full_name || member.profiles?.email || 'User')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Join Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject {member.profiles?.full_name || member.profiles?.email}'s request to join {currentOrganization?.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => rejectMember(member.id, member.profiles?.full_name || member.profiles?.email || 'User')}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription>
              View and manage team member roles and permissions for {currentOrganization?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageUsers && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.profiles?.full_name || 'Unnamed User'}
                    </TableCell>
                    <TableCell>{member.profiles?.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getRoleBadgeVariant(member.role)}
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    {canManageUsers && (
                      <TableCell>
                        <div className="flex gap-2">
                          {member.user_id !== user?.id && (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(value: 'owner' | 'admin' | 'member') => updateUserRole(member.user_id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {currentUserRole === 'owner' && (
                                    <SelectItem value="owner">Owner</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {member.profiles?.full_name || member.profiles?.email} from {currentOrganization?.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => removeUserFromOrganization(member.user_id, member.profiles?.full_name || member.profiles?.email || 'User')}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          {member.user_id === user?.id && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}