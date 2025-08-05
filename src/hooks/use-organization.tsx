import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  settings?: any;
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
  isAppOwner: boolean | null;
  loading: boolean;
  setCurrentOrganization: (org: Organization | null) => void;
  createOrganization: (name: string, description?: string) => Promise<{ error: any }>;
  joinOrganization: (organizationId: string) => Promise<{ error: any }>;
  requestJoinOrganization: (organizationId: string) => Promise<{ error: any }>;
  approveOrganization: (organizationId: string) => Promise<{ error: any }>;
  fetchUserOrganizations: () => Promise<void>;
  fetchOrganizationMembers: (organizationId: string) => Promise<void>;
  searchOrganizations: (query: string) => Promise<{ data: Organization[] | null; error: any }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [isAppOwner, setIsAppOwner] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is app owner
  useEffect(() => {
    const checkAppOwner = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();
        
      setIsAppOwner(profile?.email === 'elimizroch@gmail.com');
    };
    
    checkAppOwner();
  }, [user]);

  // Fetch user's organizations
  const fetchUserOrganizations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let organizations: Organization[] = [];
      
      if (isAppOwner) {
        // App owner can see all organizations
        const { data: allOrgs, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        organizations = allOrgs || [];
      } else {
        // Regular users see only their organizations
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select(`
            organizations (*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');
          
        if (memberError) throw memberError;
        
        organizations = memberData?.map(m => m.organizations).filter(Boolean) || [];
      }
      
      setUserOrganizations(organizations as Organization[]);
      
      // Set current organization if not set
      if (!currentOrganization && organizations.length > 0) {
        setCurrentOrganization(organizations[0]);
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch organization members
  const fetchOrganizationMembers = async (organizationId: string) => {
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
        .eq('organization_id', organizationId);
        
      if (error) throw error;
      setOrganizationMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching organization members:', error);
      toast.error('Failed to load organization members');
    }
  };

  // Create new organization
  const createOrganization = async (name: string, description?: string) => {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
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
        
      if (orgError) throw orgError;
      
      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user?.id,
          role: 'owner'
        });
        
      if (memberError) throw memberError;
      
      await fetchUserOrganizations();
      setCurrentOrganization(orgData);
      
      if (!isAppOwner) {
        toast.success('Organization created and submitted for approval');
      } else {
        toast.success('Organization created successfully');
      }
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve organization');
      return { error };
    }
  };

  useEffect(() => {
    if (user && isAppOwner !== null) {
      fetchUserOrganizations();
    }
  }, [user, isAppOwner]);

  const value = {
    currentOrganization,
    userOrganizations,
    organizationMembers,
    isAppOwner,
    loading,
    setCurrentOrganization,
    createOrganization,
    joinOrganization,
    requestJoinOrganization,
    approveOrganization,
    fetchUserOrganizations,
    fetchOrganizationMembers,
    searchOrganizations,
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