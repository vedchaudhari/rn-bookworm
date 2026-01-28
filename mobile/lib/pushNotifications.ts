import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync(token: string) {
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

        const expoToken = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;

        console.log('ℹ️ [Push] Token received:', expoToken);

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

