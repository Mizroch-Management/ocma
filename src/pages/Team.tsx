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
import { Loader2, UserPlus, Shield, Users, UserMinus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
      
      // Get organization members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      setMembers(membersData || []);
      
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
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="grid gap-6">
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