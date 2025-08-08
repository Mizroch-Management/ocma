import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const IndexUltraSimple = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('IndexUltraSimple - Auth state:', { user, authLoading });
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading auth...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // ULTRA SIMPLE - NO ORGANIZATION, NO DASHBOARD, NO COMPLEX COMPONENTS
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-green-600">✓ SUCCESS!</h1>
        <h2 className="text-xl mb-4">Login Working!</h2>
        <p className="text-lg mb-2">User: {user.email}</p>
        <p className="text-sm text-gray-600 mb-4">
          This page bypasses OrganizationProvider completely.
        </p>
        <div className="bg-yellow-100 p-4 rounded border border-yellow-300 text-left">
          <p className="text-sm font-semibold mb-2">Debug Info:</p>
          <p className="text-xs">• Auth: ✓ Working</p>
          <p className="text-xs">• OrganizationProvider: Bypassed</p>
          <p className="text-xs">• Dashboard: Not loaded</p>
        </div>
        <button 
          onClick={() => {
            console.log('Refreshing page...');
            window.location.reload();
          }}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default IndexUltraSimple;