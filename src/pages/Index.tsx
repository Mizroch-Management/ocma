import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { OrganizationOnboarding } from '@/components/organization/organization-onboarding';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { userOrganizations, loading: orgLoading, currentOrganization } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth and organizations
  if (authLoading || orgLoading) {
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
            Your organization membership is pending approval. Please wait for an administrator to activate your organization.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll receive access once your organization is approved.
          </p>
        </div>
      </div>
    );
  }

  // User has active organization, show dashboard
  return <Dashboard />;
};

export default Index;
