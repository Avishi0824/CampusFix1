import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '../services/supabase';
import { StudentTheme, DarkTheme } from '../theme';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          await loadProfile(session.user.id);
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.warn('Failed to load Supabase session:', error);

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        // Run outside the auth state-change callback to avoid
        // blocking Supabase's internal auth lock.
        setTimeout(() => {
          loadProfile(session.user.id);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (authUserId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        throw error;
      }

      setUser(data);
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      setUser(null);
    }
  };

  const login = async (email, password, expectedRole) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error('Login failed. No user returned.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      throw new Error(
        'Your account is not linked to a CampusFix profile.'
      );
    }

    if (profile.role !== expectedRole) {
      await supabase.auth.signOut();

      throw new Error(
        `This account is registered as ${profile.role}, not ${expectedRole}.`
      );
    }

    setUser(profile);

    return profile;
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  };

  const currentRole = user?.role || null;

  const currentTheme =
    currentRole === 'STUDENT'
      ? StudentTheme
      : DarkTheme;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        theme: currentTheme,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};