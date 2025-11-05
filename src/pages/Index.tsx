import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { OrganizationOnboarding } from '@/components/organization/organization-onboarding';
import { Loader2 } from 'lucide-react';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { userOrganizations, loading: orgLoading, currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [contextReady, setContextReady] = useState(false);

  // Ensure all contexts are initialized before rendering
  useEffect(() => {
    if (!authLoading && !orgLoading) {
      // Small delay to ensure all context providers are fully initialized
      const timer = setTimeout(() => setContextReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, orgLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth and organizations, or until contexts are ready
  if (authLoading || orgLoading || !contextReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // User not authenticated, redirect to auth
  if (!user) {
    return null;
  }

  // User has no organizations, show onboarding
  if (userOrganizations.length === 0) {
    return <OrganizationOnboarding />;
  }

  // User has organizations but none are active/current, show message
  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Organization Pending</h1>
          <p className="text-muted-foreground mb-6">
            Your organization membership is pending approval.
          </p>
        </div>
      </div>
    );
  }

  // User has active organization, show dashboard
  return <Dashboard />;
};

export default Index;
