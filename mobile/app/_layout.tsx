import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState, AppStateStatus } from 'react-native';
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import ErrorBoundary from "../components/ErrorBoundary";

import { useAuthStore } from "../store/authContext";
import { useSocialStore } from "../store/socialStore";
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from "../store/messageStore";
import { useEffect, useRef } from "react";
import COLORS from "../constants/colors";
import { Socket } from "socket.io-client";

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
        hydrate();
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
    const { addReceivedMessage, fetchUnreadCount: fetchMsgUnread, reset: resetMessages } = useMessageStore();

    useEffect(() => {
        const userId = user?._id || user?.id;

        if (userId && token && !isCheckingAuth) {
            connect(userId);
            fetchNotifUnread(token).catch(console.error);
            fetchMsgUnread(token).catch(console.error);
        } else if (!isCheckingAuth) {
            disconnect();
            resetMessages();
        }

        // We handle disconnect in the else block above for explicit state changes
    }, [user?._id, user?.id, token, isCheckingAuth]);

    // Global listeners
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: any) => {
            addReceivedMessage(message);
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, addReceivedMessage]);

    // Handle App State (Online/Offline status)
    const appState = useRef<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Defensive guard: Ensure we have a valid userId before re-connecting
                const userId = user?._id || user?.id;
                if (userId && token && !isCheckingAuth) {
                    console.log("App active, refreshing connection/status...");
                    connect(userId);

                    // Fetch with error handling
                    Promise.allSettled([
                        fetchNotifUnread(token),
                        fetchMsgUnread(token)
                    ]).catch(console.error);
                } else if (!isCheckingAuth) {
                    // If state is missing on resume, try to check auth once more
                    try {
                        await checkAuth();
                    } catch (error) {
                        console.error("Failed to check auth on app resume:", error);
                    }
                }
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [user?._id, user?.id, token, isCheckingAuth]);

    return (
        <ErrorBoundary>
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
                    <Stack.Screen name="create-note" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="book-progress/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="book-edit" options={{ presentation: 'modal', headerShown: false }} />
                </Stack>
                <StatusBar style="light" />
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
