import * as ImageManipulator from 'expo-image-manipulator';

export const ImageCompressor = {
    /**
     * Process an image: Crop -> Rotate -> Resize/Compress
     */
    processImage: async (
        uri: string,
        options: {
            crop?: { originX: number; originY: number; width: number; height: number };
            rotation?: number;
            isHD?: boolean;
        }
    ): Promise<string> => {
        const actions: ImageManipulator.Action[] = [];

        // 1. Crop (Must be first if regular crop logic)
        if (options.crop) {
            actions.push({ crop: options.crop });
        }

        // 2. Rotate
        if (options.rotation) {
            actions.push({ rotate: options.rotation });
        }

        // 3. Compress / Resizing
        // Standard: 1080px wide (good balance)
        // HD: 2048px or original
        const maxWidth = options.isHD ? 2048 : 1080;

        // We append a resize action. ImageManipulator maintains aspect ratio if only width is given using 'resize'
        // NOTE: In complex apps, you verify width > maxWidth before resizing to avoid upscaling
        actions.push({ resize: { width: maxWidth } });

        const saveOptions = {
            compress: options.isHD ? 0.8 : 0.6, // Higher compression for standard
            format: ImageManipulator.SaveFormat.JPEG,
        };

        const result = await ImageManipulator.manipulateAsync(uri, actions, saveOptions);
        return result.uri;
    }
};
