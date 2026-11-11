import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isSupabaseConfigured, getSupabaseClient } from '@/services/supabase';
import { signInWithGoogle, signOutFromGoogle } from '@/services/google-auth';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isAuthenticated: boolean;
  authError: string;
  clearAuthError: () => void;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void Promise.resolve()
      .then(() => {
        const supabase = getSupabaseClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          setUser(session?.user ?? null);
          setIsLoading(false);
        });
        unsubscribe = () => subscription.unsubscribe();
        return supabase.auth.getSession();
      })
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setUser(data.session?.user ?? null);
      })
      .catch(error => {
        if (active) {
          setAuthError(error instanceof Error ? error.message : 'Could not restore your sign-in.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      return await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      setAuthError(message);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError('');
    try {
      await signOutFromGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign out.';
      setAuthError(message);
      throw error;
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(''), []);
  const value = useMemo(
    () => ({
      user,
      isLoading,
      isSigningIn,
      isAuthenticated: Boolean(user && !user.is_anonymous),
      authError,
      clearAuthError,
      signIn,
      signOut,
    }),
    [user, isLoading, isSigningIn, authError, clearAuthError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
