
import React, { Component, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

import {
  AuthProvider,
  useAuth,
} from './src/context/AuthContext';

import { ComplaintsProvider } from './src/context/ComplaintsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { supabase, supabaseConfigError } from './src/services/supabase';

// --------------------------------------------------
// NOTIFICATION HANDLER
// --------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --------------------------------------------------
// REGISTER FOR PUSH NOTIFICATIONS
// --------------------------------------------------

const registerForPushNotificationsAsync = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'campusfix-default',
        {
          name: 'CampusFix Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        }
      );
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.error('[Notifications] EAS project ID not found');
      return null;
    }

    console.log('[Notifications] EAS Project ID:', projectId);

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('[Notifications] Expo Push Token generated');

    return token.data;
  } catch (error) {
    console.error('[Notifications] Registration failed:', error);
    return null;
  }
};

// --------------------------------------------------
// SAVE PUSH TOKEN THROUGH SECURE DATABASE FUNCTION
// --------------------------------------------------

const savePushToken = async (userId, token) => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session) {
      console.warn('[Notifications] No active Supabase Auth session');
      return;
    }

    console.log(
      '[Notifications] Authenticated Supabase user:',
      session.user.id
    );

    const { error } = await supabase.rpc('register_push_token', {
      p_user_id: userId,
      p_token: token,
      p_platform: Platform.OS,
    });

    if (error) throw error;

    console.log(
      '[Notifications] Push token saved for user:',
      userId
    );
  } catch (error) {
    console.warn('[Notifications] Could not save push token:', error?.message || error);
  }
};

// --------------------------------------------------
// NOTIFICATION SETUP
// --------------------------------------------------

const NotificationSetup = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let notificationListener;
    let responseListener;

    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();

      if (!token || cancelled) return;

      console.log(
        '[Notifications] Saving push token for profile:',
        user.id
      );

      try {
        await savePushToken(user.id, token);
      } catch (error) {
        if (cancelled) return;

        console.error(
          '[Notifications] Failed to save push token:',
          error?.message || error
        );
      }
    };

    setupNotifications().catch((error) => {
      console.error('[Notifications] Setup failed:', error);
    });

    notificationListener =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log(
            '[Notifications] Received:',
            notification.request.content.title
          );
        }
      );

    responseListener =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log(
            '[Notifications] Notification opened:',
            response.notification.request.content.data
          );
        }
      );

    return () => {
      cancelled = true;
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, [user?.id]);

  return null;
};

// --------------------------------------------------
// MAIN APP
// --------------------------------------------------

const MainApp = () => {
  const { theme } = useAuth();

  return (
    <>
      <NotificationSetup />
      <StatusBar style={theme?.isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

// --------------------------------------------------
// CONFIGURATION ERROR SCREEN
// --------------------------------------------------

const ConfigurationErrorScreen = ({ error }) => {
  return (
    <View style={styles.configErrorContainer}>
      <Text style={styles.configBadge}>CONFIGURATION ERROR</Text>
      <Text style={styles.configTitle}>CampusFix Setup</Text>
      <View style={styles.configCard}>
        <Text style={styles.configCardLabel}>Missing Environment Variable:</Text>
        <Text style={styles.configCardError}>{error}</Text>
      </View>
      <Text style={styles.configInstructions}>
        Please ensure your .env file contains valid credentials:
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_URL=https://...</Text>
        <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_...</Text>
      </View>
      <Text style={styles.configFootnote}>
        Then restart the Metro bundler with cache cleared:
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>npx expo start --clear</Text>
      </View>
    </View>
  );
};

// --------------------------------------------------
// FONT LOADING SCREEN
// --------------------------------------------------

const FontLoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>CAMPUSFIX</Text>
      <Text style={styles.loadingText}>Loading design assets...</Text>
    </View>
  );
};

// --------------------------------------------------
// ROOT ERROR BOUNDARY
// --------------------------------------------------

class RootErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CampusFix] RootErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorBadge}>RUNTIME RECOVERY</Text>
          <Text style={styles.errorTitle}>Application Error</Text>
          <Text style={styles.errorDescription}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// --------------------------------------------------
// APP
// --------------------------------------------------

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const isReady = fontsLoaded || !!fontError;

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        {supabaseConfigError ? (
          <ConfigurationErrorScreen error={supabaseConfigError} />
        ) : (
          <AuthProvider>
            <ComplaintsProvider>
              {isReady ? <MainApp /> : <FontLoadingScreen />}
            </ComplaintsProvider>
          </AuthProvider>
        )}
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F3EEE4',
  },

  loadingTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    color: '#24262B',
  },

  loadingText: {
    fontSize: 14,
    color: '#717684',
  },

  configErrorContainer: {
    flex: 1,
    backgroundColor: '#1A1C20',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  configBadge: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  configTitle: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },

  configCard: {
    backgroundColor: '#272A30',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 20,
  },

  configCardLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  configCardError: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '700',
  },

  configInstructions: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },

  configFootnote: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
  },

  codeBox: {
    backgroundColor: '#111215',
    padding: 12,
    borderRadius: 8,
  },

  codeText: {
    color: '#34D399',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  errorContainer: {
    flex: 1,
    backgroundColor: '#1A1C20',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  errorBadge: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  errorTitle: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },

  errorDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

