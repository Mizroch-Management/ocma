import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Users, Mail, Clock, MoreHorizontal, Shield, Trash2, Edit } from "lucide-react";
import { useTeamManagement } from "@/hooks/use-team-management";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);

  const { 
    members, 
    invitations, 
    loading, 
    error, 
    inviteMember, 
    updateMemberRole, 
    removeMember, 
    cancelInvitation 
  } = useTeamManagement();

  const { toast } = useToast();

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteName) {
      toast({
        title: "Missing Information",
        description: "Please fill in both email and name.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    const result = await inviteMember(inviteEmail, inviteName, inviteRole);
    
    if (result.success) {
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
    } else {
      toast({
        title: "Failed to Send Invitation",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsInviting(false);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const result = await updateMemberRole(memberId, newRole);
    if (result.success) {
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
    } else {
      toast({
        title: "Failed to Update Role",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    const result = await removeMember(memberId);
    if (result.success) {
      toast({
        title: "Member Removed",
        description: `${memberEmail} has been removed from the team.`,
      });
    } else {
      toast({
        title: "Failed to Remove Member",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast({
        title: "Invitation Canceled",
        description: `Invitation to ${email} has been canceled.`,
      });
    } else {
      toast({
        title: "Failed to Cancel Invitation",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "editor":
        return "default";
      case "member":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading team data: {error}</p>
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
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to add a new member to your team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Full Name</Label>
                <Input
                  id="invite-name"
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember} disabled={isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              With admin access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your team members and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Invite your first member to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {member.member_name
                          ? member.member_name.split(' ').map(n => n[0]).join('').toUpperCase()
                          : member.member_email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.member_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{member.member_email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getRoleColor(member.role)}>{member.role}</Badge>
                        <Badge variant={getStatusColor(member.status)}>{member.status}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}>
                        <Edit className="h-4 w-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.member_email} from the team? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.id, member.member_email)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Invitations waiting for response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {invitation.invitee_name
                          ? invitation.invitee_name.split(' ').map(n => n[0]).join('').toUpperCase()
                          : invitation.invitee_email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{invitation.invitee_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{invitation.invitee_email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getRoleColor(invitation.role)}>{invitation.role}</Badge>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel the invitation to {invitation.invitee_email}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancelInvitation(invitation.id, invitation.invitee_email)}>
                          Cancel Invitation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}