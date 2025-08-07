import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { log } from '@/utils/logger';

interface InvitationStatus {
  id: string;
  invitee_email: string;
  invitee_name: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function InvitationStatusCard() {
  const [invitations, setInvitations] = useState<InvitationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (currentOrganization) {
      fetchInvitations();
    }
  }, [currentOrganization]);

  const fetchInvitations = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      log.error('Error fetching invitations', error instanceof Error ? error : new Error(String(error)), { organizationId: currentOrganization?.id }, { component: 'InvitationStatusCard', action: 'fetch_invitations' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'expired':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-md"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Recent Invitations
        </CardTitle>
        <CardDescription>
          Track the status of team invitations sent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invitations sent yet.
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(invitation.status)}
                  <div>
                    <p className="font-medium text-sm">
                      {invitation.invitee_name || invitation.invitee_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invitation.invitee_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {invitation.role}
                  </Badge>
                  <Badge variant={getStatusVariant(invitation.status)} className="text-xs">
                    {invitation.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}