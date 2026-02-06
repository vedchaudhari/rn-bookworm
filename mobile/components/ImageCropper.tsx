import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import COLORS from '../constants/colors';
import STYLE_CONSTANTS from '../constants/styleConstants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH * 0.8;

interface ImageCropperProps {
    visible: boolean;
    imageUri: string | null;
    onCancel: () => void;
    onCrop: (croppedUri: string) => void;
    aspectRatio?: [number, number]; // Default 1:1
}

export default function ImageCropper({ visible, imageUri, onCancel, onCrop, aspectRatio = [1, 1] }: ImageCropperProps) {
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(false);
    const [rotation, setRotation] = useState(0);

    // Image translation/scale for positioning
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // For pinch and pan
    const baseScale = useSharedValue(1);
    const offsetTranslateX = useSharedValue(0);
    const offsetTranslateY = useSharedValue(0);

    useEffect(() => {
        if (imageUri) {
            setLoading(true);
            Image.getSize(imageUri, (width, height) => {
                setImageSize({ width, height });
                setLoading(false);
            }, (error) => {
                console.error("Failed to get image size", error);
                setLoading(false);
            });

            // Reset transforms
            scale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            baseScale.value = 1;
            offsetTranslateX.value = 0;
            offsetTranslateY.value = 0;
            setRotation(0);
        }
    }, [imageUri, visible]);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = baseScale.value * e.scale;
        })
        .onEnd(() => {
            baseScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = offsetTranslateX.value + e.translationX;
            translateY.value = offsetTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            offsetTranslateX.value = translateX.value;
            offsetTranslateY.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation}deg` }
        ]
    }));

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleConfirmCrop = async () => {
        if (!imageUri) return;
        setLoading(true);

        try {
            // This is a simplified crop logic.
            // In a production app, you'd calculate the exact pixel coordinates
            // based on the visible area within the CROP_SIZE box relative to the image translation/scale.

            // For now, we'll use a basic resize/crop using expo-image-manipulator
            // to show the integration. Accurate coordinate calculation requires mapping 
            // screen points to image pixel space.

            const actions: ImageManipulator.Action[] = [];
            if (rotation !== 0) {
                actions.push({ rotate: rotation });
            }

            // Calculate safe crop based on actual image dimensions
            const imgWidth = imageSize.width;
            const imgHeight = imageSize.height;

            if (imgWidth === 0 || imgHeight === 0) {
                // Fallback if size wasn't loaded
                onCrop(imageUri);
                return;
            }

            // Determine crop size relative to image
            // This is a simplified "center crop" logic that respects the requested aspect ratio
            // and ensures we don't go out of bounds.

            const targetRatio = aspectRatio[0] / aspectRatio[1];
            let cropWidth = imgWidth;
            let cropHeight = imgWidth / targetRatio;

            if (cropHeight > imgHeight) {
                cropHeight = imgHeight;
                cropWidth = imgHeight * targetRatio;
            }

            // Center the crop
            const originX = (imgWidth - cropWidth) / 2;
            const originY = (imgHeight - cropHeight) / 2;

            actions.push({
                crop: {
                    originX: Math.max(0, originX),
                    originY: Math.max(0, originY),
                    width: Math.min(imgWidth, cropWidth),
                    height: Math.min(imgHeight, cropHeight),
                }
            });

            const result = await ImageManipulator.manipulateAsync(
                imageUri,
                actions,
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            onCrop(result.uri);
        } catch (error) {
            console.error("Crop error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <GestureHandlerRootView style={styles.root}>
                <View style={styles.container}>
                    {/* Dark Backdrop */}
                    <View style={StyleSheet.absoluteFillObject} />

                    {/* Header */}
                    <View style={[styles.header, { top: STYLE_CONSTANTS.LAYOUT.safeArea.minTop + 20 }]}>
                        <TouchableOpacity onPress={onCancel} style={styles.iconButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Image</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    {/* Editor Area */}
                    <View style={styles.editorArea}>
                        <GestureDetector gesture={composedGesture}>
                            <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                                {imageUri && (
                                    <Animated.Image
                                        source={{ uri: imageUri }}
                                        style={styles.image}
                                        resizeMode="contain"
                                    />
                                )}
                            </Animated.View>
                        </GestureDetector>

                        {/* Crop Guide Overlay */}
                        <View style={styles.overlayContainer} pointerEvents="none">
                            <View style={[styles.cropBox, { aspectRatio: aspectRatio[0] / aspectRatio[1] }]} />

                            {/* Darkened area outside crop box */}
                            <View style={styles.topCurtain} />
                            <View style={styles.bottomCurtain} />
                            <View style={styles.leftCurtain} />
                            <View style={styles.rightCurtain} />
                        </View>
                    </View>

                    {/* Bottom Controls */}
                    <View style={[styles.footer, { paddingBottom: STYLE_CONSTANTS.LAYOUT.safeArea.minBottom + 30 }]}>
                        <View style={styles.controlsRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleRotate}>
                                <BlurView intensity={30} tint="dark" style={styles.blurWrapper}>
                                    <Ionicons name="refresh-outline" size={24} color="#fff" />
                                    <Text style={styles.actionText}>Rotate</Text>
                                </BlurView>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmCrop}>
                                <BlurView intensity={60} tint="default" style={[styles.blurWrapper, styles.confirmBlur]}>
                                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                                    <Text style={[styles.actionText, { color: COLORS.primary }]}>Done</Text>
                                </BlurView>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.instruction}>Pinch to Zoom • Drag to Move</Text>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editorArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cropBox: {
        width: CROP_SIZE,
        height: CROP_SIZE,
        borderWidth: 2,
        borderColor: COLORS.primary,
        zIndex: 5,
        // Optional: Corner markers
    },
    topCurtain: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: (SCREEN_HEIGHT + CROP_SIZE) / 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    bottomCurtain: {
        position: 'absolute',
        top: (SCREEN_HEIGHT + CROP_SIZE) / 2,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    leftCurtain: {
        position: 'absolute',
        top: (SCREEN_HEIGHT - CROP_SIZE) / 2,
        bottom: (SCREEN_HEIGHT - CROP_SIZE) / 2,
        left: 0,
        right: (SCREEN_WIDTH + CROP_SIZE) / 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    rightCurtain: {
        position: 'absolute',
        top: (SCREEN_HEIGHT - CROP_SIZE) / 2,
        bottom: (SCREEN_HEIGHT - CROP_SIZE) / 2,
        left: (SCREEN_WIDTH + CROP_SIZE) / 2,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1.5,
    },
    blurWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        gap: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    confirmBlur: {
        backgroundColor: 'rgba(0, 150, 199, 0.15)', // Neon Teal undertone
        borderColor: 'rgba(0, 150, 199, 0.3)',
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    instruction: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});

function GestureDrawingCurtain({ children }: { children: React.ReactNode }) {
    return (
        <View style={{ flex: 1 }}>
            {children}
        </View>
    );
}
