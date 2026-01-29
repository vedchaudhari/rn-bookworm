import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';

// Configure how notifications are handled when the app is foregrounded
if (Constants.executionEnvironment !== 'storeClient') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export async function registerForPushNotificationsAsync(token: string) {
    if (Constants.executionEnvironment === 'storeClient') {
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
            console.log('[Push] Notification received in foreground:', notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('[Push] Notification response received:', data);

            if (data?.type === 'MESSAGE' && data.senderId) {
                router.push({
                    pathname: '/chat',
                    params: {
                        userId: String(data.senderId),
                        username: String(data.senderName || 'Chat')
                    }
                });
            } else if (data?.type === 'NEW_POST' && data.bookId) {
                router.push({
                    pathname: '/book/[id]',
                    params: { id: String(data.bookId) }
                });
            } else if (data?.type === 'LIKE' || data?.type === 'COMMENT' || data?.type === 'FOLLOW') {
                router.push('/(tabs)/notifications');
            }
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

