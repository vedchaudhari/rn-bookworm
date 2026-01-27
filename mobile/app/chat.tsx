import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, AppState, AppStateStatus, ListRenderItemInfo, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Animated, { useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../constants/colors';
import { useMessageStore, Message } from '../store/messageStore';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import { apiClient } from '../lib/apiClient';
import SafeScreen from '../components/SafeScreen';
import { useUIStore } from '../store/uiStore';
import styles from '../assets/styles/chat.styles';



// ChatImage Component for dynamic sizing
interface ChatImageProps {
    uri: string;
    messageId: string;
    initialWidth?: number;
    initialHeight?: number;
}

const ChatImage: React.FC<ChatImageProps> = React.memo(({ uri, messageId, initialWidth, initialHeight }) => {
    // Calculate initial dimensions if available
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
        // If we already have dimensions from props, trust them to avoid layout shift
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
        <Image
            source={{ uri }}
            style={[styles.sentImage, dimensions]}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
            onLoad={handleLoad}
        />
    );
});

// MessageItem Component for performance
interface MessageItemProps {
    item: Message;
    index: number;
    currentUserId: string;
    displayAvatar: string;
    onLongPress: (item: Message) => void;
    showAvatar: boolean;
}

const MessageItem = React.memo(({ item, index, currentUserId, displayAvatar, onLongPress, showAvatar }: MessageItemProps) => {
    const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
    const isMe = senderId === currentUserId || senderId === 'me';

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
                activeOpacity={0.8}
                style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                    item.image && styles.imageBubble,
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
                            {item.pending ? (
                                <ActivityIndicator
                                    size="small"
                                    color="rgba(255,255,255,0.7)"
                                    style={{ transform: [{ scale: 0.6 }] }}
                                />
                            ) : (
                                <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color={item.read ? COLORS.secondary : "rgba(255,255,255,0.7)"}
                                />
                            )}
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
        prevProps.showAvatar === nextProps.showAvatar
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
    const [showPreview, setShowPreview] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const { messages, fetchMessages, sendMessage, markAsRead, addReceivedMessage, setActiveConversation, editMessage, deleteMessageForMe, deleteMessageForEveryone, updateLocalEditedMessage, updateLocalDeletedMessage, updateLocalMessagesRead, clearChatHistory } = useMessageStore();
    const { token, user } = useAuthStore();
    const { showAlert } = useUIStore();
    const { socket, userStatuses, typingStatus, sendTypingStart, sendTypingStop, isConnected } = useNotificationStore();
    const typingTimeoutRef = useRef<any>(null);

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

    useEffect(() => {
        if (isOnline) {
            pulseOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0.4, { duration: 1000 })), -1, true);
        } else { pulseOpacity.value = 0; }

        loadMessages();
        markAsRead(userId!, token!);
        setActiveConversation(userId!);

        if (socket) {
            socket.on('new_message', handleNewMessage);
            socket.on('message_edited', handleMessageEdited);
            socket.on('message_deleted', handleMessageDeleted);
            socket.on('messages_read', handleMessagesRead);
        }
        return () => {
            setActiveConversation(null);
            if (socket) {
                socket.off('new_message', handleNewMessage);
                socket.off('message_edited', handleMessageEdited);
                socket.off('message_deleted', handleMessageDeleted);
                socket.off('messages_read', handleMessagesRead);
            }
            // Clean up typing timeout to prevent memory leaks
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, [userId, socket, isOnline]);

    useEffect(() => { if (isConnected) loadMessages(); }, [isConnected]);

    const appState = useRef<AppStateStatus>(AppState.currentState);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                loadMessages();
                markAsRead(userId!, token!);
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, [userId, token]);

    const handleNewMessage = (message: Message) => {
        const currentUserId = user?._id || user?.id;
        const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
        if (senderId === userId && currentUserId) {
            addReceivedMessage(message, currentUserId);
            markAsRead(userId!, token!);
        }
    };


    const handleMessageEdited = (data: any) => {
        updateLocalEditedMessage(data);
    };

    const handleMessageDeleted = (data: any) => {
        updateLocalDeletedMessage(data);
    };

    const getConversationId = (id1: string, id2: string) => {
        const ids = [id1.toString(), id2.toString()].sort();
        return `${ids[0]}_${ids[1]}`;
    };

    const handleMessagesRead = (data: any) => {
        if (data.conversationId === getConversationId(user?._id || user?.id || '', userId!)) {
            updateLocalMessagesRead(data);
        }
    };

    const animatedStatusStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));
    const loadMessages = async () => { await fetchMessages(userId!, token!); };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: false // NO BASE64
            });

            if (!result.canceled && result.assets[0].uri) {
                setSelectedImage(result.assets[0].uri);
                setSelectedImageDims({ width: result.assets[0].width, height: result.assets[0].height });
                setShowPreview(true);
            }
        } catch (error) { showAlert({ title: 'Error', message: 'Failed to pick image', type: 'error' }); }
    };

    const handleConfirmSendImage = async () => {
        if (!selectedImage || sending) return;
        setSending(true);

        try {
            const fileUri = selectedImage;
            const fileName = fileUri.split('/').pop() || 'image.jpg';
            const fileExtension = fileName.split('.').pop() || 'jpg';
            const contentType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

            // 1. Get Presigned URL
            const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                '/api/messages/presigned-url',
                { fileName, contentType }
            );

            // 2. Upload to S3
            // Convert file URI to blob for upload
            const blobResponse = await fetch(fileUri);
            const blob = await blobResponse.blob();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': contentType }
            });

            if (!uploadResponse.ok) throw new Error('S3 upload failed');

            // 3. Send Message with final URL
            setShowPreview(false);
            const localUri = selectedImage;
            const dims = selectedImageDims;
            setSelectedImage(null);
            setSelectedImageDims(null);
            await createAndSendMessage(undefined, finalUrl, localUri, dims?.width, dims?.height);
        } catch (error: any) {
            console.error('Upload error:', error);
            showAlert({ title: 'Error', message: 'Failed to upload image. Please try again.', type: 'error' });
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
        await createAndSendMessage(messageText.trim(), undefined);
    };

    const handleLongPress = useCallback((item: Message) => {
        const currentUserId = user?._id || user?.id;
        const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
        const isMe = senderId === currentUserId || senderId === 'me';

        if (item.isDeleted) return;

        showAlert({
            title: 'Message Options',
            message: 'What would you like to do with this message?',
            showCancel: true,
            confirmText: isMe ? 'Delete for Everyone' : 'Delete for Me',
            onConfirm: () => {
                if (isMe) deleteMessageForEveryone(item._id, token!);
                else deleteMessageForMe(item._id, token!);
            }
        });
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

    const createAndSendMessage = async (text: string | undefined, image: string | undefined, localImage?: string, width?: number, height?: number) => {
        setSending(true);
        if (text) setMessageText('');

        // Immediate scroll to bottom for improved UX
        setTimeout(() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }, 0);

        const result = await sendMessage(userId!, text || '', image, token!, localImage, width, height);
        setSending(false);
        if (!result.success) showAlert({ title: 'Error', message: 'Failed to send message', type: 'error' });
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
                showAvatar={showAvatar}
            />
        );
    }, [user, displayAvatar, handleLongPress, conversationMessages]);

    const insets = useSafeAreaInsets();

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.container}>
                    {/* Custom Header */}
                    <View style={[styles.headerRow, { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
                        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
                            {isOnline && <Animated.View style={[styles.statusDot, animatedStatusStyle]} />}
                        </View>

                        <View style={[styles.headerInfo, { flex: 1, marginLeft: 12 }]}>
                            <Text style={styles.headerName}>{isSelf ? 'Saved Messages' : username}</Text>
                            {isTyping && !isSelf ? (
                                <Text style={[styles.headerStatus, { color: COLORS.primary, textTransform: 'none' }]}>Typing...</Text>
                            ) : (
                                <Text style={styles.headerStatus}>{displayStatus}</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                showAlert({
                                    title: 'Clear Chat',
                                    message: 'Are you sure you want to clear your local chat history? This cannot be undone.',
                                    showCancel: true,
                                    confirmText: 'Clear',
                                    type: 'warning',
                                    onConfirm: () => clearChatHistory(userId!, token!)
                                });
                            }}
                            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={conversationMessages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={[styles.messagesList, { paddingBottom: 16, paddingTop: 16 }]}
                        inverted
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
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

                    <View style={[styles.inputWrapper, { paddingBottom: insets.bottom || 16 }]}>
                        <View style={styles.inputContainer}>
                            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton}>
                                <Ionicons name="add" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Type a message..."
                                placeholderTextColor={COLORS.textMuted}
                                value={messageText}
                                onChangeText={handleTextChange}
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
                </View>
            </KeyboardAvoidingView>

            <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
                <View style={styles.previewOverlay}>
                    <View style={styles.previewHeader}>
                        <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.previewImageContainer}>
                        <View style={styles.previewImageWrapper}>
                            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="contain" />}
                        </View>
                    </View>

                    <View style={styles.previewFooter}>
                        <TouchableOpacity onPress={handleConfirmSendImage} style={styles.previewSendButton} disabled={sending}>
                            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeScreen>
    );
}
