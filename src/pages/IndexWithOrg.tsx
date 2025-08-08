import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';

const IndexWithOrg = () => {
  const { user, loading: authLoading } = useAuth();
  const { userOrganizations, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('IndexWithOrg - State:', { 
      user, 
      authLoading, 
      userOrganizations,
      orgLoading 
    });
    
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, userOrganizations, orgLoading, navigate]);

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Test with OrganizationProvider but NO Dashboard
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-blue-600">✓ ORG TEST</h1>
        <h2 className="text-xl mb-4">Organization Provider Working!</h2>
        <p className="text-lg mb-2">User: {user.email}</p>
        <p className="text-sm mb-2">
          Organizations: {userOrganizations.length}
        </p>
        <div className="bg-green-100 p-4 rounded border border-green-300 text-left">
          <p className="text-sm font-semibold mb-2">Test Status:</p>
          <p className="text-xs">• Auth: ✓ Working</p>
          <p className="text-xs">• OrganizationProvider: ✓ Working</p>
          <p className="text-xs">• Dashboard: Not loaded</p>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          If you see this, the error is in Dashboard or its children
        </p>
      </div>
    </div>
  );
};

export default IndexWithOrg;