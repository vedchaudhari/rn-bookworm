import React, { useState, useEffect, useRef, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, runOnJS, useAnimatedKeyboard } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLastSeen } from '../lib/utils';
import { processMessagesWithDates, ProcessedItem, GroupPosition } from '../lib/messageUtils';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, AppState, AppStateStatus, ListRenderItemInfo, Modal, KeyboardAvoidingView, Platform, Alert, StyleSheet, StatusBar, Dimensions, Keyboard, LayoutAnimation, UIManager, ScrollView } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import COLORS from '../constants/colors';
import { SPACING, SHADOWS } from '../constants/styleConstants';
import { useMessageStore, Message } from '../store/messageStore';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import { apiClient } from '../lib/apiClient';
import SafeScreen from '../components/SafeScreen';
import { useUIStore } from '../store/uiStore';
import styles from '../assets/styles/chat.styles';
import ChatHeader from '../components/ChatHeader';
import ImageCropper from '../components/ImageCropper';



// Premium Media Viewer Component
interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    media: { uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string } | null;
    onPlayingChange?: (playing: boolean) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
                            borderColor: COLORS.glass.border,
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

// ChatImage Component for dynamic sizing
interface ChatImageProps {
    uri: string;
    messageId: string;
    initialWidth?: number;
    initialHeight?: number;
}

const ChatImage: React.FC<ChatImageProps> = React.memo(({ uri, messageId, initialWidth, initialHeight }) => {
    const getInitialDims = () => {
        if (initialWidth && initialHeight) {
            const aspectRatio = initialWidth / initialHeight;
            const maxWidth = 240;
            const maxHeight = 320;
            const minWidth = 160;
            const minHeight = 120;
            let finalWidth = initialWidth;
            let finalHeight = initialHeight;
            if (aspectRatio > 1.5) { finalWidth = maxWidth; finalHeight = maxWidth / aspectRatio; }
            else if (aspectRatio < 0.75) { finalHeight = Math.min(maxHeight, initialHeight); finalWidth = finalHeight * aspectRatio; }
            else { finalWidth = Math.min(maxWidth, initialWidth); finalHeight = finalWidth / aspectRatio; }
            if (finalWidth < minWidth) { finalWidth = minWidth; finalHeight = finalWidth / aspectRatio; }
            if (finalHeight < minHeight) { finalHeight = minHeight; finalWidth = finalHeight * aspectRatio; }
            return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
        }
        return { width: 240, height: 180 };
    };

    const [dimensions, setDimensions] = useState(getInitialDims());

    const handleLoad = (event: any) => {
        if (initialWidth && initialHeight) return;
        const { width, height } = event.source;
        if (!width || !height) return;
        const aspectRatio = width / height;
        const maxWidth = 240;
        const maxHeight = 320;
        const minWidth = 160;
        const minHeight = 120;
        let finalWidth = width;
        let finalHeight = height;
        if (aspectRatio > 1.5) { finalWidth = maxWidth; finalHeight = maxWidth / aspectRatio; }
        else if (aspectRatio < 0.75) { finalHeight = Math.min(maxHeight, height); finalWidth = finalHeight * aspectRatio; }
        else { finalWidth = Math.min(maxWidth, width); finalHeight = finalWidth / aspectRatio; }
        if (finalWidth < minWidth) { finalWidth = minWidth; finalHeight = finalWidth / aspectRatio; }
        if (finalHeight < minHeight) { finalHeight = minHeight; finalWidth = finalHeight * aspectRatio; }
        setDimensions({
            width: Math.round(finalWidth),
            height: Math.round(finalHeight)
        });
    };

    return (
        <View style={[styles.sentImage, dimensions, { overflow: 'hidden' }]}>
            <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                onLoad={handleLoad}
                onError={(e) => console.log('Image load error:', e)}
            />
        </View>
    );
}, (prev, next) => prev.uri === next.uri && prev.messageId === next.messageId);

// Simple Video Preview for Chat bubbles (Static)
interface VideoPreviewProps {
    thumbnail?: string;
    style?: any;
    isPlaying?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = React.memo(({ thumbnail, style, isPlaying }) => (
    <View style={[styles.sentVideoContainer, style, { backgroundColor: '#000', overflow: 'hidden' }]}>
        {thumbnail && (
            <Image
                source={{ uri: thumbnail }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
            />
        )}
        <View style={styles.playButtonOverlay} pointerEvents="none">
            <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="white" />
        </View>
    </View>
));

const StatusTicks = React.memo(({ deliveredAt, readAt, pending }: { deliveredAt?: string, readAt?: string, pending?: boolean }) => {
    const isRead = !!readAt;
    const isDelivered = !!deliveredAt || !!readAt;

    const blueOpacity = useSharedValue(isRead ? 1 : 0);
    const secondTickScale = useSharedValue(isDelivered ? 1 : 0);
    const secondTickTranslateX = useSharedValue(isDelivered ? 0 : -8);

    useEffect(() => {
        // Only run animations if component is mounted
        if (isRead) {
            blueOpacity.value = withTiming(1, { duration: 450 });
        }
        if (isDelivered) {
            secondTickScale.value = withSpring(1, { damping: 15, stiffness: 120 });
            secondTickTranslateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        }
    }, [isRead, isDelivered]);

    const blueTickStyle = useAnimatedStyle(() => ({
        opacity: blueOpacity.value,
        position: 'absolute',
        right: 0,
        top: 0,
    }));

    const secondTickStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: secondTickScale.value },
            { translateX: secondTickTranslateX.value }
        ],
        opacity: secondTickScale.value,
        marginLeft: -10,
    }));

    if (pending) {
        return (
            <ActivityIndicator
                size="small"
                color="rgba(255,255,255,0.7)"
                style={{ transform: [{ scale: 0.6 }] }}
            />
        );
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 16 }}>
            {/* First Tick */}
            <View style={{ width: 14 }}>
                <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.7)" />
                <Animated.View style={blueTickStyle}>
                    <Ionicons name="checkmark" size={16} color="#34B7F1" />
                </Animated.View>
            </View>

            {/* Second Tick */}
            <Animated.View style={secondTickStyle}>
                <View style={{ width: 14 }}>
                    <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.7)" />
                    <Animated.View style={blueTickStyle}>
                        <Ionicons name="checkmark" size={16} color="#34B7F1" />
                    </Animated.View>
                </View>
            </Animated.View>
        </View>
    );
});

