import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import COLORS from '../constants/colors';
import { SHADOWS } from '../constants/styleConstants';
import { useUIStore } from '../store/uiStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullscreenVideoProps {
    uri: string;
    autoPlay?: boolean;
    onPlayingChange?: (playing: boolean) => void;
}

const FullscreenVideo: React.FC<FullscreenVideoProps> = ({ uri, autoPlay = true, onPlayingChange }) => {
    const player = useVideoPlayer({ uri }, (player) => {
        player.loop = false;
        if (autoPlay) player.play();
    });

    useEffect(() => {
        if (!onPlayingChange) return;
        const sub = player.addListener('playingChange', (event) => {
            onPlayingChange(event.isPlaying);
        });
        return () => sub.remove();
    }, [player, onPlayingChange]);

    return (
        <VideoView
            player={player}
            style={{ flex: 1, width: '100%', height: '100%' }}
            contentFit="contain"
            nativeControls={true}
        />
    );
};

interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    media: { uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string } | null;
    onPlayingChange?: (playing: boolean) => void;
}

const PremiumMediaViewer: React.FC<MediaViewerProps> = ({ visible, onClose, media, onPlayingChange }) => {
    const { showAlert } = useUIStore();

    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const savedScale = useSharedValue(1);

    const resetStates = useCallback(() => {
        scale.value = withTiming(1);
    }, []);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 400 });
            resetStates();
        } else {
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [visible]);

    const handleSave = async () => {
        if (!media) return;
        try {
            // Check and request MediaLibrary permission
            const { status: existingStatus } = await MediaLibrary.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                showAlert({
                    title: 'Permission Required',
                    message: 'Please grant media library access in Settings to save images.',
                    type: 'warning'
                });
                return;
            }

            let fileUri = media.uri;

            // If it's a remote URL, we need to download it first
            if (media.uri.startsWith('http')) {
                const fileName = media.uri.split('/').pop() || (media.type === 'video' ? 'video.mp4' : 'image.jpg');
                const downloadPath = `${FileSystem.cacheDirectory}${fileName}`;
                const downloadResult = await FileSystem.downloadAsync(media.uri, downloadPath);
                fileUri = downloadResult.uri;
            }

            await MediaLibrary.saveToLibraryAsync(fileUri);
            showAlert({ title: 'Success', message: 'Media saved to gallery!', type: 'success' });
        } catch (error) {
            console.error('Save error:', error);
            showAlert({ title: 'Error', message: 'Failed to save media.', type: 'error' });
        }
    };

    const handleShare = async () => {
        if (!media) return;
        try {
            if (!(await Sharing.isAvailableAsync())) {
                showAlert({ title: 'Not Available', message: 'Sharing is not supported on this device.', type: 'error' });
                return;
            }

            let fileUri = media.uri;

            // Sharing works best with local files
            if (media.uri.startsWith('http')) {
                const fileName = media.uri.split('/').pop() || (media.type === 'video' ? 'video.mp4' : 'image.jpg');
                const downloadPath = `${FileSystem.cacheDirectory}${fileName}`;
                const downloadResult = await FileSystem.downloadAsync(media.uri, downloadPath);
                fileUri = downloadResult.uri;
            }

            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error('Share error:', error);
            showAlert({ title: 'Error', message: 'Failed to share media.', type: 'error' });
        }
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
            } else {
                savedScale.value = scale.value;
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }]
    }));

    if (!media) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'rgba(5, 10, 15, 0.98)' }}>
                {/* Silk Top Rim */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: COLORS.diamondRim, zIndex: 100 }} />

                {/* Close Button & Media Info */}
                <View style={{ position: 'absolute', top: 50, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 200 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>{media.senderName || 'Media'}</Text>
                        {media.timestamp && <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' }}>{media.timestamp}</Text>}
                    </View>

                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            width: 44,
                            height: 44,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: 22,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <Ionicons name="close" size={26} color="white" />
                    </TouchableOpacity>
                </View>

                <GestureDetector gesture={pinchGesture}>
                    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{
                                width: SCREEN_WIDTH * 0.95,
                                height: SCREEN_HEIGHT * 0.7,
                                borderRadius: 32,
                                overflow: 'hidden',
                                borderWidth: 1.5,
                                borderColor: COLORS.diamondRim,
                                ...SHADOWS.godLevel,
                                shadowColor: COLORS.primaryGlow
                            }}>
                                {media.type === 'image' ? (
                                    <Image
                                        source={{ uri: media.uri }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <FullscreenVideo uri={media.uri} onPlayingChange={onPlayingChange} />
                                )}
                            </View>
                        </View>
                    </Animated.View>
                </GestureDetector>

                {/* God Level Action Bar */}
                <View style={{ position: 'absolute', bottom: 60, left: 40, right: 40, flexDirection: 'row', justifyContent: 'center', gap: 20, zIndex: 300 }}>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            backgroundColor: 'white',
                            paddingVertical: 14,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 10,
                            borderWidth: 1,
                            borderColor: 'white',
                            ...SHADOWS.aura,
                            shadowColor: '#fff'
                        }}
                    >
                        <Ionicons name="download-outline" size={20} color="black" />
                        <Text style={{ color: 'black', fontWeight: '900', fontSize: 14 }}>Save</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleShare}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            backgroundColor: COLORS.primary,
                            paddingVertical: 14,
                            borderRadius: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 10,
                            borderWidth: 1,
                            borderColor: COLORS.glassBorder,
                            ...SHADOWS.aura,
                            shadowColor: COLORS.primary
                        }}
                    >
                        <Ionicons name="share-social-outline" size={20} color="black" />
                        <Text style={{ color: 'black', fontWeight: '900', fontSize: 14 }}>Share</Text>
                    </TouchableOpacity>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

export default PremiumMediaViewer;
