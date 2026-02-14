import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';

// Configure how notifications are handled when the app is foregrounded
// We set this globally to ensure foreground notifications don't show system alerts
// but we still process them in our listeners.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: false, // Don't show in notification tray when app is active
    }),
});

export async function registerForPushNotificationsAsync(token: string) {
    if (Constants.executionEnvironment === 'storeClient') {
        console.log('ℹ️ [Push] Skipping registration in Expo Go.');
        return null;
    }

    if (!Device.isDevice) {
        console.warn('⚠️ [Push] You are on a simulator. Push notifications may not appear visually, but we will still attempt to register a token for testing.');
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('ℹ️ [Push] Failed to get push token for push notification!');
            return null;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
            console.error('❌ [Push] Missing projectId in app.json extra.eas.projectId. Expo Push Tokens require a projectId.');
            return null;
        }

        const expoToken = (await Notifications.getExpoPushTokenAsync({
            projectId,
        })).data;

        console.log('ℹ️ [Push] Token received:', expoToken);
        console.log('ℹ️ [Push] Project ID used:', projectId);

        // Sync with backend
        const response = await fetch(`${API_URL}/api/notifications/register-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: expoToken }),
        });

        if (!response.ok) {
            console.error('❌ [Push] Failed to sync token with backend');
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00E5FF',
            });
        }

        return expoToken;
    } catch (error) {
        console.error('❌ [Push] Error registering for push notifications:', error);
        return null;
    }
}

/**
 * Handle notification response (tap)
 */
const handleNotificationResponse = (response: Notifications.NotificationResponse, router: any) => {
    const data = response.notification.request.content.data;
    console.log('[Push] Notification response received:', data);

    // Access store state directly to check if we are already in this conversation
    const activeConversation = useMessageStore.getState().activeConversation;

    if (data?.type === 'MESSAGE' && data.senderId) {
        const targetUserId = String(data.senderId);

        // If we are already in the chat with this user, do not push a new screen
        if (activeConversation === targetUserId) {
            console.log('[Push] Already in active conversation with', targetUserId, '- skipping navigation');
            return;
        }

        // Push to chat
        router.push({
            pathname: '/chat',
            params: {
                userId: targetUserId,
                username: String(data.senderName || 'Chat'),
                profileImage: String(data.profileImage || '')
            }
        });
    } else if (data?.type === 'NEW_POST' && data.bookId) {
        router.push({
            pathname: '/book/[id]',
            params: { id: String(data.bookId) }
        });
    } else if (data?.type === 'LIKE' || data?.type === 'COMMENT' || data?.type === 'FOLLOW') {
        router.push('/(tabs)/notifications');
    } else {
        // Fallback: redirect to feed screen for any unhandled notification types
        console.log('[Push] Unhandled notification type, redirecting to feed:', data?.type);
        router.push('/(tabs)');
    }
};

/**
 * Check if app was opened by a notification (Cold Start)
 */
export const checkInitialNotification = async (router: any) => {
    if (Constants.executionEnvironment === 'storeClient') return;

    try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
            console.log('[Push] App opened via notification (Cold Start)');
            // Small delay to ensure navigation is ready
            setTimeout(() => handleNotificationResponse(response, router), 500);
        }
    } catch (error) {
        console.warn('[Push] Error checking initial notification:', error);
    }
};

/**
 * Setup listeners for when notifications are received or interacted with
 */
export function setupPushNotificationListeners(router: any) {
    if (Constants.executionEnvironment === 'storeClient') {
        // console.log('ℹ️ [Push] Skipping listeners in Expo Go to avoid SDK warnings.');
        return () => { };
    }

    try {
        // Standard listeners for real push notifications
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            console.log('[Push] Notification received in foreground:', data);

            // If we receive a message in foreground, we should sync our store
            // especially if the socket might be lagging or disconnected
            if (data?.type === 'MESSAGE' && data.senderId) {
                const activeConversation = useMessageStore.getState().activeConversation;
                const token = useAuthStore.getState().token;

                if (activeConversation === String(data.senderId) && token) {
                    console.log('[Push] Foreground message for active chat - refreshing...');
                    useMessageStore.getState().fetchMessages(String(data.senderId), token);
                }
            }
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            handleNotificationResponse(response, router);
        });

        return () => {
            if (notificationListener) notificationListener.remove();
            if (responseListener) responseListener.remove();
        };
    } catch (err) {
        console.warn('⚠️ [Push] Failed to initialize listeners. Notifications may be unsupported in this environment.');
        return () => { };
    }
}

