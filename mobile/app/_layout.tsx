import { SplashScreen, Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState, AppStateStatus, LogBox } from 'react-native';
import SafeScreen from "../components/SafeScreen";

// Suppress expo-notifications warning in Expo Go (Android)
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import ErrorBoundary from "../components/ErrorBoundary";

import { useAuthStore } from "../store/authContext";
import { useSocialStore } from "../store/socialStore";
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from "../store/messageStore";
import { useEffect, useRef, useState } from "react";
import COLORS from "../constants/colors";
import { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

import GlobalAlert from "../components/GlobalAlert";
import Toast from "../components/Toast";
import { useUIStore } from "../store/uiStore";
import { registerForPushNotificationsAsync, setupPushNotificationListeners } from "../lib/pushNotifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { checkAuth, user, token, isCheckingAuth, isAuthLoading } = useAuthStore();
    const { hydrate } = useSocialStore();

    const [fontsLoaded] = useFonts({
        "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded && !isAuthLoading) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, isAuthLoading]);

    useEffect(() => {
        checkAuth();
        hydrate();
    }, []);

    // Connect socket when user is logged in
    const { connect, disconnect, socket, fetchUnreadCount: fetchNotifUnread } = useNotificationStore();
    const { addReceivedMessage, fetchUnreadCount: fetchMsgUnread, reset: resetMessages } = useMessageStore();
    const { showToast } = useUIStore();

    useEffect(() => {
        const userId = user?._id || user?.id;

        if (userId && token && !isCheckingAuth) {
            connect(userId);
            registerForPushNotificationsAsync(token).catch(err => console.error('[Push] Registration error:', err));
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
            const currentUserId = user?._id || user?.id;
            if (currentUserId) {
                addReceivedMessage(message, currentUserId);
            }
            // Only show toast if it's not from self
            if (message.sender?._id !== currentUserId) {

                showToast({
                    title: `New Message from ${message.sender?.username || 'User'}`,
                    message: message.text || "📷 Image",
                    type: 'message'
                });
            }
        };

        const handleNewNotification = (notification: any) => {
            fetchNotifUnread(token!).catch(console.error);
            showToast({
                title: "Notification",
                message: notification.message || "You have a new notification",
                type: 'info'
            });
        };

        socket.on('new_message', handleNewMessage);
        socket.on('notification', handleNewNotification);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('notification', handleNewNotification);
        };
    }, [socket, addReceivedMessage, showToast, user?._id, user?.id, token]);

    // Push Notification Listeners
    useEffect(() => {
        const cleanup = setupPushNotificationListeners(router);
        return () => {
            if (cleanup) cleanup();
        };
    }, []);

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

    // Determine authentication status
    const isAuthenticated = !!(user && token);
    const router = useRouter();

    // Force redirect based on auth state
    useEffect(() => {
        if (!isAuthLoading && !isCheckingAuth && fontsLoaded) {
            const checkOnboarding = async () => {
                const completed = await AsyncStorage.getItem('onboarding_completed');

                // Add a small delay to ensure navigator is mounted
                setTimeout(() => {
                    try {
                        if (!completed) {
                            router.replace('/onboarding');
                        } else if (isAuthenticated) {
                            router.replace('/(tabs)');
                        } else {
                            router.replace('/(auth)');
                        }
                    } catch (e) {
                        console.warn('Navigation failed, retrying...', e);
                    }
                }, 100);
            };
            checkOnboarding();
        }
    }, [isAuthenticated, isAuthLoading, isCheckingAuth, fontsLoaded]);

    // ====================================================================
    // AUTH GATE: Prevent navigation rendering until auth state is resolved
    // This eliminates the flicker where Home screen briefly appears before
    // Login screen for unauthenticated users
    // ====================================================================
    if (!fontsLoaded || isAuthLoading) {
        // Keep splash screen visible until ready
        return null;
    }

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
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="create-note" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="book-progress/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="book-edit" options={{ presentation: 'modal', headerShown: false }} />
                </Stack>
                <StatusBar style="light" />
                <GlobalAlert />
                <Toast />
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
