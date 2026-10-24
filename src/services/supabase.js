
import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const getEnvOrExtra = (envKey, extraKey) => {
  const envVal =
    typeof process !== 'undefined' && process?.env
      ? process.env[envKey]
      : undefined;
  if (envVal) return envVal;

  const extra =
    Constants?.expoConfig?.extra ||
    Constants?.manifest2?.extra?.expoClient?.extra ||
    Constants?.manifest?.extra;

  if (extra && extra[extraKey]) {
    return extra[extraKey];
  }

  return undefined;
};

const supabaseUrl = getEnvOrExtra(
  'EXPO_PUBLIC_SUPABASE_URL',
  'supabaseUrl'
);
const supabasePublishableKey = getEnvOrExtra(
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'supabasePublishableKey'
);

let configError = null;
if (!supabaseUrl) {
  configError = 'Missing EXPO_PUBLIC_SUPABASE_URL';
} else if (!supabasePublishableKey) {
  configError = 'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
}

export const supabaseConfigError = configError;
export const isSupabaseConfigured = !configError;

if (configError) {
  console.error('[CampusFix] Supabase configuration error:', configError);
}

const createMissingConfigClient = (errMsg) => {
  const rejector = () => Promise.reject(new Error(errMsg));
  const builder = () =>
    new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop === 'then') return undefined;
          return builder();
        },
        apply: () => Promise.reject(new Error(errMsg)),
      }
    );

  return {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: new Error(errMsg),
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: rejector,
      signUp: rejector,
      verifyOtp: rejector,
      resend: rejector,
      signOut: async () => ({ error: null }),
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
    },
    from: () => builder(),
    rpc: rejector,
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
  };
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },

      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (attempts) =>
          Math.min(1000 * 2 ** attempts, 10000),
      },
    })
  : createMissingConfigClient(configError);

// Refresh tokens while the native app is active.
if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

