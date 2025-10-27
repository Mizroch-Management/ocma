import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Session refresh function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        return { error };
      }
      setSession(session);
      setUser(session?.user ?? null);
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      console.error('Session refresh error:', authError);
      return { error: authError };
    }
  }, []);

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) {
          console.debug('Auth state changed', { event, hasSession: Boolean(session) });
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Clear existing refresh timer
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }

        // Set up automatic token refresh if we have a session
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000; // Convert to milliseconds
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          const refreshTime = Math.max(timeUntilExpiry - 60000, 30000); // Refresh 1 min before expiry, but at least 30s from now

          if (refreshTime > 0) {
            refreshTimer = setTimeout(async () => {
              if (import.meta.env.DEV) {
                console.debug('Auto-refreshing session...');
              }
              await refreshSession();
            }, refreshTime);
          }
        }

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (import.meta.env.DEV && event === 'TOKEN_REFRESHED') {
          console.debug('Token refreshed successfully');
        } else if (import.meta.env.DEV && event === 'SIGNED_IN') {
          console.debug('User signed in');
        }
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to get initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [refreshSession]);

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      } else {
        toast.success('Check your email for the confirmation link!');
        return { error: null };
      }
    } catch (error) {
      const authError = error as AuthError;
      toast.error('An unexpected error occurred');
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      } else {
        toast.success('Welcome back!');
        return { error: null };
      }
    } catch (error) {
      const authError = error as AuthError;
      toast.error('An unexpected error occurred');
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        return { error };
      } else {
        toast.success('Signed out successfully');
        return { error: null };
      }
    } catch (error) {
      const authError = error as AuthError;
      toast.error('An unexpected error occurred');
      return { error: authError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
