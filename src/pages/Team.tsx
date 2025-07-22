import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Users } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: { role: string }[];
}

export default function Team() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchCurrentUserRole();
  }, [user]);

  const fetchCurrentUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCurrentUserRole(data.role);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!inner(role)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group roles by user
      const profilesWithRoles = data?.reduce((acc: Profile[], curr: any) => {
        const existingProfile = acc.find(p => p.user_id === curr.user_id);
        
        if (existingProfile) {
          existingProfile.roles.push({ role: curr.user_roles.role });
        } else {
          acc.push({
            ...curr,
            roles: [{ role: curr.user_roles.role }]
          });
        }
        
        return acc;
      }, []) || [];

      setProfiles(profilesWithRoles);
    } catch (error: any) {
      toast({
        title: "Error loading team members",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as "owner" | "admin" | "member" });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        title: "Error updating role",
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
              Team Members ({profiles.length})
            </CardTitle>
            <CardDescription>
              View and manage team member roles and permissions
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
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || 'Unnamed User'}
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {profile.roles.map((roleObj, index) => (
                          <Badge 
                            key={index} 
                            variant={getRoleBadgeVariant(roleObj.role)}
                            className="capitalize"
                          >
                            {roleObj.role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    {canManageUsers && (
                      <TableCell>
                        {profile.user_id !== user?.id && (
                          <Select
                            value={profile.roles[0]?.role || 'member'}
                            onValueChange={(value) => updateUserRole(profile.user_id, value)}
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
                        )}
                        {profile.user_id === user?.id && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            You
                          </Badge>
                        )}
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