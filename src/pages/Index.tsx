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

  // User has active organization, show simple test view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="text-center max-w-2xl p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">✅ App Loaded Successfully!</h1>
        <p className="text-muted-foreground mb-4">
          You are logged in as: <strong>{user.email}</strong>
        </p>
        <p className="text-muted-foreground mb-4">
          Current Organization: <strong>{currentOrganization.name}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Total Organizations: {userOrganizations.length}
        </p>
        <div className="mt-6 p-4 bg-muted rounded">
          <p className="text-xs">
            If you see this message, the TDZ error is in the Dashboard component or its dependencies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
