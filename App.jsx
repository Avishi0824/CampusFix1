import React, {
  useEffect,
} from 'react';

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

import {
  ComplaintsProvider,
} from './src/context/ComplaintsContext';

import {
  RootNavigator,
} from './src/navigation/RootNavigator';

import {
  supabase,
} from './src/services/supabase';

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
    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'campusfix-default',
        {
          name: 'CampusFix Notifications',
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        }
      );
    }

    // Check existing permission
    const {
      status: existingStatus,
    } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Request permission if needed
    if (existingStatus !== 'granted') {
      const {
        status,
      } = await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn(
        '[Notifications] Permission not granted'
      );

      return null;
    }

    // Get EAS project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.error(
        '[Notifications] EAS project ID not found'
      );

      return null;
    }

    console.log(
      '[Notifications] EAS Project ID:',
      projectId
    );

    // Get Expo Push Token
    const token =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    console.log(
      '[Notifications] Expo Push Token:',
      token.data
    );

    return token.data;
  } catch (error) {
    console.error(
      '[Notifications] Registration failed:',
      error
    );

    return null;
  }
};

// --------------------------------------------------
// NOTIFICATION SETUP
// --------------------------------------------------

const NotificationSetup = () => {
  const { user } = useAuth();

 console.log(
  '[Notifications] Current user ID:',
  user?.id
);

  useEffect(() => {
    // Don't register a push token until
    // the CampusFix user is available.
    if (!user?.id) {
      return;
    }

    let notificationListener;
    let responseListener;

    const setupNotifications = async () => {
      const token =
        await registerForPushNotificationsAsync();

      if (!token) {
        return;
      }

      console.log(
        '[Notifications] Saving push token for user:',
        user.id
      );

      const {
        error,
      } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              'expo_push_token',
          }
        );

      if (error) {
        console.error(
          '[Notifications] Failed to save push token:',
          error
        );

        return;
      }

      console.log(
        '[Notifications] Push token saved for user:',
        user.id
      );
    };

    setupNotifications();

    // Notification received while app is open
    notificationListener =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log(
            '[Notifications] Received:',
            notification
          );
        }
      );

    // Notification tapped/opened
    responseListener =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log(
            '[Notifications] Notification opened:',
            response
          );
        }
      );

    return () => {
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

      <StatusBar
        style={
          theme.isDark
            ? 'light'
            : 'dark'
        }
      />

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
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >
      <Text
        style={[
          styles.loadingTitle,
          {
            color:
              theme.colors.textPrimary,
          },
        ]}
      >
        CAMPUSFIX
      </Text>

      <Text
        style={[
          styles.loadingText,
          {
            color:
              theme.colors.textSecondary,
          },
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
          {fontsLoaded ? (
            <MainApp />
          ) : (
            <FontLoadingScreen />
          )}
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
    fontFamily:
      'PlayfairDisplay_700Bold',
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 8,
  },

  loadingText: {
    fontFamily:
      'Inter_400Regular',
    fontSize: 14,
  },
});