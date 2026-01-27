/*
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
*/

/**
 * Register for push notifications and sync token with backend
 * [DISABLED] - Commented out to remove push functionality
 */
export async function registerForPushNotificationsAsync() {
    console.log('ℹ️ [Push] Registration is currently disabled.');
    return null;

    /*
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
        ... existing logic ...
    }
    */
}

