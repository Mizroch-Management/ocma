import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: string;
  fallbackPath?: string;
}

type AuthState = 'loggedOut' | 'pending' | 'authenticated' | 'insufficientRole';

export function AuthGuard({ 
  children, 
  requireAuth = true,
  requireRole,
  fallbackPath = '/auth'
}: AuthGuardProps) {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          if (mounted) {
            setAuthState('loggedOut');
          }
          return;
        }

        if (!session) {
          if (mounted) {
            setAuthState('loggedOut');
          }
          return;
        }

        // Check if token needs refresh
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const needsRefresh = expiresAt - Date.now() < 60000; // Less than 1 minute

        if (needsRefresh) {
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession();
          
          if (refreshError || !refreshedSession) {
            if (mounted) {
              setAuthState('loggedOut');
            }
            return;
          }
        }

        // Check user role if required
        if (requireRole) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            if (mounted) {
              setAuthState('authenticated');
              setUserRole(null);
            }
            return;
          }

          if (profile.role !== requireRole) {
            if (mounted) {
              setAuthState('insufficientRole');
              setUserRole(profile.role);
            }
            return;
          }

          if (mounted) {
            setUserRole(profile.role);
          }
        }

        if (mounted) {
          setAuthState('authenticated');
        }
      } catch (error) {
        console.error('Unexpected auth error:', error);
        if (mounted) {
          setAuthState('loggedOut');
        }
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed in guard:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          if (mounted) {
            setAuthState('loggedOut');
            setUserRole(null);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-check auth when signed in or token refreshed
          checkAuth();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requireAuth, requireRole]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (authState === 'pending') return;

    if (requireAuth && authState === 'loggedOut') {
      // Save intended destination
      const returnUrl = location.pathname + location.search;
      navigate(`${fallbackPath}?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else if (authState === 'insufficientRole') {
      navigate('/unauthorized');
    }
  }, [authState, requireAuth, fallbackPath, navigate, location]);

  // Render based on state
  if (authState === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && authState === 'loggedOut') {
    return null; // Navigation will happen in useEffect
  }

  if (authState === 'insufficientRole') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You need {requireRole} role to access this page.
            {userRole && ` Your current role is: ${userRole}.`}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}