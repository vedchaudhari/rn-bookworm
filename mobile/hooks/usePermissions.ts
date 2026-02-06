import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export const getPermissionStatus = async () => {
    const [camera, library, notifications] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
        Notifications.getPermissionsAsync(),
    ]);
    return {
        camera: camera.status === 'granted',
        library: library.status === 'granted',
        notifications: notifications.status === 'granted',
    };
};

export const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
};

export const requestLibraryPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
};

export const requestNotificationPermission = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

export const requestAllPermissions = async () => {
    try {
        console.log('[Permissions] Starting request sequence...');
        const camera = await requestCameraPermission();
        console.log('[Permissions] Camera granted:', camera);

        const library = await requestLibraryPermission();
        console.log('[Permissions] Library granted:', library);

        const notifications = await requestNotificationPermission();
        console.log('[Permissions] Notifications granted:', notifications);

        return true;
    } catch (error) {
        console.error('[Permissions] Error during requestAllPermissions:', error);
        // Do not throw here to avoid crashing the caller (layout/home)
        return false;
    }
};

export const usePermissions = (isEnabled: boolean = false) => {
    useEffect(() => {
        if (!isEnabled) return;
        requestAllPermissions();
    }, [isEnabled]);
};