// Re-defining for clear usage in modal/preview (Using Expo-Video)
const FullscreenVideo: React.FC<{ uri: string, autoPlay?: boolean, onPlayingChange?: (playing: boolean) => void }> = ({ uri, autoPlay = true, onPlayingChange }) => {
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













import { useChatThemeStore, ChatTheme } from '../store/chatThemeStore';

// Palette Presets
const PALETTE_PRESETS: { name: string, theme: ChatTheme }[] = [
    {
        name: 'God Level',
        theme: {
            backgroundColor: COLORS.background,
            myBubbleColor: COLORS.primary,
            theirBubbleColor: COLORS.surfaceSilk,
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: COLORS.primary,
        }
    },
    {
        name: 'Royal Purple',
        theme: {
            backgroundColor: '#0F0B1E',
            myBubbleColor: '#8B5CF6',
            theirBubbleColor: 'rgba(45, 30, 60, 0.95)',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#8B5CF6',
        }
    },
    {
        name: 'Midnight Rose',
        theme: {
            backgroundColor: '#1A0B10',
            myBubbleColor: '#F43F5E',
            theirBubbleColor: 'rgba(60, 30, 40, 0.95)',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#F43F5E',
        }
    },
    {
        name: 'Emerald Eve',
        theme: {
            backgroundColor: '#061310',
            myBubbleColor: '#10B981',
            theirBubbleColor: 'rgba(20, 50, 40, 0.95)',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#10B981',
        }
    },
    {
        name: 'Amber Glow',
        theme: {
            backgroundColor: '#130D06',
            myBubbleColor: '#F59E0B',
            theirBubbleColor: 'rgba(50, 40, 20, 0.95)',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#F59E0B',
        }
    },
    {
        name: 'Cyber Neon',
        theme: {
            backgroundColor: '#0A001A',
            myBubbleColor: '#FF00FF',
            theirBubbleColor: 'rgba(0, 255, 255, 0.1)',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#FF00FF',
        }
    },
    {
        name: 'Ghost Whisper',
        theme: {
            backgroundColor: '#F8FAFC',
            myBubbleColor: '#64748B',
            theirBubbleColor: '#E2E8F0',
            myTextColor: '#FFFFFF',
            theirTextColor: '#FFFFFF',
            auraColor: '#64748B',
        }
    },
];

const ThemePaletteModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    userId: string;
}> = ({ visible, onClose, userId }) => {
    const { setTheme, resetTheme, getTheme } = useChatThemeStore();
    const currentTheme = getTheme(userId);

    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backgroundOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
            backgroundOpacity.value = withTiming(1);
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT);
            backgroundOpacity.value = withTiming(0);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <TouchableOpacity activeOpacity={1} onPress={onClose} style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay }]} />
                <Animated.View style={[
                    {
                        backgroundColor: '#12161B',
                        borderTopLeftRadius: 36,
                        borderTopRightRadius: 36,
                        padding: 24,
                        maxHeight: SCREEN_HEIGHT * 0.85,
                        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
                        borderWidth: 1.5,
                        borderColor: COLORS.diamondRim,
                        ...SHADOWS.godLevel
                    },
                    animatedStyle
                ]}>
                    <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 24, letterSpacing: 0.5 }}>Chat Palette</Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Interactive Preview */}
                        <View style={{
                            backgroundColor: currentTheme.backgroundColor,
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 24,
                            borderWidth: 1.5,
                            borderColor: 'rgba(255,255,255,0.1)',
                            ...SHADOWS.medium
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 }}>
                                <View style={{ backgroundColor: currentTheme.theirBubbleColor, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, maxWidth: '80%' }}>
                                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Shall we dance with the colors?</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <View style={{ backgroundColor: currentTheme.myBubbleColor, padding: 12, borderRadius: 16, borderBottomRightRadius: 4, maxWidth: '80%', ...SHADOWS.aura, shadowColor: currentTheme.auraColor }}>
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Absolutely. Let's paint this void.</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 }}>Ethereal Themes</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                            {PALETTE_PRESETS.map((p) => {
                                const isActive = currentTheme.backgroundColor.toLowerCase() === p.theme.backgroundColor.toLowerCase() &&
                                    currentTheme.myBubbleColor.toLowerCase() === p.theme.myBubbleColor.toLowerCase();
                                return (
                                    <TouchableOpacity
                                        key={p.name}
                                        onPress={() => setTheme(userId, p.theme)}
                                        style={{
                                            padding: 12,
                                            borderRadius: 24,
                                            backgroundColor: p.theme.backgroundColor,
                                            borderWidth: 2,
                                            borderColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                            alignItems: 'center',
                                            width: (SCREEN_WIDTH - 60) / 2,
                                            ...SHADOWS.medium,
                                            shadowColor: isActive ? '#FFFFFF' : 'transparent',
                                            shadowOpacity: isActive ? 0.3 : 0
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.theme.myBubbleColor, ...SHADOWS.aura, shadowColor: p.theme.auraColor }} />
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.theme.theirBubbleColor }} />
                                            {isActive && (
                                                <View style={{
                                                    position: 'absolute',
                                                    right: -10,
                                                    top: -6,
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: 10,
                                                    width: 18,
                                                    height: 18,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    ...SHADOWS.medium
                                                }}>
                                                    <Ionicons name="checkmark" size={12} color="#000" />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{p.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 }}>Individual Accents</Text>

                        {/* Background Selection Rings */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase' }}>Atmosphere</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', gap: 14, paddingRight: 20 }}>
                                {['#0B0F14', '#0F0B1E', '#1A0B10', '#061310', '#130D06', '#0A001A', '#000000'].map((color) => {
                                    const isSelected = currentTheme.backgroundColor.toLowerCase() === color.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={color}
                                            onPress={() => setTheme(userId, { backgroundColor: color })}
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                                backgroundColor: color,
                                                borderWidth: 2.5,
                                                borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                ...SHADOWS.medium
                                            }}
                                        >
                                            {isSelected && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Bubble Color Selection Rings */}
                        {/* Bubble Color Selection Rings */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase' }}>Essence (My Bubble)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', gap: 14, paddingRight: 20 }}>
                                {['#19E3D1', '#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#FF00FF', '#64748B', '#FFFFFF'].map((color) => {
                                    const isSelected = currentTheme.myBubbleColor.toLowerCase() === color.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={color}
                                            onPress={() => setTheme(userId, { myBubbleColor: color, auraColor: color })}
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                                backgroundColor: color,
                                                borderWidth: 2.5,
                                                borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                ...SHADOWS.aura,
                                                shadowColor: color
                                            }}
                                        >
                                            {isSelected && <Ionicons name="checkmark" size={20} color={color.toLowerCase() === '#ffffff' ? '#000' : '#FFFFFF'} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase' }}>Essence (Their Bubble)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
                            <View style={{ flexDirection: 'row', gap: 14, paddingRight: 20 }}>
                                {['rgba(25, 227, 209, 0.15)', 'rgba(139, 92, 246, 0.15)', 'rgba(244, 63, 94, 0.15)', 'rgba(16, 185, 129, 0.15)', 'rgba(245, 158, 11, 0.15)', 'rgba(255, 0, 255, 0.15)', 'rgba(20, 26, 33, 0.95)', '#FFFFFF'].map((color) => {
                                    const isSelected = currentTheme.theirBubbleColor.toLowerCase() === color.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={color}
                                            onPress={() => setTheme(userId, { theirBubbleColor: color })}
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                                backgroundColor: color,
                                                borderWidth: 2.5,
                                                borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {isSelected && <Ionicons name="checkmark" size={20} color={color.toLowerCase() === '#ffffff' ? '#000' : '#FFFFFF'} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => resetTheme(userId)}
                            style={{
                                width: '100%',
                                padding: 18,
                                borderRadius: 24,
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.08)'
                            }}
                        >
                            <Text style={{ color: COLORS.textMuted, fontWeight: '800' }}>Revert to Defaults</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const MediaSelectionModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSelectImage: () => void;
    onSelectVideo: () => void;
}> = ({ visible, onClose, onSelectImage, onSelectVideo }) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 25, stiffness: 120 });
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 150 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <TouchableOpacity activeOpacity={1} onPress={onClose} style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay }]} />
                <Animated.View style={[
                    {
                        backgroundColor: '#0F1216',
                        borderTopLeftRadius: 40,
                        borderTopRightRadius: 40,
                        padding: 32,
                        paddingBottom: Platform.OS === 'ios' ? 54 : 40,
                        borderWidth: 1.5,
                        borderColor: COLORS.diamondRim,
                        ...SHADOWS.godLevel
                    },
                    animatedStyle
                ]}>
                    <View style={{ width: 45, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2.5, alignSelf: 'center', marginBottom: 24 }} />
                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: 0.5 }}>Share Media</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 32 }}>Choose your digital essence to transmit.</Text>

                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                setTimeout(() => onSelectImage(), 50);
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                padding: 24,
                                borderRadius: 32,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: 'rgba(255,255,255,0.15)',
                                gap: 12,
                                ...SHADOWS.aura,
                                shadowColor: '#34D399'
                            }}
                        >
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(52, 211, 153, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                                <Ionicons name="image" size={32} color="#34D399" />
                            </View>
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                setTimeout(() => onSelectVideo(), 50);
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                padding: 24,
                                borderRadius: 32,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: 'rgba(255,255,255,0.15)',
                                gap: 12,
                                ...SHADOWS.aura,
                                shadowColor: '#8B5CF6'
                            }}
                        >
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                                <Ionicons name="videocam" size={32} color="#8B5CF6" />
                            </View>
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Video</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            marginTop: 24,
                            width: '100%',
                            padding: 20,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

