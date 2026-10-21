
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '../services/supabase';
import { StudentTheme, DarkTheme } from '../theme';

const AuthContext = createContext(undefined);

const normalizeProfile = (profile) => {
  if (!profile) return null;

  return {
    ...profile,
    hostelBlock: profile.hostel ?? profile.hostelBlock ?? null,
    roomNumber: profile.room ?? profile.roomNumber ?? null,
    phone: profile.phone ?? null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the CampusFix profile for an authenticated user.
  const loadProfile = async (authUserId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) throw error;

      setUser(normalizeProfile(data));
      return data;
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted && session?.user) {
          await loadProfile(session.user.id);
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.warn('Failed to restore session:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        // Avoid awaiting Supabase queries inside this callback.
        setTimeout(() => {
          if (mounted) loadProfile(session.user.id);
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

  // Create the CampusFix profile after email verification.
  const createCampusFixProfile = async (authUser) => {
    const metadata = authUser.user_metadata || {};
    const authUserId = authUser.id;
    const email = (authUser.email || '').trim().toLowerCase();

    if (!email) {
      throw new Error('The verified account has no email address.');
    }

    const name = (metadata.name || '').trim();
    const role = metadata.role;

    if (!name || !['STUDENT', 'TECHNICIAN', 'WARDEN'].includes(role)) {
      throw new Error(
        'Registration details are missing. Please contact support.'
      );
    }

    // Avoid creating duplicate profiles if verification is retried.
    const { data: existingProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existingProfile) {
      if (existingProfile.role !== role) {
        throw new Error('Your account role does not match your profile.');
      }

      if (role === 'TECHNICIAN') {
        await ensureTechnicianRecord(existingProfile, metadata);
      }

      const normalized = normalizeProfile(existingProfile);
      setUser(normalized);
      return normalized;
    }

    const profileId =
      `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const profileValues = {
      id: profileId,
      auth_user_id: authUserId,
      name,
      email,
      role,
      phone: metadata.phone || null,
      hostel: metadata.hostel || null,
      room: metadata.room || null,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileValues)
      .select()
      .single();

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    if (role === 'TECHNICIAN') {
      try {
        await ensureTechnicianRecord(profile, metadata);
      } catch (error) {
        // Keep the verified account and profile so this operation
        // can be retried without requiring the user to sign up again.
        throw new Error(
          `Your account is verified, but technician setup failed: ${error.message}`
        );
      }
    }

    const normalized = normalizeProfile(profile);
    setUser(normalized);
    return normalized;
  };

  const ensureTechnicianRecord = async (profile, metadata) => {
    const { data: existing, error: lookupError } = await supabase
      .from('technicians')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) return;

    const specialization = metadata.specialization || null;

    const { error } = await supabase.from('technicians').insert({
      id: `tech_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      profile_id: profile.id,
      specialization,
      specialization_label: specialization,
      active_tasks_count: 0,
      rating: 0,
      availability: 'AVAILABLE',
    });

    if (error) throw error;
  };

  // LOGIN
  const login = async (email, password, expectedRole) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) throw error;
    if (!data?.user) throw new Error('Login failed. No user returned.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

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

    const normalized = normalizeProfile(profile);
    setUser(normalized);
    return normalized;
  };

  // SIGN UP: request verification; do not create the profile yet.
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role,
          phone: phone?.trim() || null,
          hostel: hostel?.trim() || null,
          room: room?.trim() || null,
          specialization: specialization?.trim() || null,
        },
      },
    });

    if (error) throw error;
    if (!data?.user) throw new Error('Account creation failed.');

    if (!data.session) {
      return {
        requiresVerification: true,
        email: cleanEmail,
      };
    }

    // If email confirmation is disabled, Supabase returns a session.
    // Keep the behavior safe if the project setting changes.
    return {
      requiresVerification: false,
      email: cleanEmail,
      user: await createCampusFixProfile(data.user),
    };
  };

  // VERIFY SIGNUP OTP
  const verifySignupOtp = async (email, token) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!/^\d{6,8}$/.test(cleanToken)) {
      throw new Error('Enter the verification code from your email.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) throw error;
    if (!data?.user) {
      throw new Error('Email verification failed. Please try again.');
    }

    return createCampusFixProfile(data.user);
  };

  // RESEND SIGNUP OTP
  const resendSignupOtp = async (email) => {
    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    if (error) throw error;
  };

  // LOGOUT
  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
    setUser(null);
  };

  const currentRole = user?.role || null;
  const currentTheme =
    currentRole === 'STUDENT' ? StudentTheme : DarkTheme;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        theme: currentTheme,
        isLoading,
        login,
        signup,
        verifySignupOtp,
        resendSignupOtp,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
