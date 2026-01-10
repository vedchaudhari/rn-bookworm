import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { useAuthStore } from "../store/authContext";
import { useSocialStore } from "../store/socialStore";
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from "../store/messageStore";
import { useEffect } from "react";
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
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    checkAuth();
    hydrate(); // Load persisted social state
  }, []);

  // handle navigation based on the auth state
  useEffect(() => {
    if (isCheckingAuth || !navigationState?.key) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    // Use a small timeout to ensure navigation occurs after mount
    const timer = setTimeout(() => {
      if (!isSignedIn && !inAuthScreen) router.replace("/(auth)");
      else if (isSignedIn && inAuthScreen) router.replace("/(tabs)");
    }, 0);

    return () => clearTimeout(timer);
  }, [user, token, segments, isCheckingAuth, navigationState]);

  // Connect socket when user is logged in
  const { connect, disconnect, socket } = useNotificationStore();
  const { addReceivedMessage } = useMessageStore();

  useEffect(() => {
    if (user && token) {
      connect(user.id);
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
