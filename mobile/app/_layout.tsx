import { SplashScreen, Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState, AppStateStatus, LogBox } from 'react-native';
import SafeScreen from "../components/SafeScreen";

// Suppress expo-notifications warning in Expo Go (Android)
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import ErrorBoundary from "../components/ErrorBoundary";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
// import { usePermissions } from "../hooks/usePermissions";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { checkAuth, user, token, isCheckingAuth, isAuthLoading, hasCompletedOnboarding } = useAuthStore();
    const { hydrate } = useSocialStore();
    const isAuthenticated = !!(user && token);

    const [fontsLoaded] = useFonts({
        "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
    });

    // Splash screen hide is now handled by the Snap Redirector below
    // to ensure we only show the UI once the navigation is final.

    useEffect(() => {
        checkAuth();
        hydrate();
    }, []);

    // Connect socket when user is logged in
    const { connect, disconnect, socket, fetchUnreadCount: fetchNotifUnread } = useNotificationStore();
    const { addReceivedMessage, fetchUnreadCount: fetchMsgUnread, reset: resetMessages, setCurrentUserId, updateLocalMessagesRead, updateLocalMessageDelivered } = useMessageStore();
    const { showToast } = useUIStore();

    useEffect(() => {
        const userId = user?._id || user?.id;

        if (userId && token && !isCheckingAuth) {
            connect(userId);
            setCurrentUserId(userId);
            registerForPushNotificationsAsync(token).catch(err => console.error('[Push] Registration error:', err));
            fetchNotifUnread(token).catch(console.error);
            fetchMsgUnread(token).catch(console.error);
        } else if (!isCheckingAuth || !token) {
            // Immediate cleanup on logout or missing token
            disconnect();
            resetMessages();
            setCurrentUserId(null);
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
                const senderId = typeof message.sender === 'object' ? message.sender._id.toString() : String(message.sender);

                showToast({
                    title: `New Message from ${message.sender?.username || 'User'}`,
                    message: message.text || "📷 Image",
                    type: 'message',
                    relatedScreen: 'chat',
                    relatedChatId: senderId // Suppress only if viewing THIS chat
                });
            }
        };

        const handleNewNotification = (notification: any) => {
            fetchNotifUnread(token!).catch(console.error);
            showToast({
                title: "Notification",
                message: notification.message || "You have a new notification",
                type: 'info',
                relatedScreen: 'notifications'
            });
        };

        socket.on('new_message', handleNewMessage);
        socket.on('notification', handleNewNotification);

        // Real-time status ticks
        const handleMessagesRead = (data: any) => updateLocalMessagesRead(data);
        const handleMessageDelivered = (data: any) => updateLocalMessageDelivered(data);

        socket.on('messages_read', handleMessagesRead);
        socket.on('message_delivered', handleMessageDelivered);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('notification', handleNewNotification);
            socket.off('messages_read', handleMessagesRead);
            socket.off('message_delivered', handleMessageDelivered);
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

    const router = useRouter();
    // isAuthenticated is already defined above near line 31

    // Snap Redirector:
    // This ensures the navigator actually JUMPS to the correct stack
    // when the state changes (login, logout, onboarding finish).
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && !isCheckingAuth && fontsLoaded) {
            const timer = setTimeout(async () => {
                let target = '/(tabs)';
                if (!hasCompletedOnboarding) {
                    target = '/onboarding';
                } else if (!isAuthenticated) {
                    target = '/(auth)';
                }

                console.log(`ℹ️ [Nav] Redirecting to ${target}`);
                router.replace(target as any);

                // PRODUCTION-GRADE SMOOTHING:
                // We hide the splash screen only ONCE when the app is first ready.
                if (!isAppReady) {
                    setTimeout(async () => {
                        try {
                            await SplashScreen.hideAsync();
                            setIsAppReady(true);
                        } catch (e) {
                            console.warn('Error hiding splash screen:', e);
                        }
                    }, 100);
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, hasCompletedOnboarding, isAuthLoading, isCheckingAuth, fontsLoaded, isAppReady]);

    // ====================================================================
    // AUTH GATE: Prevent navigation rendering until auth state is resolved
    // ====================================================================
    if (!fontsLoaded || isCheckingAuth || isAuthLoading) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                        <Stack.Screen name="index" options={{ headerShown: false }} />

                        {/* 
                            STABILITY FIX:
                            We keep all major route groups loaded in the Stack definition.
                            This prevents React Navigation from "loosing context" or crashing
                            when 'isAuthenticated' changes and we perform a redirect.
                            Access control is handled by the `useEffect` redirector above.
                        */}
                        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

                        <Stack.Screen name="create-note" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="book-progress/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="book-edit" options={{ presentation: 'modal', headerShown: false }} />
                        <Stack.Screen name="book-detail" options={{ headerShown: false }} />
                        <Stack.Screen name="chat" options={{ headerShown: false }} />
                        <Stack.Screen name="author-dashboard" options={{ headerShown: false }} />
                        <Stack.Screen name="user-profile" options={{ headerShown: false }} />
                        <Stack.Screen name="followers-list" options={{ headerShown: false }} />
                    </Stack>
                    <StatusBar style="light" />
                    <GlobalAlert />
                    <Toast />
                </SafeAreaProvider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
