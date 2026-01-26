import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from './apiClient';

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

/**
 * Register for push notifications and sync token with backend
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00E5FF', // Bookworm Primary Color
        });
    }

    //currently notification not work so setting it to true (Device.isDevice)
    if (false) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        console.log('🔍 [Push] Existing Permission Status:', existingStatus);

        if (existingStatus !== 'granted') {
            console.log('🔄 [Push] Requesting new permissions...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        console.log('🔍 [Push] Final Permission Status:', finalStatus);

        if (finalStatus !== 'granted') {
            console.error('❌ [Push] Permission NOT granted. Token generation aborted.');
            return null;
        }

        try {
            // Debug logs to see what's happening
            console.log('🔍 [Push] Constants.expoConfig exists?', !!Constants.expoConfig);
            console.log('🔍 [Push] Constants.easConfig exists?', !!Constants.easConfig);

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId ??
                'd0e906ea-20d4-4f39-965a-28e39c4686b1'; // Fallback to the ID found in app.json

            console.log('🔄 [Push] Using Project ID:', projectId);

            token = (await Notifications.getExpoPushTokenAsync({
                projectId
            })).data;
            console.log("Token: ", token);
            console.log('✅ [Push] Token generated successfully!');
        } catch (e: any) {
            console.error('❌ [Push] Token generation FAILED.');
            console.error('Error Code:', e.code || 'N/A');
            console.error('Reason:', e.message || 'Unknown Error');

            if (e.message?.includes('not logged in') || e.code === 'NOT_LOGGED_IN') {
                console.error('💡 PRO-TIP: You are not logged into Expo. Run "npx expo login" in your terminal.');
            } else if (e.message?.includes('Google Play Services')) {
                console.error('💡 PRO-TIP: Ensure your device has Google Play Services enabled and is a physical device.');
            } else {
                console.error('💡 PRO-TIP: Check the "Reason" above.');
                console.error('If it says "Project not found", ensure you are logged into the correct Expo account.');
                console.error('Current Account Status could be checked by running "npx expo whoami".');
            }
        }
    } else {
        console.log('⚠️ [Push] Skipping token generation: Must use a PHYSICAL DEVICE for Push Notifications.');
    }

    if (token) {
        // Sync token with backend
        try {
            await apiClient.post('/api/notifications/register-token', { token });
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 EXPO PUSH TOKEN:', token);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } catch (error) {
            console.error('[Push] Failed to sync token with backend:', error);
        }
    }

    return token;
}
