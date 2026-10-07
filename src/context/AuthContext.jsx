import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '../services/supabase';
import { StudentTheme, DarkTheme } from '../theme';

const AuthContext = createContext(undefined);

/*
 * Convert a Supabase profile into the user shape
 * expected throughout the existing CampusFix app.
 *
 * Supabase:
 *   hostel
 *   room
 *
 * Existing app:
 *   hostelBlock
 *   roomNumber
 *
 * We provide BOTH so existing screens continue
 * working without breaking.
 */
const normalizeProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    ...profile,

    hostelBlock:
      profile.hostel ?? profile.hostelBlock ?? null,

    roomNumber:
      profile.room ?? profile.roomNumber ?? null,

    phone:
      profile.phone ?? null,
  };
};

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
        console.warn(
          'Failed to load Supabase session:',
          error
        );

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
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (session?.user) {
          setTimeout(() => {
            loadProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (authUserId) => {
    try {
      const {
        data: profile,
        error,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        throw error;
      }

      setUser(normalizeProfile(profile));
    } catch (error) {
      console.warn(
        'Failed to load user profile:',
        error
      );

      setUser(null);
    }
  };

  /*
   * LOGIN
   */
  const login = async (
    email,
    password,
    expectedRole
  ) => {
    const cleanEmail = email
      .trim()
      .toLowerCase();

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        'Login failed. No user returned.'
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
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

    /*
     * Prevent a user from selecting one role
     * and logging in with another role's account.
     */
    if (profile.role !== expectedRole) {
      await supabase.auth.signOut();

      throw new Error(
        `This account is registered as ${profile.role}, not ${expectedRole}.`
      );
    }

    const normalizedUser =
      normalizeProfile(profile);

    setUser(normalizedUser);

    return normalizedUser;
  };

  /*
   * SIGN UP
   */
  const signup = async ({
    name,
    email,
    password,
    role,
    phone,
    hostel,
    room,
    specialization,
  }) => {
    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanName = name.trim();

    /*
     * Create Supabase Auth account.
     */
    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role,
          phone: phone?.trim() || null,
          hostel: hostel?.trim() || null,
          room: room?.trim() || null,
          specialization:
            specialization?.trim() || null,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        'Account creation failed.'
      );
    }

    /*
     * Confirm email is currently disabled in
     * your Supabase project, so a session should
     * be returned immediately.
     */
    if (!data.session) {
      throw new Error(
        'Account created. Please confirm your email and then log in.'
      );
    }

    const authUserId = data.user.id;

    /*
     * Generate a unique CampusFix profile ID.
     */
    const profileId =
      `usr_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

    /*
     * Create the CampusFix profile.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        auth_user_id: authUserId,
        name: cleanName,
        email: cleanEmail,
        role,
        phone: phone?.trim() || null,
        hostel: hostel?.trim() || null,
        room: room?.trim() || null,
      })
      .select()
      .single();

    if (profileError) {
      await supabase.auth.signOut();

      throw new Error(
        `Profile creation failed: ${profileError.message}`
      );
    }

    /*
     * Technicians also need a record in the
     * technicians table.
     */
    if (role === 'TECHNICIAN') {
      const technicianId =
        `tech_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      const {
        error: technicianError,
      } = await supabase
        .from('technicians')
        .insert({
          id: technicianId,
          profile_id: profile.id,
          specialization:
            specialization?.trim() || null,
          specialization_label:
            specialization?.trim() || null,
          active_tasks_count: 0,
          rating: 0,
          availability: 'AVAILABLE',
        });

      if (technicianError) {
        /*
         * Remove the auth session if technician
         * profile creation fails.
         */
        await supabase.auth.signOut();

        throw new Error(
          `Technician profile creation failed: ${technicianError.message}`
        );
      }
    }

    const normalizedUser =
      normalizeProfile(profile);

    setUser(normalizedUser);

    return normalizedUser;
  };

  /*
   * LOGOUT
   */
  const logout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
    } catch (error) {
      console.warn(
        'Logout failed:',
        error
      );
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
        signup,
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