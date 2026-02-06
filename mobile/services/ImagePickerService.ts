import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform, Linking } from 'react-native';

export type MediaAttachment = {
    id: string;
    uri: string;
    originalUri: string;
    width: number;
    height: number;
    type: 'image' | 'video';
    caption?: string;
};

export const ImagePickerService = {
    /**
     * Request permissions and pick images
     */
    pickImages: async (allowMultiple = true): Promise<MediaAttachment[]> => {
        // 1. Permissions
        const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            Alert.alert(
                'Permission blocked',
                'We need access to your photos to send them. Please allow access in your phone settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
            );
            return [];
        }

        // 2. Pick
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: allowMultiple,
            quality: 1, // Get original quality, compress later
            exif: false,
        });

        if (result.canceled) return [];

        // 3. Normalize Data
        return result.assets.map(asset => ({
            id: asset.assetId || Math.random().toString(36).substring(7),
            uri: asset.uri,
            originalUri: asset.uri, // Keep reference
            width: asset.width,
            height: asset.height,
            type: 'image',
        }));
    },

    /**
     * Clean up specific temp files when no longer needed
     */
    cleanupHelper: async (uris: string[]) => {
        for (const uri of uris) {
            const cacheDir = (FileSystem as any).cacheDirectory;
            if (cacheDir && uri.includes(cacheDir)) {
                try {
                    await FileSystem.deleteAsync(uri, { idempotent: true });
                } catch (e) {
                    console.warn('Failed to delete temp file', uri);
                }
            }
        }
    }
};
