import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Check, Clock, Users, Search, UserPlus } from 'lucide-react';

export function OrganizationSelector() {
  const {
    currentOrganization,
    userOrganizations,
    organizationMembers,
    pendingMembers,
    isAppOwner,
    loading,
    setCurrentOrganization,
    createOrganization,
    approveOrganization,
    approveMember,
    rejectMember,
    updateMemberRole,
    fetchUserOrganizations,
    fetchPendingMembers,
    fetchOrganizationMembers,
    searchOrganizations,
    requestJoinOrganization,
    fetchAllOrganizations
  } = useOrganization();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrganizations, setAllOrganizations] = useState<any[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    setCreating(true);
    const { error } = await createOrganization(newOrgName, newOrgDescription);
    
    if (!error) {
      setShowCreateDialog(false);
      setNewOrgName('');
      setNewOrgDescription('');
    }
    setCreating(false);
  };

  const handleApproveOrganization = async (orgId: string) => {
    await approveOrganization(orgId);
    await fetchUserOrganizations();
  };

  const handleLoadAllOrganizations = async () => {
    setLoadingOrganizations(true);
    const { data, error } = await fetchAllOrganizations();
    
    if (!error && data) {
      // Filter out organizations the user is already a member of
      const userOrgIds = userOrganizations.map(org => org.id);
      const availableOrgs = data.filter(org => !userOrgIds.includes(org.id));
      setAllOrganizations(availableOrgs);
      setFilteredOrganizations(availableOrgs);
    }
    setLoadingOrganizations(false);
  };

  const handleFilterOrganizations = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrganizations(allOrganizations);
    } else {
      const filtered = allOrganizations.filter(org => 
        org.name.toLowerCase().includes(query.toLowerCase()) ||
        org.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredOrganizations(filtered);
    }
  };

  const handleJoinRequest = async (orgId: string) => {
    setJoining(true);
    const { error } = await requestJoinOrganization(orgId);
    
    if (!error) {
      setShowJoinDialog(false);
      setSearchQuery('');
      setAllOrganizations([]);
      setFilteredOrganizations([]);
    }
    setJoining(false);
  };

  // Load pending members when current organization changes
  useEffect(() => {
    if (currentOrganization) {
      fetchPendingMembers(currentOrganization.id);
      fetchOrganizationMembers(currentOrganization.id);
    }
  }, [currentOrganization, fetchPendingMembers, fetchOrganizationMembers]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 animate-pulse" />
            <span>Loading organizations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Organization</span>
              </CardTitle>
              <CardDescription>
                Select or create an organization to manage your marketing content and campaigns.
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Create a new organization to manage your marketing activities.
                    {!isAppOwner && " Your organization will need approval before activation."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-description">Description (Optional)</Label>
                    <Textarea
                      id="org-description"
                      value={newOrgDescription}
                      onChange={(e) => setNewOrgDescription(e.target.value)}
                      placeholder="Brief description of your organization"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateOrganization} disabled={creating || !newOrgName.trim()}>
                      {creating ? 'Creating...' : 'Create Organization'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showJoinDialog} onOpenChange={(open) => {
              setShowJoinDialog(open);
              if (open) {
                handleLoadAllOrganizations();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Existing Organization</DialogTitle>
                  <DialogDescription>
                    Browse and request to join an existing organization. The organization owner will need to approve your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search-org">Filter Organizations</Label>
                    <Input
                      id="search-org"
                      value={searchQuery}
                      onChange={(e) => handleFilterOrganizations(e.target.value)}
                      placeholder="Type to filter organizations..."
                    />
                  </div>
                  
                  {loadingOrganizations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">Loading organizations...</div>
                    </div>
                  ) : filteredOrganizations.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Available Organizations</Label>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {filteredOrganizations.map((org) => (
                          <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{org.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {org.description || 'No description'}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => handleJoinRequest(org.id)}
                              disabled={joining}
                            >
                              {joining ? 'Requesting...' : 'Request to Join'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : allOrganizations.length === 0 && !loadingOrganizations ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No organizations available to join.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No organizations match your filter.
                    </p>
                  )}
                  
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {userOrganizations.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Organizations</h3>
              <p className="text-muted-foreground mb-4">
                You're not a member of any organizations yet. Create one or join an existing organization to get started.
              </p>
              <div className="flex justify-center space-x-2">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
                <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Organization
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-org">Current Organization</Label>
                <Select
                  value={currentOrganization?.id || ''}
                  onValueChange={(value) => {
                    const org = userOrganizations.find(o => o.id === value);
                    setCurrentOrganization(org || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOrganizations.filter(org => org.status === 'active').map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>{org.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              {currentOrganization && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{currentOrganization.name}</h4>
                    {getStatusBadge(currentOrganization.status)}
                  </div>
                  {currentOrganization.description && (
                    <p className="text-sm text-muted-foreground">{currentOrganization.description}</p>
                  )}
                </div>
              )}

              {/* Organization Members - Only show to organization owners/admins */}
              {currentOrganization && organizationMembers.filter(m => m.status === 'active').length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Organization Members
                  </h4>
                  <div className="space-y-2">
                    {organizationMembers.filter(m => m.status === 'active').map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{(member as any).profiles?.full_name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">
                            {(member as any).profiles?.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Role: {member.role}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => updateMemberRole(member.id, newRole as any)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Member Requests - Only show to organization owners */}
              {currentOrganization && pendingMembers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending Member Requests
                  </h4>
                  <div className="space-y-2">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{(member as any).profiles?.full_name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">
                            {(member as any).profiles?.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Requested on {new Date(member.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveMember(member.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => rejectMember(member.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAppOwner && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Organization Management
                  </h4>
                  <div className="space-y-2">
                    {userOrganizations.filter(org => org.status === 'pending').map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {org.description || 'No description'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(org.status)}
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveOrganization(org.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                    {userOrganizations.filter(org => org.status === 'pending').length === 0 && (
                      <p className="text-sm text-muted-foreground">No pending organizations</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}