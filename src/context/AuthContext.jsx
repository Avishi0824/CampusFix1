import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import { Storage, StorageKeys } from '../services/storage';
import { DEMO_USERS } from '../services/mockApi';
import { StudentTheme, DarkTheme } from '../theme';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    try {
      const savedUser = await Storage.getItem(
        StorageKeys.CURRENT_USER,
        null
      );

      if (savedUser) {
        setUser(savedUser);
      } else {
        // No saved session → show Role Selection/Login screen
        setUser(null);
      }
    } catch (e) {
      console.warn('Failed to load session:', e);

      // If session loading fails, show Login screen
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (role, customUser) => {
    const baseUser = DEMO_USERS[role];

    const loggedUser = {
      ...baseUser,
      ...customUser,
      role,
    };

    setUser(loggedUser);

    await Storage.setItem(
      StorageKeys.CURRENT_USER,
      loggedUser
    );
  };

  const switchRole = async (newRole) => {
    const newUser = DEMO_USERS[newRole];

    setUser(newUser);

    await Storage.setItem(
      StorageKeys.CURRENT_USER,
      newUser
    );
  };

  const logout = async () => {
    setUser(null);

    await Storage.removeItem(
      StorageKeys.CURRENT_USER
    );
  };

  const currentRole = user?.role || 'student';

  const currentTheme =
    currentRole === 'student'
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
        switchRole,
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