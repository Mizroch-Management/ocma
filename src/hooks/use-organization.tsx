import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
// import { log } from '@/utils/logger';

interface Organization {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  organizationMembers: OrganizationMember[];
  pendingMembers: OrganizationMember[];
  isAppOwner: boolean | null;
  loading: boolean;
  setCurrentOrganization: (org: Organization | null) => Promise<void>;
  createOrganization: (name: string, description?: string) => Promise<{ error: Error | null }>;
  joinOrganization: (organizationId: string) => Promise<{ error: Error | null }>;
  requestJoinOrganization: (organizationId: string) => Promise<{ error: Error | null }>;
  approveOrganization: (organizationId: string) => Promise<{ error: Error | null }>;
  approveMember: (memberId: string) => Promise<{ error: Error | null }>;
  rejectMember: (memberId: string) => Promise<{ error: Error | null }>;
  updateMemberRole: (memberId: string, role: 'owner' | 'admin' | 'member') => Promise<{ error: Error | null }>;
  fetchUserOrganizations: () => Promise<void>;
  fetchOrganizationMembers: (organizationId: string) => Promise<void>;
  fetchPendingMembers: (organizationId: string) => Promise<void>;
  searchOrganizations: (query: string) => Promise<{ data: Organization[] | null; error: Error | null }>;
  fetchAllOrganizations: () => Promise<{ data: Organization[] | null; error: Error | null }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<OrganizationMember[]>([]);
  const [isAppOwner, setIsAppOwner] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialOrgId, setInitialOrgId] = useState<string | null>(null);
  const persistCurrentOrganization = async (org: Organization | null) => {
    const nextId = org?.id ?? null;

    // Avoid unnecessary updates
    if (currentOrganization?.id === nextId && initialOrgId === nextId) {
      return;
    }

    setCurrentOrganizationState(org);

    if (!user) {
      setInitialOrgId(nextId);
      return;
    }

    if (nextId === initialOrgId) {
      setInitialOrgId(nextId);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ current_organization_id: nextId })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to persist current organization selection:', error);
      toast.error('Failed to update selected organization');
      return;
    }

    setInitialOrgId(nextId);
  };
  const logDebug = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(...args);
    }
  };

  // Check if user is app owner
  useEffect(() => {
    const checkAppOwner = async () => {
      if (!user) {
        setIsAppOwner(false);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, current_organization_id')
          .eq('user_id', user.id)
          .single();
          
        const appOwnerEmail = import.meta.env.VITE_APP_OWNER_EMAIL || 'elimizroch@gmail.com';
        setIsAppOwner(profile?.email === appOwnerEmail);
        setInitialOrgId(profile?.current_organization_id ?? null);
      } catch (error) {
        console.error('Error checking app owner status:', error);
        setIsAppOwner(false);
        setInitialOrgId(null);
      }
    };
    
    checkAppOwner();
  }, [user]);

  // Fetch user's organizations
  const fetchUserOrganizations = async () => {
    logDebug('=== FETCH USER ORGANIZATIONS ===');
    logDebug('User present:', Boolean(user));
    logDebug('User ID:', user?.id);
    logDebug('Is App Owner:', isAppOwner);
    
    if (!user) {
      logDebug('No user - skipping fetch');
      setLoading(false);
      return;
    }
    
    // Wait for isAppOwner to be determined
    if (isAppOwner === null) {
      logDebug('App owner status not determined yet');
      return;
    }
    
    try {
      setLoading(true);
      
      let organizations: Organization[] = [];
      
      if (isAppOwner) {
        logDebug('Fetching all organizations (app owner)');
        // App owner can see all organizations
        const { data: allOrgs, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });
          
        logDebug('All orgs query result:', { hasData: Boolean(allOrgs), error });
          
        if (error) throw error;
        organizations = allOrgs || [];
        logDebug(`Found ${organizations.length} organizations (app owner view)`);
      } else {
        logDebug('Fetching user organizations (regular user)');
        // Regular users see only their organizations
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select(`
            organizations (id, name, description, status, created_at, updated_at)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');
          
        logDebug('Member orgs query result:', { hasData: Boolean(memberData), error: memberError });
          
        if (memberError) throw memberError;
        
        organizations = memberData?.map(m => m.organizations).filter(Boolean) || [];
        logDebug(`Found ${organizations.length} organizations (member view)`);
      }
      
      setUserOrganizations(organizations as Organization[]);
      logDebug('User organizations state updated');

      const preferredOrg =
        organizations.find(org => org.id === initialOrgId) ||
        organizations.find(org => org.status === 'active') ||
        organizations[0] ||
        null;

      if (preferredOrg) {
        await persistCurrentOrganization(preferredOrg as Organization);
      } else {
        await persistCurrentOrganization(null);
      }
    } catch (error: unknown) {
      console.error('❌ Failed to fetch organizations:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        details: error?.details
      });
      toast.error('Failed to load organizations');
    } finally {
      logDebug('Setting loading to false');
      setLoading(false);
    }
  };

  // Fetch organization members
  const fetchOrganizationMembers = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id, organization_id, user_id, role, status, joined_at, created_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });
        
      if (error) throw error;
      setOrganizationMembers(data || []);
    } catch (error: unknown) {
      console.error("org error");
      toast.error('Failed to load organization members');
    }
  };

  // Fetch pending members for organization owners
  const fetchPendingMembers = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pending');
        
      if (error) throw error;
      setPendingMembers(data || []);
    } catch (error: unknown) {
      console.error("org error");
      toast.error('Failed to load pending members');
    }
  };

  // Create new organization
  const createOrganization = async (name: string, description?: string) => {
    logDebug('=== CREATE ORGANIZATION DEBUG ===');
    logDebug('Name provided:', Boolean(name));
    logDebug('User ID:', user?.id);
    logDebug('Is App Owner:', isAppOwner);
    
    if (!user?.id) {
      console.error('❌ No user ID - cannot create organization');
      toast.error('You must be logged in to create an organization');
      return { error: new Error('Not authenticated') };
    }
    
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      logDebug('Inserting organization with slug');
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          description,
          slug,
          status: isAppOwner ? 'active' : 'pending'
        })
        .select()
        .single();
        
      logDebug('Organization insert result', { hasData: Boolean(orgData), error: orgError });
        
      if (orgError) {
        console.error('❌ Failed to create organization:', orgError);
        throw orgError;
      }
      
      // Add user as owner
      logDebug('Adding user as owner of organization');
      
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user?.id,
          role: 'owner',
          status: 'active'
        })
        .select();
        
      logDebug('Member insert result', { hasData: Boolean(memberData), error: memberError });
        
      if (memberError) {
        console.error('❌ Failed to add user as owner:', memberError);
        // Try to clean up the organization if member creation fails
        await supabase.from('organizations').delete().eq('id', orgData.id);
        throw memberError;
      }
      
      logDebug('Organization and membership created successfully');
      
      await fetchUserOrganizations();
      await setCurrentOrganization(orgData);
      
      logDebug('Current organization set to new organization');
      
      if (!isAppOwner) {
        toast.success('Organization created and submitted for approval');
      } else {
        toast.success('Organization created successfully');
      }
      
      return { error: null };
    } catch (error: unknown) {
      console.error('Organization creation error:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      });
      
      let errorMessage = error.message || 'Failed to create organization';
      if (error?.code === '42501') {
        errorMessage = 'Permission denied. Please make sure you are logged in.';
      } else if (error?.code === '23505') {
        errorMessage = 'An organization with this name already exists.';
      }
      
      toast.error(errorMessage);
      return { error };
    }
  };

  // Join existing organization (direct join for approved orgs)
  const joinOrganization = async (organizationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user?.id,
          role: 'member',
          status: 'active'
        });
        
      if (error) throw error;
      
      await fetchUserOrganizations();
      toast.success('Successfully joined organization');
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to join organization');
      return { error };
    }
  };

  // Request to join organization (requires approval)
  const requestJoinOrganization = async (organizationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user?.id,
          role: 'member',
          status: 'pending'
        });
        
      if (error) throw error;
      
      toast.success('Join request sent! Waiting for organization owner approval.');
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to send join request');
      return { error };
    }
  };

  // Search public organizations
  const searchOrganizations = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .ilike('name', `%${query}%`)
        .limit(10);
        
      return { data, error };
    } catch (error: unknown) {
      return { data: null, error };
    }
  };

  // Approve member join request
  const approveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ status: 'active' })
        .eq('id', memberId);
        
      if (error) throw error;
      
      toast.success('Member approved successfully');
      
      // Refresh pending members if current organization is set
      if (currentOrganization) {
        await fetchPendingMembers(currentOrganization.id);
        await fetchOrganizationMembers(currentOrganization.id);
      }
      
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to approve member');
      return { error };
    }
  };

  // Reject member join request
  const rejectMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      
      toast.success('Member request rejected');
      
      // Refresh pending members if current organization is set
      if (currentOrganization) {
        await fetchPendingMembers(currentOrganization.id);
      }
      
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to reject member');
      return { error };
    }
  };

  // Update member role (owner only)
  const updateMemberRole = async (memberId: string, role: 'owner' | 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);
        
      if (error) throw error;
      
      toast.success('Member role updated successfully');
      
      // Refresh members if current organization is set
      if (currentOrganization) {
        await fetchOrganizationMembers(currentOrganization.id);
      }
      
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to update member role');
      return { error };
    }
  };

  // Fetch all available organizations
  const fetchAllOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .order('name');
        
      return { data, error };
    } catch (error: unknown) {
      return { data: null, error };
    }
  };

  // Approve organization (app owner only)
  const approveOrganization = async (organizationId: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'active' })
        .eq('id', organizationId);
        
      if (error) throw error;
      
      await fetchUserOrganizations();
      toast.success('Organization approved successfully');
      return { error: null };
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to approve organization');
      return { error };
    }
  };

  useEffect(() => {
    const initializeOrganizations = async () => {
      if (user && isAppOwner !== null) {
        try {
          await fetchUserOrganizations();
        } catch (error) {
          console.error('Failed to initialize organizations:', error);
          setLoading(false);
        }
      }
    };
    
    initializeOrganizations();
  }, [user, isAppOwner]);

  const value = {
    currentOrganization,
    userOrganizations,
    organizationMembers,
    pendingMembers,
    isAppOwner,
    loading,
    setCurrentOrganization: persistCurrentOrganization,
    createOrganization,
    joinOrganization,
    requestJoinOrganization,
    approveOrganization,
    approveMember,
    rejectMember,
    updateMemberRole,
    fetchUserOrganizations,
    fetchOrganizationMembers,
    fetchPendingMembers,
    searchOrganizations,
    fetchAllOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export type { Organization, OrganizationMember };
