import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen"
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authContext";
import { useEffect } from "react";

export default function RootLayout() {
  const router = useRouter();
  const segment = useSegments();

  const { checkAuth, user, token, isLoading } = useAuthStore();

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
    }
    verifyAuth();
  }, []);

  useEffect(() => {
    if (!segment || segment.length === 0) return;
    const inAuthScreen = segment[0] === "(auth)";
    const isSignedIn = user && token;

    if (!isSignedIn && !inAuthScreen) router.replace("/(auth)");
    else if (isSignedIn && inAuthScreen) router.replace("/(tabs)");
  }, [isLoading, user, segment, token]);

  console.log(segment)
  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }} >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeScreen>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
