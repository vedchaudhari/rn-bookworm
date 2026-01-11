import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState } from 'react-native';
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { useAuthStore } from "../store/authContext";
import { useSocialStore } from "../store/socialStore";
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from "../store/messageStore";
import { useEffect, useRef } from "react";
import COLORS from "../constants/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { checkAuth, user, token, isCheckingAuth } = useAuthStore();
  const { hydrate } = useSocialStore();

  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded && !isCheckingAuth) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isCheckingAuth]);

  useEffect(() => {
    checkAuth();
    hydrate(); // Load persisted social state
  }, []);

  // handle navigation based on the auth state
  useEffect(() => {
    if (isCheckingAuth || !navigationState?.key || !fontsLoaded) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    if (!isSignedIn && !inAuthScreen) {
      router.replace("/(auth)");
    } else if (isSignedIn && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [user, token, segments, isCheckingAuth, navigationState, fontsLoaded]);

  // Connect socket when user is logged in
  const { connect, disconnect, socket, fetchUnreadCount: fetchNotifUnread } = useNotificationStore();
  const { addReceivedMessage, fetchUnreadCount: fetchMsgUnread } = useMessageStore();

  useEffect(() => {
    if (user && token) {
      connect(user.id);
      // Fetch initial unread counts
      fetchNotifUnread(token);
      fetchMsgUnread(token);
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [user?.id, token]);

  // Global message listener
  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        addReceivedMessage(message);
      });
    }

    return () => {
      if (socket) socket.off('new_message');
    }

  }, [socket]);

  // Handle App State (Online/Offline status)
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (user && token) {
          console.log("App active, refreshing connection/status...");
          connect(user.id);
          // Optionally fetch unread counts again to be sure
          fetchNotifUnread(token);
          fetchMsgUnread(token);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, token]);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.textPrimary,
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
