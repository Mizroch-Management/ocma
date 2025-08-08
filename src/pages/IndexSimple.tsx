import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const IndexSimple = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading auth...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Super simple test page - no organization hook, no dashboard
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Test Page - Login Successful!</h1>
        <p className="text-lg mb-2">User: {user.email}</p>
        <p className="text-sm text-gray-500">If you see this, the error is in the organization/dashboard components</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default IndexSimple;