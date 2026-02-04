import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export const usePermissions = () => {
    useEffect(() => {
        const requestAllPermissions = async () => {
            try {
                // 1. Camera Permissions (for ISBN Scanner)
                const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
                console.log('[Permissions] Camera status:', cameraStatus);

                // 2. Media Library Permissions (for Profile Image & Chat Media)
                const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                console.log('[Permissions] Media Library status:', libraryStatus);

                // 3. Optional: Specific Media Library Save permissions if needed separately
                // Some versions of Android/iOS behave differently for picking vs saving
                const { status: saveStatus } = await MediaLibrary.requestPermissionsAsync();
                console.log('[Permissions] Media Library Save status:', saveStatus);

                // 4. Notifications (Already handled in pushNotifications.ts, but we check here for consistency)
                const { status: notifStatus } = await Notifications.getPermissionsAsync();
                if (notifStatus !== 'granted') {
                    await Notifications.requestPermissionsAsync();
                }
                console.log('[Permissions] Notifications status:', notifStatus);

            } catch (error) {
                console.error('[Permissions] Error requesting upfront permissions:', error);
            }
        };

        requestAllPermissions();
    }, []);
};
