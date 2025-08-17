import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus } from "lucide-react";
import { log } from '@/utils/logger';

interface InviteMemberDialogProps {
  onInviteSent: () => void;
}

export function InviteMemberDialog({ onInviteSent }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const handleInvite = async () => {
    if (!email.trim() || !currentOrganization || !user) return;

    setLoading(true);
    try {
      // Create invitation record
      const invitationToken = crypto.randomUUID();
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: currentOrganization.id,
          team_owner_id: user.id,
          invitee_email: email.trim(),
          invitee_name: name.trim() || null,
          role: role,
          invitation_token: invitationToken,
        });

      if (inviteError) throw inviteError;

      // Call edge function to send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: email.trim(),
          name: name.trim() || email.trim(),
          role: role,
          invitationToken: invitationToken,
        }
      });

      if (emailError) {
        log.warn('Email sending failed', { emailError, memberEmail: email }, { component: 'InviteMemberDialog', action: 'send_invitation_email' });
        // Don't throw - invitation was created successfully
      }

      toast({
        title: "Invitation sent",
        description: `Team invitation has been sent to ${email}`,
      });

      setOpen(false);
      setEmail("");
      setName("");
      setRole("member");
      onInviteSent();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error sending invitation",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join {currentOrganization?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name (Optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: "member" | "admin") => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleInvite}
            disabled={!email.trim() || loading}
          >
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}