import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOrganization, type Organization } from '@/hooks/use-organization';
import { Building2, Users, Plus, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { log } from '@/utils/logger';

export function OrganizationOnboarding() {
  const { createOrganization, requestJoinOrganization, searchOrganizations, fetchAllOrganizations, isAppOwner } = useOrganization();
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);
  
  // Create organization form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  
  // Join organization form
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    
    setIsLoading(true);
    const { error } = await createOrganization(newOrgName, newOrgDescription);
    setIsLoading(false);
    
    if (!error) {
      setNewOrgName('');
      setNewOrgDescription('');
    }
  };

  // Load all organizations when join tab is selected
  const loadAllOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const { data, error } = await fetchAllOrganizations();
      if (error) {
        toast.error('Failed to load organizations');
        return;
      }
      
      const organizations = data || [];
      setAllOrganizations(organizations);
      setFilteredOrganizations(organizations);
    } catch (error) {
      log.error('Error loading organizations', error instanceof Error ? error : new Error(String(error)), {}, { component: 'OrganizationOnboarding', action: 'load_organizations' });
      toast.error('Failed to load organizations');
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // Filter organizations based on search query
  const filterOrganizations = (query: string) => {
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

  const handleJoinRequest = async (organizationId: string) => {
    setIsLoading(true);
    const { error } = await requestJoinOrganization(organizationId);
    setIsLoading(false);
    
    if (!error) {
      // Reset form
      setSearchQuery('');
      setAllOrganizations([]);
      setFilteredOrganizations([]);
    }
  };

  // Load organizations when join tab becomes active
  useEffect(() => {
    if (activeTab === 'join') {
      loadAllOrganizations();
    }
  }, [activeTab]);

  // Filter organizations when search query changes
  useEffect(() => {
    filterOrganizations(searchQuery);
  }, [searchQuery, allOrganizations]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to OCMA!</h1>
          <p className="text-muted-foreground text-lg">
            To get started, you need to either create a new organization or join an existing one.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Setup
            </CardTitle>
            <CardDescription>
              Choose how you'd like to get started with your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New
                </TabsTrigger>
                <TabsTrigger value="join" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Join Existing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4">
                <div className="text-center py-4">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Create Your Organization</h3>
                  <p className="text-muted-foreground text-sm">
                    Set up a new organization to manage your marketing content and team.
                    {!isAppOwner && " Your organization will need approval before becoming active."}
                  </p>
                </div>
                
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      type="text"
                      placeholder="Enter your organization name"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="orgDescription">Description (Optional)</Label>
                    <Textarea
                      id="orgDescription"
                      placeholder="Describe your organization's purpose"
                      value={newOrgDescription}
                      onChange={(e) => setNewOrgDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Organization'}
                  </Button>
                  
                  {!isAppOwner && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Your organization will be submitted for approval. 
                        You'll be able to use the app once it's approved by an administrator.
                      </p>
                    </div>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="join" className="space-y-4">
                <div className="text-center py-4">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Join an Organization</h3>
                  <p className="text-muted-foreground text-sm">
                    Search for and request to join an existing organization. The organization owner will need to approve your request.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {isLoadingOrgs ? (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-muted-foreground">Loading organizations...</p>
                      </div>
                    </div>
                  ) : allOrganizations.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No organizations available to join</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You can create a new organization instead.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="searchOrg">Search Organizations (Optional)</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="searchOrg"
                            type="text"
                            placeholder="Type to filter organizations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Available Organizations</Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredOrganizations.map((org) => (
                            <Card key={org.id} className="p-3 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{org.name}</h4>
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Active
                                    </Badge>
                                  </div>
                                  {org.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {org.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinRequest(org.id)}
                                  disabled={isLoading}
                                  className="ml-3"
                                >
                                  {isLoading ? <Clock className="h-4 w-4 animate-spin" /> : 'Request to Join'}
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                        
                        {searchQuery && filteredOrganizations.length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">No organizations found matching "{searchQuery}"</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Try a different search term.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Your join request will be sent to the organization owner for approval.
                      You'll receive access once they approve your request.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Need help? Contact your administrator or organization owner.</p>
        </div>
      </div>
    </div>
  );
}