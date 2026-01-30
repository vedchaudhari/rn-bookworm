import React, { useState, useEffect, useRef, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, runOnJS, useAnimatedKeyboard } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, AppState, AppStateStatus, ListRenderItemInfo, Modal, KeyboardAvoidingView, Platform, Alert, StyleSheet, StatusBar, Dimensions, Keyboard, LayoutAnimation, UIManager } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import Constants, { ExecutionEnvironment } from 'expo-constants';
import COLORS from '../constants/colors';
import { SPACING } from '../constants/styleConstants';
import { useMessageStore, Message } from '../store/messageStore';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import { apiClient } from '../lib/apiClient';
import SafeScreen from '../components/SafeScreen';
import { useUIStore } from '../store/uiStore';
import styles from '../assets/styles/chat.styles';
import ChatHeader from '../components/ChatHeader';



// Premium Media Viewer Component
interface MediaViewerProps {
    visible: boolean;
    onClose: () => void;
    media: { uri: string, type: 'image' | 'video' } | null;
    onPlayingChange?: (playing: boolean) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PremiumMediaViewer: React.FC<MediaViewerProps> = ({ visible, onClose, media, onPlayingChange }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const savedScale = useSharedValue(1);

    const resetStates = useCallback(() => {
        scale.value = withTiming(1);
    }, []);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 300 });
            resetStates();
        } else {
            opacity.value = withTiming(0, { duration: 250 });
        }
    }, [visible]);

    // Pinch to zoom (Images only) - Simple zoom without pan for now to ensure fixed layout
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
        transform: [
            { scale: scale.value }
        ]
    }));

    if (!media) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
                {/* Fixed: Do not hide status bar to prevent layout shifts */}
                <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 20 }}>
                    <TouchableOpacity onPress={onClose} style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 }}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                <GestureDetector gesture={pinchGesture}>
                    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            {media.type === 'image' ? (
                                <Image
                                    source={{ uri: media.uri }}
                                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                                    contentFit="contain"
                                />
                            ) : (
                                <FullscreenVideo uri={media.uri} onPlayingChange={onPlayingChange} />
                            )}
                        </View>
                    </Animated.View>
                </GestureDetector>
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













// MessageItem Component for performance
interface MessageItemProps {
    item: Message;
    index: number;
    currentUserId: string;
    displayAvatar: string;
    onLongPress: (item: Message) => void;
    onShowViewer: (uri: string, type: 'image' | 'video') => void;
    showAvatar: boolean;
    isGlobalVideoPlaying?: boolean;
    activeVideoUri?: string | null;
}

