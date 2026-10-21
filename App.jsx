
import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
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
import { supabase } from './src/services/supabase';

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
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!session) {
    throw new Error('No active Supabase Auth session');
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
          JSON.stringify({
            code: error?.code,
            message: error?.message ?? String(error),
            details: error?.details,
            hint: error?.hint,
          })
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
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

// --------------------------------------------------
// FONT LOADING SCREEN
// --------------------------------------------------

const FontLoadingScreen = () => {
  const { theme } = useAuth();

  return (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text
        style={[
          styles.loadingTitle,
          { color: theme.colors.textPrimary },
        ]}
      >
        CAMPUSFIX
      </Text>

      <Text
        style={[
          styles.loadingText,
          { color: theme.colors.textSecondary },
        ]}
      >
        Loading design assets...
      </Text>
    </View>
  );
};

// --------------------------------------------------
// APP
// --------------------------------------------------

export default function App() {
  const [fontsLoaded] = useFonts({
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

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ComplaintsProvider>
          {fontsLoaded ? <MainApp /> : <FontLoadingScreen />}
        </ComplaintsProvider>
      </AuthProvider>
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
  },

  loadingTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 8,
  },

  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