// MessageItem Component for performance
interface MessageItemProps {
    item: Message;
    index: number;
    currentUserId: string;
    displayAvatar: string;
    onLongPress: (item: Message) => void;
    onShowViewer: (uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string) => void;
    showAvatar: boolean;
    positionInGroup: GroupPosition;
    onReply: (item: Message) => void;
    isGlobalVideoPlaying?: boolean;
    activeVideoUri?: string | null;
    theme: ChatTheme;
    username: string;
}

const MessageItem = React.memo(({ item, index, currentUserId, displayAvatar, onLongPress, onShowViewer, showAvatar, positionInGroup, onReply, isGlobalVideoPlaying, activeVideoUri, theme, username }: MessageItemProps) => {
    const router = useRouter();
    const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
    const isMe = senderId === currentUserId || senderId === 'me';
    const isThisVideoPlaying = !!(item.video && activeVideoUri === item.video && isGlobalVideoPlaying);

    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    const replyIconScale = useSharedValue(0);
    const hasTriggered = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            const translationX = event.translationX;
            // Only allow swiping right (common reply gesture)
            if (translationX > 0) {
                const dampedX = Math.min(translationX * 0.5, 70); // Damping and max pull
                translateX.value = dampedX;

                // Show reply icon based on translation
                replyIconOpacity.value = withTiming(translationX > 30 ? 1 : 0);
                replyIconScale.value = withSpring(translationX > 50 ? 1.2 : 0.8);

                if (translationX > 60 && !hasTriggered.value) {
                    hasTriggered.value = true;
                    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                } else if (translationX <= 60) {
                    hasTriggered.value = false;
                }
            }
        })
        .onEnd(() => {
            if (translateX.value > 50) {
                runOnJS(onReply)(item);
            }
            translateX.value = withSpring(0);
            replyIconOpacity.value = withTiming(0);
            replyIconScale.value = withTiming(0);
            hasTriggered.value = false;
        });

    const animatedMessageStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        opacity: replyIconOpacity.value,
        transform: [{ scale: replyIconScale.value }, { translateX: -30 + translateX.value * 0.4 }]
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage, { width: '100%', position: 'relative' }, animatedMessageStyle]}>
                {/* Reply Indicator Background */}
                <Animated.View style={[{
                    position: 'absolute',
                    left: -40,
                    top: '50%',
                    marginTop: -12,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }, animatedIconStyle]}>
                    <Ionicons name="arrow-undo" size={14} color="#fff" />
                </Animated.View>
                {!isMe && (
                    <View style={{ width: 32 }}>
                        {showAvatar ? (
                            <Image
                                source={{ uri: displayAvatar }}
                                style={styles.messageAvatar}
                                cachePolicy="disk"
                            />
                        ) : null}
                    </View>
                )}
                <TouchableOpacity
                    onLongPress={() => onLongPress(item)}
                    onPress={() => {
                        const timestamp = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const senderName = isMe ? 'You' : username;
                        if (item.image) onShowViewer(item.image, 'image', timestamp, senderName);
                        else if (item.video) onShowViewer(item.video, 'video', timestamp, senderName);
                    }}
                    activeOpacity={0.8}
                    style={[
                        styles.messageBubble,
                        isMe ? {
                            backgroundColor: theme.myBubbleColor,
                            ...SHADOWS.aura,
                            shadowColor: theme.auraColor,
                            borderTopRightRadius: (positionInGroup === 'start' || positionInGroup === 'single') ? 20 : 4,
                            borderBottomRightRadius: (positionInGroup === 'end' || positionInGroup === 'single') ? 4 : 20,
                            borderTopLeftRadius: 20,
                            borderBottomLeftRadius: 20,
                        } : {
                            backgroundColor: theme.theirBubbleColor,
                            borderTopLeftRadius: (positionInGroup === 'start' || positionInGroup === 'single') ? 20 : 4,
                            borderBottomLeftRadius: (positionInGroup === 'end' || positionInGroup === 'single') ? 4 : 20,
                            borderTopRightRadius: 20,
                            borderBottomRightRadius: 20,
                        },
                        (item.image || item.video) && styles.imageBubble,
                        item.isDeleted && styles.deletedBubble
                    ]}
                >
                    {item.isDeleted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="ban" size={14} color="rgba(255,255,255,0.6)" />
                            <Text style={[styles.messageText, { color: '#FFFFFF' }, styles.deletedText]}>
                                This message was deleted
                            </Text>
                        </View>
                    ) : (
                        <>
                            {item.replyTo && (
                                <View style={{
                                    backgroundColor: COLORS.glassBorder,
                                    padding: 8,
                                    borderLeftWidth: 3,
                                    borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : theme.myBubbleColor,
                                    borderRadius: 4,
                                    marginBottom: 4,
                                }}>
                                    <Text style={{ color: isMe ? 'rgba(255,255,255,0.9)' : theme.myBubbleColor, fontWeight: '700', fontSize: 11, marginBottom: 2 }}>
                                        {typeof item.replyTo.sender === 'object' ? item.replyTo.sender.username : 'User'}
                                    </Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} numberOfLines={1}>
                                        {item.replyTo.text || (item.replyTo.image ? 'Image' : 'Media')}
                                    </Text>
                                </View>
                            )}
                            {item.image && (
                                <ChatImage
                                    uri={item.image}
                                    messageId={item._id}
                                    initialWidth={item.width}
                                    initialHeight={item.height}
                                />
                            )}
                            {item.video && (
                                <VideoPreview
                                    thumbnail={item.videoThumbnail}
                                    isPlaying={isThisVideoPlaying}
                                />
                            )}
                            {item.book && (
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item.book!._id } })}
                                    style={styles.bookCard}
                                >
                                    <Image source={{ uri: item.book.image }} style={styles.bookCardImage} contentFit="cover" />
                                    <View style={styles.bookCardContent}>
                                        <Text style={styles.bookCardTitle} numberOfLines={1}>{item.book.title}</Text>
                                        <Text style={styles.bookCardAuthor} numberOfLines={1}>{item.book.author || 'Author'}</Text>
                                        <View style={styles.bookCardViewBtn}>
                                            <Text style={styles.bookCardViewBtnText}>View Book</Text>
                                            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {item.text && <Text style={[styles.messageText, { color: '#FFFFFF' }]}>{item.text}</Text>}
                        </>
                    )}

                    <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        {item.isEdited && !item.isDeleted && (
                            <Text style={[styles.editedLabel, { color: '#FFFFFF', opacity: 0.6 }]}>Edited</Text>
                        )}
                        <Text style={[styles.messageTime, { color: '#FFFFFF', opacity: 0.6 }]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMe && !item.isDeleted && (
                            <View style={styles.pendingIndicator}>
                                <StatusTicks
                                    pending={item.pending}
                                    deliveredAt={item.deliveredAt}
                                    readAt={item.readAt}
                                />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item._id === nextProps.item._id &&
        prevProps.item.pending === nextProps.item.pending &&
        prevProps.item.isDeleted === nextProps.item.isDeleted &&
        prevProps.item.isEdited === nextProps.item.isEdited &&
        prevProps.item.read === nextProps.item.read &&
        prevProps.index === nextProps.index &&
        prevProps.showAvatar === nextProps.showAvatar &&
        prevProps.positionInGroup === nextProps.positionInGroup &&
        prevProps.isGlobalVideoPlaying === nextProps.isGlobalVideoPlaying &&
        prevProps.activeVideoUri === nextProps.activeVideoUri &&
        prevProps.theme.backgroundColor === nextProps.theme.backgroundColor &&
        prevProps.theme.myBubbleColor === nextProps.theme.myBubbleColor &&
        prevProps.theme.theirBubbleColor === nextProps.theme.theirBubbleColor
    );
});