const MessageItem = React.memo(({ item, index, currentUserId, displayAvatar, onLongPress, onShowViewer, showAvatar, isGlobalVideoPlaying, activeVideoUri }: MessageItemProps) => {
    const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
    const isMe = senderId === currentUserId || senderId === 'me';
    const isThisVideoPlaying = !!(item.video && activeVideoUri === item.video && isGlobalVideoPlaying);

    return (
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage, { width: '100%' }]}>
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
                    if (item.image) onShowViewer(item.image, 'image');
                    else if (item.video) onShowViewer(item.video, 'video');
                }}
                activeOpacity={0.8}
                style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                    (item.image || item.video) && styles.imageBubble,
                    item.isDeleted && styles.deletedBubble
                ]}
            >
                {item.isDeleted ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="ban" size={14} color={isMe ? 'rgba(255,255,255,0.6)' : COLORS.textMuted} />
                        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText, styles.deletedText]}>
                            This message was deleted
                        </Text>
                    </View>
                ) : (
                    <>
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
                        {item.text && <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>{item.text}</Text>}
                    </>
                )}

                <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    {item.isEdited && !item.isDeleted && (
                        <Text style={[styles.editedLabel, isMe ? styles.myTime : styles.theirTime]}>Edited</Text>
                    )}
                    <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
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
        </View>
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
        prevProps.isGlobalVideoPlaying === nextProps.isGlobalVideoPlaying &&
        prevProps.activeVideoUri === nextProps.activeVideoUri
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
    const [activeVideoUri, setActiveVideoUri] = useState<string | null>(null);
    const [isGlobalVideoPlaying, setIsGlobalVideoPlaying] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerMedia, setViewerMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const { messages, fetchMessages, sendMessage, markAsRead, addReceivedMessage, activeConversation, setActiveConversation, editMessage, deleteMessageForMe, deleteMessageForEveryone, updateLocalEditedMessage, updateLocalDeletedMessage, updateLocalMessagesRead, updateLocalMessageDelivered, clearChatHistory } = useMessageStore();
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
        const lastActive = new Date(userStatus.lastActive);
        if (isNaN(lastActive.getTime())) return 'Offline';
        const diffMinutes = (Date.now() - lastActive.getTime()) / 1000 / 60;
        if (diffMinutes < 5) return 'Recently active';
        return 'Offline';
    };

    const displayStatus = getDisplayStatus();
    const pulseOpacity = useSharedValue(0.4);
    const isTyping = typingStatus[userId!];
    if (Platform.OS === 'android' &&
        UIManager.setLayoutAnimationEnabledExperimental &&
        !(global as any).nativeFabricUIManager // Avoid calling on New Architecture
    ) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    useEffect(() => {
        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleShowViewer = useCallback((uri: string, type: 'image' | 'video') => {
        setViewerMedia({ uri, type });
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
        Alert.alert(
            'Share Media',
            'Choose what to share',
            [
                { text: 'Image', onPress: () => handlePickImage(false) },
                { text: 'Video', onPress: handlePickVideo },
                { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: true }
        );
    };

    const handlePickImage = async (allowEditing: boolean = false) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: allowEditing,
                aspect: [1, 1], // Square crop if enabled
                quality: 0.8,
                base64: false
            });

            if (!result.canceled && result.assets[0].uri) {
                const asset = result.assets[0];
                setSelectedImage(asset.uri);
                setSelectedImageDims({ width: asset.width, height: asset.height });

                setShowPreview(true);
            }
        } catch (error) { showAlert({ title: 'Error', message: 'Failed to pick image', type: 'error' }); }
    };

    const handleShowCropOption = () => {
        Alert.alert(
            'Edit Image',
            'Choose an action',
            [
                { text: 'Crop (1:1)', onPress: () => handlePickImage(true) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handlePickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
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
        await createAndSendMessage(messageText.trim(), undefined, undefined, undefined);
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
        fileSizeBytes?: number
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
            fileSizeBytes
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
                title: 'Delete Message',
                message: 'Are you sure you want to delete this message for yourself?',
                showCancel: true,
                confirmText: 'Delete for Me',
                onConfirm: () => { deleteMessageForMe(item._id, token!); },
                type: 'warning'
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

    const renderMessage = useCallback(({ item, index }: ListRenderItemInfo<Message>) => {
        const currentUserId = user?._id || user?.id || '';
        const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
        const isMe = senderId === currentUserId || senderId === 'me';

        // Correct avatar logic for inverted list - only show avatar if DIFFERENT sender from the NEXT message (which is visually 'below' in inverted)
        // Inverted: Next item in array = Visually ABOVE. Previous item in array = Visually BELOW.
        // We want avatar at the BOTTOM of the group.
        // In inverted list, index 0 is bottom-most.
        // So we show avatar if index is 0 OR if the previous item in array (visually below) has different sender.
        // Wait, inverted logic:
        // Array: [Newest(0), Older(1), Oldest(2)]
        // Visual:
        // [Newest(0)]
        // [Older(1)]
        // [Oldest(2)]
        //
        // Typically avatars are shown on the LAST message of a group (the bottom one).
        // Since list is inverted, index 0 is at the bottom of the screen.
        // We show avatar if:
        // 1. It's the very first item (index 0)
        // 2. OR the item BEFORE it in the array (which is visually below it? No. Inverted list renders 0 at bottom.)
        // Actually, for inverted list:
        // 0 (Bottom) -> Show avatar if the message *after* it in array (visually above) is different? No.
        // We want avatar on bottom message of group.
        // That means we show avatar if the message *before* it in the array (visually below) is different sender.
        // Wait, flatlist renders 0 at bottom.
        // 0: Me (Bottom) -> Avatar
        // 1: Me (Middle) -> No Avatar
        // 2: Them (Top) -> Avatar
        //
        // Correct logic: Show avatar if the msg with index-1 (visually below) has different sender.

        const prevMessage = conversationMessages[index - 1]; // Visually below
        const prevSenderId = prevMessage ? (typeof prevMessage.sender === 'object' ? prevMessage.sender._id : prevMessage.sender) : null;
        const showAvatar = !isMe && (!prevMessage || prevSenderId !== senderId);

        return (
            <MessageItem
                item={item}
                index={index}
                currentUserId={currentUserId}
                displayAvatar={displayAvatar}
                onLongPress={handleLongPress}
                onShowViewer={handleShowViewer}
                showAvatar={showAvatar}
                isGlobalVideoPlaying={isGlobalVideoPlaying}
                activeVideoUri={activeVideoUri}
            />
        );
    }, [user, displayAvatar, handleLongPress, conversationMessages]);

    const insets = useSafeAreaInsets();

    // Get smooth 60fps keyboard height value
    const keyboard = useAnimatedKeyboard();

    const animatedContainerStyle = useAnimatedStyle(() => {
        const basePadding = Math.max(insets.bottom, 16);
        const targetPadding = Math.max(keyboard.height.value + 16, basePadding);

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
            />

            {/* Smooth Reanimated View for Keyboard */}
            <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
                <View style={[styles.container, { paddingTop: 0 }]}>

                    {/* Messages List */}
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={conversationMessages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={[styles.messagesList, { paddingBottom: 16, paddingTop: 16 }]}
                            inverted
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled" // Essential for smooth dismiss
                            keyboardDismissMode="interactive" // Allows user to drag keyboard down
                            removeClippedSubviews={Platform.OS === 'android'}
                            initialNumToRender={20}
                            maxToRenderPerBatch={10}
                            windowSize={15}
                            updateCellsBatchingPeriod={50}
                            onEndReachedThreshold={0.5}
                            scrollEventThrottle={16}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconCircle}>
                                        <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.emptyText}>Start a literary conversation with {username}</Text>
                                </View>
                            }
                        />
                    </View>

                    {/* Input Wrapper - No longer needs dynamic padding props, outer container handles it */}
                    <View style={[styles.inputWrapper, { paddingTop: 12, paddingBottom: 0 }]}>
                        <View style={styles.inputContainer}>
                            <TouchableOpacity onPress={handlePickMedia} style={styles.iconButton}>
                                <Ionicons name="add" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Type a message..."
                                placeholderTextColor={COLORS.textMuted}
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
                                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
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

                        {selectedImage && (
                            <TouchableOpacity onPress={handleShowCropOption} style={[styles.closeButton, { marginLeft: 'auto' }]}>
                                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
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
                        <TouchableOpacity onPress={handleConfirmSendMedia} style={styles.previewSendButton} disabled={sending}>
                            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
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
        </SafeScreen >
    );
}