export default function ChatScreen() {
    const { userId, username, profileImage } = useLocalSearchParams<{ userId: string; username: string; profileImage: string }>();
    const router = useRouter();

    const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${username || 'User'}&background=random&color=fff`;
    const displayAvatar = profileImage && profileImage !== 'undefined' ? profileImage : DEFAULT_AVATAR;
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageDims, setSelectedImageDims] = useState<{ width: number, height: number } | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [selectedVideoThumbnail, setSelectedVideoThumbnail] = useState<string | null>(null);
    const [selectedVideoSize, setSelectedVideoSize] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [cropperVisible, setCropperVisible] = useState(false);
    const [tempImageToCrop, setTempImageToCrop] = useState<string | null>(null);
    const [activeVideoUri, setActiveVideoUri] = useState<string | null>(null);
    const [isGlobalVideoPlaying, setIsGlobalVideoPlaying] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerMedia, setViewerMedia] = useState<{ uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const { messages, fetchMessages, sendMessage, markAsRead, addReceivedMessage, activeConversation, setActiveConversation, editMessage, deleteMessageForMe, deleteMessageForEveryone, updateLocalEditedMessage, updateLocalDeletedMessage, updateLocalMessagesRead, updateLocalMessageDelivered, clearChatHistory } = useMessageStore();
    const { getTheme } = useChatThemeStore();
    const currentTheme = getTheme(userId!);
    const [paletteVisible, setPaletteVisible] = useState(false);
    const [mediaModalVisible, setMediaModalVisible] = useState(false);
    const { token, user } = useAuthStore();
    const { showAlert, setActiveScreen, setActiveChatId } = useUIStore();
    const { socket, userStatuses, typingStatus, sendTypingStart, sendTypingStop, isConnected } = useNotificationStore();
    const typingTimeoutRef = useRef<any>(null);
    const [isInputActive, setIsInputActive] = useState(false);
    const isSelf = user?._id === userId || user?.id === userId;

    const conversationMessages = (messages[userId!] || []) as Message[];
    const userStatus = userStatuses[userId!] || { status: 'offline', lastActive: null };
    const isOnline = userStatus.status === 'online';

    const getDisplayStatus = (): string => {
        if (isSelf) return 'Notes to yourself';
        if (isOnline) return 'Online';
        if (!userStatus.lastActive) return 'Offline';
        return formatLastSeen(userStatus.lastActive);
    };

    const displayStatus = getDisplayStatus();
    const pulseOpacity = useSharedValue(0.4);
    const isTyping = typingStatus[userId!];

    // Memoize processed messages for date headers and avatar visibility
    const processedMessages = React.useMemo(() => {
        const currentId = user?._id || user?.id || '';
        return processMessagesWithDates(conversationMessages, currentId);
    }, [conversationMessages, user]);


    const [keyboardVisible, setKeyboardVisible] = useState(false);
    useEffect(() => {
        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleShowViewer = useCallback((uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string) => {
        setViewerMedia({ uri, type, timestamp, senderName });
        setActiveVideoUri(type === 'video' ? uri : null);
        setIsGlobalVideoPlaying(false);
        setViewerVisible(true);
    }, []);


    // Use refs to track current state for socket callbacks to avoid stale closures
    const activeConversationRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    // Keep refs in sync with state/props
    useEffect(() => {
        activeConversationRef.current = userId; // The userId passed as prop IS the active conversation ID
    }, [userId]);

    useEffect(() => {
        userIdRef.current = user?._id || user?.id || null;
    }, [user]);

    useEffect(() => {
        setActiveScreen('chat');
        if (userId) {
            setActiveChatId(String(userId));
            setActiveConversation(String(userId)); // Sync MessageStore
        }

        return () => {
            setActiveScreen(null);
            setActiveChatId(null);
            setActiveConversation(null); // Sync MessageStore
        };
    }, [userId]);

    const getConversationId = (id1: string, id2: string) => {
        const ids = [id1.toString(), id2.toString()].sort();
        return `${ids[0]}_${ids[1]}`;
    };

    useEffect(() => { if (isConnected) loadMessages(); }, [isConnected]);

    const appState = useRef<AppStateStatus>(AppState.currentState);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                loadMessages();
                markAsRead(userId!, token!);
                // Use current user from store/ref for checking
                const currentId = user?._id || user?.id;
                if (socket && currentId) {
                    socket.emit('message_read', {
                        conversationId: getConversationId(currentId, userId!),
                        senderId: userId!
                    });
                }
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, [userId, token, user]);

    // Define socket handlers with useCallback but reading from REFS
    const handleNewMessage = useCallback((message: Message) => {
        const currentUserId = userIdRef.current;
        const activeConvId = activeConversationRef.current;

        const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;

        // Auto-acknowledge read if we are looking at THIS conversation
        if (senderId === activeConvId && currentUserId && socket) {
            socket.emit('message_read', {
                conversationId: message.conversationId,
                senderId: senderId
            });
        }

        if (currentUserId) {
            // Store handles whether to increment unread count based on active conversation
            addReceivedMessage(message, currentUserId);

            // If we are in this conversation, ensure we mark as read locally too
            if (senderId === activeConvId) {
                markAsRead(activeConvId, token!);
            }
        }
    }, [socket, token]); // Dependencies that rarely change

    const handleMessageEdited = useCallback((data: any) => {
        updateLocalEditedMessage(data);
    }, []);

    const handleMessageDeleted = useCallback((data: any) => {
        updateLocalDeletedMessage(data);
    }, []);

    const handleMessagesRead = useCallback((data: any) => {
        // We need to check if this read event relates to the conversation we are viewing
        // But importantly, updates should happen regardless so the list updates
        const activeConvId = activeConversationRef.current;
        const currentUserId = userIdRef.current;

        if (data.conversationId === getConversationId(currentUserId || '', activeConvId || '')) {
            updateLocalMessagesRead(data);
        }
    }, []);

    const handleMessageDelivered = useCallback((data: { messageId: string, deliveredAt: string }) => {
        updateLocalMessageDelivered(data);
    }, []);

    useEffect(() => {
        if (isOnline) {
            pulseOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0.4, { duration: 1000 })), -1, true);
        } else { pulseOpacity.value = 0; }

        loadMessages();
        markAsRead(userId!, token!);

        if (socket) {
            socket.on('new_message', handleNewMessage);
            socket.on('message_edited', handleMessageEdited);
            socket.on('message_deleted', handleMessageDeleted);
            socket.on('messages_read', handleMessagesRead);
            socket.on('message_delivered', handleMessageDelivered);
        }

        return () => {
            if (socket) {
                socket.off('new_message', handleNewMessage);
                socket.off('message_edited', handleMessageEdited);
                socket.off('message_deleted', handleMessageDeleted);
                socket.off('messages_read', handleMessagesRead);
                socket.off('message_delivered', handleMessageDelivered);
            }
            // Clean up typing timeout to prevent memory leaks
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, [userId, socket, isOnline, handleNewMessage, handleMessageEdited, handleMessageDeleted, handleMessagesRead, handleMessageDelivered]);

    const animatedStatusStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));
    const loadMessages = async () => { await fetchMessages(userId!, token!); };

    const handlePickMedia = () => {
        setMediaModalVisible(true);
    };

    const handlePickImage = async (allowEditing: boolean = false) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
                base64: false
            });

            if (!result.canceled && result.assets[0].uri) {
                if (allowEditing) {
                    setTempImageToCrop(result.assets[0].uri);
                    setCropperVisible(true);
                } else {
                    const asset = result.assets[0];
                    setSelectedImage(asset.uri);
                    setSelectedImageDims({ width: asset.width, height: asset.height });
                    setShowPreview(true);
                }
            }
        } catch (error) { showAlert({ title: 'Error', message: 'Failed to pick image', type: 'error' }); }
    };

    const handleCropComplete = (croppedUri: string) => {
        setCropperVisible(false);
        setSelectedImage(croppedUri);
        // We might need to get dimensions of cropped image, but 1:1 is assumed for now
        setSelectedImageDims({ width: 1000, height: 1000 });
        setShowPreview(true);
        setTempImageToCrop(null);
    };

    const handleShowCropOption = () => {
        if (selectedImage) {
            setTempImageToCrop(selectedImage);
            setCropperVisible(true);
            setShowPreview(false);
        }
    };

    const handlePickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                const videoData = result.assets[0];

                // MIME type safety - ensuring correct types for backend
                const uri = videoData.uri.toLowerCase();
                if (!uri.endsWith('.mp4') && !uri.endsWith('.mov') && !uri.endsWith('.m4v') && !uri.endsWith('.qt')) {
                    showAlert({ title: 'Unsupported', message: 'Only MP4 and MOV videos are supported.', type: 'error' });
                    return;
                }

                // Check file size (max 10MB)
                const fileSize = videoData.fileSize || 0;
                if (fileSize > 10 * 1024 * 1024) {
                    showAlert({
                        title: 'File Too Large',
                        message: 'Videos must be less than 10MB',
                        type: 'error'
                    });
                    return;
                }

                setSending(true);
                try {
                    // Generate thumbnail
                    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
                        videoData.uri,
                        { time: 1000 }
                    );

                    setSelectedVideo(videoData.uri);
                    setSelectedVideoThumbnail(thumbnailUri);
                    setSelectedVideoSize(fileSize);
                    setSelectedImageDims({ width: videoData.width || 480, height: videoData.height || 270 });
                    setShowPreview(true);
                } catch (e) {
                    console.error("Thumbnail error:", e);
                    showAlert({ title: 'Error', message: 'Failed to process video', type: 'error' });
                } finally {
                    setSending(false);
                }
            }
        } catch (error) {
            showAlert({ title: 'Error', message: 'Failed to pick video', type: 'error' });
        }
    };

    const handleConfirmSendMedia = async () => {
        if ((!selectedImage && !selectedVideo) || sending) return;
        setSending(true);

        try {
            let finalImageUrl: string | undefined;
            let finalVideoUrl: string | undefined;
            let finalThumbnailUrl: string | undefined;

            // 1. Handle Image Upload
            if (selectedImage) {
                const imageUri = selectedImage;
                const fileName = imageUri.split('/').pop() || 'image.jpg';
                const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
                let contentType = 'image/jpeg';
                if (fileExtension === 'png') contentType = 'image/png';
                else if (fileExtension === 'webp') contentType = 'image/webp';

                const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                    '/api/messages/presigned-url',
                    { fileName, contentType }
                );

                const blobResponse = await fetch(imageUri);
                const blob = await blobResponse.blob();
                const uploadResponse = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
                if (!uploadResponse.ok) throw new Error('Image upload failed');
                finalImageUrl = finalUrl;
            }

            // 2. Handle Video Upload
            if (selectedVideo) {
                const videoUri = selectedVideo;
                const videoName = videoUri.split('/').pop() || 'video.mp4';
                const videoExt = videoName.split('.').pop()?.toLowerCase() || 'mp4';
                const videoContentType = videoExt === 'mov' || videoExt === 'qt' ? 'video/quicktime' : 'video/mp4';

                // Upload Video
                const { uploadUrl: vUploadUrl, finalUrl: vFinalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                    '/api/messages/presigned-url',
                    { fileName: videoName, contentType: videoContentType }
                );

                const vBlobResponse = await fetch(videoUri);
                const vBlob = await vBlobResponse.blob();
                const vUploadResponse = await fetch(vUploadUrl, { method: 'PUT', body: vBlob, headers: { 'Content-Type': videoContentType } });
                if (!vUploadResponse.ok) throw new Error('Video upload failed');
                finalVideoUrl = vFinalUrl;

                // Upload Thumbnail if exists
                if (selectedVideoThumbnail) {
                    const thumbUri = selectedVideoThumbnail;
                    const thumbName = `thumb_${videoName.split('.')[0]}.jpg`;
                    const { uploadUrl: tUploadUrl, finalUrl: tFinalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                        '/api/messages/presigned-url',
                        { fileName: thumbName, contentType: 'image/jpeg' }
                    );

                    const tBlobResponse = await fetch(thumbUri);
                    const tBlob = await tBlobResponse.blob();
                    const tUploadResponse = await fetch(tUploadUrl, { method: 'PUT', body: tBlob, headers: { 'Content-Type': 'image/jpeg' } });
                    if (tUploadResponse.ok) finalThumbnailUrl = tFinalUrl;
                }
            }

            // 3. Send Message
            setShowPreview(false);
            const localImg = selectedImage || undefined;
            const localVid = selectedVideo || undefined;
            const localThumb = selectedVideoThumbnail || undefined;
            const dims = selectedImageDims;
            const size = selectedVideoSize || undefined;

            handleClearPreview();
            await createAndSendMessage(undefined, finalImageUrl, finalVideoUrl, finalThumbnailUrl, localImg, localVid, localThumb, dims?.width, dims?.height, size);
        } catch (error: any) {
            console.error('Upload error:', error);
            showAlert({ title: 'Error', message: 'Failed to upload media. Please try again.', type: 'error' });
        } finally {
            setSending(false);
        }
    };

    const handleSend = async () => {
        if (!messageText.trim() || sending) return;

        if (editingMessageId) {
            const msgId = editingMessageId;
            const text = messageText.trim();
            setEditingMessageId(null);
            setMessageText('');
            const result = await editMessage(msgId, text, token!);
            if (!result.success) showAlert({ title: 'Error', message: result.error || 'Failed to edit message', type: 'error' });
            return;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingStop(userId!);
        const replyId = replyingTo ? replyingTo._id : undefined;
        setReplyingTo(null);
        await createAndSendMessage(messageText.trim(), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, replyId);
    };

    const handleClearPreview = () => {
        setSelectedImage(null);
        setSelectedImageDims(null);
        setSelectedVideo(null);
        setSelectedVideoThumbnail(null);
        setSelectedVideoSize(null);
        setShowPreview(false);
    };

    const createAndSendMessage = async (
        text: string | undefined,
        image: string | undefined,
        video?: string | undefined,
        videoThumbnail?: string | undefined,
        localImage?: string,
        localVideo?: string,
        localThumbnail?: string,
        width?: number,
        height?: number,
        fileSizeBytes?: number,
        replyToId?: string
    ) => {
        setSending(true);
        if (text) setMessageText('');

        // Immediate scroll to bottom for improved UX
        setTimeout(() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }, 0);

        const result = await sendMessage(
            userId!,
            text || '',
            image,
            video,
            videoThumbnail,
            token!,
            localImage,
            localVideo,
            localThumbnail,
            width,
            height,
            fileSizeBytes,
            undefined, // book
            replyToId
        );
        setSending(false);
        if (!result.success) showAlert({ title: 'Error', message: 'Failed to send message', type: 'error' });
    };

    const handleClearChat = useCallback(() => {
        showAlert({
            title: 'Clear Chat',
            message: 'Are you sure you want to clear your local chat history? This cannot be undone.',
            showCancel: true,
            confirmText: 'Clear',
            type: 'warning',
            onConfirm: async () => {
                await clearChatHistory(userId!, token!);
            }
        });
    }, [userId, token, clearChatHistory, showAlert]);

    const handleLongPress = useCallback((item: Message) => {
        const currentUserId = user?._id || user?.id;
        const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
        const isMe = senderId === currentUserId || senderId === 'me';

        if (item.isDeleted) return;

        if (isMe) {
            showAlert({
                title: 'Delete Message',
                message: 'Do you want to delete this message for yourself or for everyone?',
                showCancel: true,
                confirmText: 'Delete for Me',
                onConfirm: () => { deleteMessageForMe(item._id, token!); },
                confirmText2: 'Delete for Everyone',
                onConfirm2: () => { deleteMessageForEveryone(item._id, token!); },
                type: 'warning'
            });
        } else {
            showAlert({
                title: 'Message Options',
                message: 'Choose an action',
                showCancel: true,
                confirmText: 'Reply',
                onConfirm: () => setReplyingTo(item),
                confirmText2: 'Delete for Me',
                onConfirm2: () => { deleteMessageForMe(item._id, token!); },
                type: 'info'
            });
        }
    }, [user, token, showAlert]);

    const handleTextChange = (text: string) => {
        setMessageText(text);
        if (editingMessageId) return; // Don't send typing status while editing

        if (!text.trim()) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            sendTypingStop(userId!);
            typingTimeoutRef.current = null;
            return;
        }
        if (!typingTimeoutRef.current) sendTypingStart(userId!);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { sendTypingStop(userId!); typingTimeoutRef.current = null; }, 2000);
    };

    const renderMessage = useCallback(({ item, index }: ListRenderItemInfo<ProcessedItem>) => {
        if ('type' in item && item.type === 'date-separator') {
            return (
                <View style={{
                    alignSelf: 'center',
                    marginVertical: 20,
                    backgroundColor: 'rgba(14, 27, 36, 0.4)',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>{item.date}</Text>
                </View>
            );
        }

        // Cast to Message safely as we handled separator
        const messageItem = item as Message & { showAvatar?: boolean, positionInGroup?: GroupPosition };
        const currentId = user?._id || user?.id || '';
        const showAvatar = messageItem.showAvatar || false;
        const positionInGroup = messageItem.positionInGroup || 'single';

        return (
            <MessageItem
                item={messageItem}
                index={index}
                currentUserId={currentId}
                displayAvatar={displayAvatar}
                onLongPress={handleLongPress}
                onShowViewer={handleShowViewer}
                showAvatar={showAvatar}
                positionInGroup={positionInGroup}
                onReply={(msg) => setReplyingTo(msg)}
                isGlobalVideoPlaying={isGlobalVideoPlaying}
                activeVideoUri={activeVideoUri}
                theme={currentTheme}
                username={username}
            />
        );
    }, [displayAvatar, handleLongPress, currentTheme, username, isGlobalVideoPlaying, activeVideoUri]);

    const insets = useSafeAreaInsets();

    // Get smooth 60fps keyboard height value
    const keyboard = useAnimatedKeyboard();

    const animatedContainerStyle = useAnimatedStyle(() => {
        const keyboardHeight = keyboard.height.value;
        const basePadding = Math.max(insets.bottom, 16);
        const wrapperPadding = Platform.OS === 'ios' ? 30 : 20;

        // "Tiny padding" gap of 10px for a premium look
        const targetPadding = Math.max(keyboardHeight - wrapperPadding + 10, basePadding);

        // We use withSpring for the "Liquid Smooth" feel.
        // For the "no animation of moving down", we use a very high stiffness and low mass 
        // to make it feel locked to the keyboard, and snap to the bottom instantly on close.
        return {
            paddingBottom: targetPadding,
        };
    });


    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Replaced KeyboardAvoidingView with Smooth Reanimated View */}
            <ChatHeader
                username={username}
                displayAvatar={displayAvatar}
                isOnline={isOnline}
                isSelf={isSelf}
                isTyping={!!isTyping}
                displayStatus={displayStatus}
                animatedStatusStyle={animatedStatusStyle}
                onClearChat={handleClearChat}
                onOpenPalette={() => setPaletteVisible(true)}
            />

            <ImageCropper
                visible={cropperVisible}
                imageUri={tempImageToCrop}
                onCancel={() => {
                    setCropperVisible(false);
                    setTempImageToCrop(null);
                    setShowPreview(true);
                }}
                onCrop={handleCropComplete}
                aspectRatio={[1, 1]}
            />

            {/* Smooth Reanimated View for Keyboard */}
            <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
                <View style={[styles.container, { paddingTop: 0, backgroundColor: currentTheme.backgroundColor }]}>

                    {/* Messages List */}
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={processedMessages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item._id}
                            extraData={currentTheme}
                            inverted
                            contentContainerStyle={{ paddingBottom: 30, paddingTop: Platform.OS === 'ios' ? 110 : 90 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            style={{ flex: 1 }}
                            keyboardDismissMode="interactive"
                            removeClippedSubviews={Platform.OS === 'android'}
                            initialNumToRender={20}
                            maxToRenderPerBatch={10}
                            windowSize={15}
                            updateCellsBatchingPeriod={50}
                            onEndReachedThreshold={0.5}
                            scrollEventThrottle={16}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(25, 227, 209, 0.08)', ...SHADOWS.aura }]}>
                                        <Ionicons name="chatbubbles" size={40} color={COLORS.primary} />
                                    </View>
                                    <Text style={[styles.emptyText, { fontSize: 18, color: COLORS.textPrimary, fontWeight: '900' }]}>
                                        The conversation begins...
                                    </Text>
                                    <Text style={[styles.emptyText, { color: COLORS.textSecondary, marginTop: 8 }]}>
                                        Start a literary dialogue with {username}
                                    </Text>
                                </View>
                            }
                        />
                    </View>

                    {/* Input Wrapper - Floating Capsule */}
                    <View style={styles.inputWrapper}>
                        {replyingTo && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderTopLeftRadius: 16,
                                borderTopRightRadius: 16,
                                borderBottomWidth: 1,
                                borderColor: 'rgba(255,255,255,0.1)'
                            }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700', marginBottom: 2 }}>
                                        Replying to {typeof replyingTo.sender === 'object' ? replyingTo.sender.username : (replyingTo.sender === 'me' ? 'Yourself' : 'User')}
                                    </Text>
                                    <Text style={{ color: COLORS.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                        {replyingTo.text || (replyingTo.image ? 'Image' : replyingTo.video ? 'Video' : 'Message')}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={[styles.inputContainer, replyingTo && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                            <TouchableOpacity onPress={handlePickMedia} style={styles.iconButton}>
                                <Ionicons name="add-circle-outline" size={26} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Whisper something..."
                                placeholderTextColor="rgba(168, 178, 209, 0.4)"
                                value={messageText}
                                onChangeText={handleTextChange}
                                onFocus={() => setIsInputActive(true)}
                                onBlur={() => setIsInputActive(false)}
                                multiline
                                maxLength={1000}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!messageText.trim() || sending}
                                style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
                            >
                                {sending ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="paper-plane" size={20} color="#000" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View >
            </Animated.View>

            <Modal visible={showPreview} transparent animationType="fade" onRequestClose={handleClearPreview}>
                <View style={styles.previewOverlay}>
                    <View style={styles.previewHeader}>
                        <TouchableOpacity onPress={handleClearPreview} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.previewImageContainer}>
                        <View style={styles.previewImageWrapper}>
                            {selectedVideo ? (
                                <FullscreenVideo uri={selectedVideo} />
                            ) : selectedImage ? (
                                <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="contain" />
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.previewFooter}>
                        {selectedImage && (
                            <TouchableOpacity onPress={handleShowCropOption} style={[styles.previewSendButton, { backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 12 }]}>
                                <Ionicons name="crop" size={22} color="#fff" />
                                <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Crop</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleConfirmSendMedia} style={styles.previewSendButton} disabled={sending}>
                            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
                            {!sending && <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Send</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <PremiumMediaViewer
                visible={viewerVisible}
                onClose={() => {
                    setViewerVisible(false);
                    setIsGlobalVideoPlaying(false);
                    setActiveVideoUri(null);
                }}
                media={viewerMedia}
                onPlayingChange={setIsGlobalVideoPlaying}
            />
            <ThemePaletteModal
                visible={paletteVisible}
                onClose={() => setPaletteVisible(false)}
                userId={userId!}
            />
            <MediaSelectionModal
                visible={mediaModalVisible}
                onClose={() => setMediaModalVisible(false)}
                onSelectImage={() => handlePickImage(false)}
                onSelectVideo={handlePickVideo}
            />
        </SafeScreen >
    );
}