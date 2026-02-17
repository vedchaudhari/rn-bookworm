import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, TextInput, AppState, AppStateStatus, FlatList, Alert } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import PremiumMediaViewer from '../../../components/PremiumMediaViewer';
import COLORS from '../../../constants/colors';
import { useAuthStore } from '../../../store/authContext';
import { apiClient } from '../../../lib/apiClient';
import SafeScreen from '../../../components/SafeScreen';
import GlassCard from '../../../components/GlassCard';
import { useUIStore } from '../../../store/uiStore';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../../../constants/api';
import { useChatThemeStore } from '../../../store/chatThemeStore';
import { SHADOWS, SPACING, PADDING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/styleConstants';
import { formatMessageDate, isSameDay } from '../../../utils/dateUtils';

import { Club, ClubUser, IClubMessage } from '../../../types/club';


// ChatImage Component for dynamic sizing
// ChatImage Component for dynamic sizing
interface ChatImageProps {
    uri: string;
    messageId: string;
    initialWidth?: number;
    initialHeight?: number;
    onPress?: () => void;
}

const ChatImage: React.FC<ChatImageProps> = React.memo(({ uri, messageId, onPress }) => {
    const [dimensions, setDimensions] = useState({ width: 240, height: 180 });

    const handleLoad = (event: any) => {
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
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={[{ borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs }, dimensions]}
        >
            <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                onLoad={handleLoad}
            />
        </TouchableOpacity>
    );
}, (prev, next) => prev.uri === next.uri && prev.messageId === next.messageId);

// Message Item Component
const MessageItem = React.memo(({
    message,
    currentUserId,
    onLongPress,
    onImagePress,
    theme,
    club
}: {
    message: IClubMessage;
    currentUserId: string;
    onLongPress: (msg: IClubMessage) => void;
    onImagePress: (uri: string) => void;
    theme: any;
    club: Club | null;
}) => {
    const isMe = message.user._id === currentUserId;
    const isDeleted = (message as any).isDeleted;

    const members = club?.memberCount || 1;
    const targetCount = Math.max(1, members - 1);
    const deliveredCount = message.deliveredTo?.length || 0;
    const readCount = message.readBy?.length || 0;

    let iconName: keyof typeof Ionicons.glyphMap = "checkmark";
    let iconColor = "rgba(255,255,255,0.5)";

    if (readCount >= targetCount) {
        iconName = "checkmark-done";
        iconColor = "#34B7F1";
    } else if (deliveredCount >= targetCount) {
        iconName = "checkmark-done";
        iconColor = "rgba(255,255,255,0.5)";
    }

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={() => onLongPress(message)}
            style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}
        >
            <View
                style={[
                    styles.messageBubble,
                    isMe ? {
                        backgroundColor: theme.myBubbleColor,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 20,
                        borderBottomLeftRadius: 20,
                        borderTopLeftRadius: 20,
                        ...SHADOWS.aura,
                        shadowColor: theme.auraColor,
                    } : {
                        backgroundColor: theme.theirBubbleColor,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 20,
                        borderBottomRightRadius: 20,
                        borderTopRightRadius: 20,
                    }
                ]}
            >
                {isDeleted ? (
                    <Text style={styles.deletedText}>This message was deleted</Text>
                ) : (
                    <>
                        {message.image && (
                            <ChatImage
                                uri={message.image}
                                messageId={message._id as string}
                                onPress={() => onImagePress(message.image!)}
                            />
                        )}
                        {message.text && <Text style={styles.messageText}>{message.text}</Text>}
                    </>
                )}

                <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && !isDeleted && (
                        <View style={{ marginLeft: 4, marginBottom: 2 }}>
                            <Ionicons name={iconName} size={16} color={iconColor} />
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function ClubDetailScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const [messages, setMessages] = useState<IClubMessage[]>([]);
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [text, setText] = useState('');
    const [isMember, setIsMember] = useState<boolean>(false);
    const [membershipError, setMembershipError] = useState<boolean>(false);
    const [joiningClub, setJoiningClub] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [openingImagePicker, setOpeningImagePicker] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [viewingMedia, setViewingMedia] = useState<{ uri: string, type: 'image' | 'video', timestamp?: string, senderName?: string } | null>(null);

    // Transform messages to include date separators
    const messagesWithSeparators = React.useMemo(() => {
        const items: Array<IClubMessage | { type: 'date', date: string, _id: string }> = [];

        for (let i = 0; i < messages.length; i++) {
            const currentMessage = messages[i];
            const previousMessage = messages[i - 1];

            // Check if we need a date separator (ensure dates are Date objects)
            const currentDate = currentMessage.createdAt instanceof Date ? currentMessage.createdAt : new Date(currentMessage.createdAt);
            const prevDate = previousMessage?.createdAt ? (previousMessage.createdAt instanceof Date ? previousMessage.createdAt : new Date(previousMessage.createdAt)) : null;

            if (!prevDate || !isSameDay(currentDate, prevDate)) {
                items.push({
                    type: 'date',
                    date: formatMessageDate(currentDate),
                    _id: `date-${i}`
                });
            }

            items.push(currentMessage);
        }

        return items;
    }, [messages]);

    const { user, token } = useAuthStore();
    const router = useRouter();
    const { showAlert } = useUIStore();
    const socket = useRef<Socket | null>(null);
    const { getTheme } = useChatThemeStore();
    const currentTheme = getTheme(user?._id || 'default');
    const flatListRef = useRef<FlatList>(null);

    const fetchClubDetails = async () => {
        try {
            const data = await apiClient.get<any>(`/api/clubs/${id}`);
            setClub(data);
            // Extract membership status from response
            setIsMember(data.isMember || false);
        } catch (error) {
            console.error('Error fetching club details:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const data = await apiClient.get<any[]>(`/api/clubs/${id}/messages`);

            const formattedMessages: IClubMessage[] = data.map((msg) => ({
                _id: msg._id,
                text: msg.text,
                image: msg.image,
                video: msg.video,
                videoThumbnail: msg.videoThumbnail,
                createdAt: new Date(msg.createdAt),
                user: {
                    _id: String(msg.sender._id),
                    name: msg.sender.username,
                    avatar: msg.sender.profileImage,
                },
                readBy: msg.readBy,
                deliveredTo: msg.deliveredTo,
                clubId: msg.clubId
            }));

            // Sort oldest first, newest last (normal chat order)
            formattedMessages.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            setMessages(formattedMessages);
        } catch (error: any) {
            // Handle 403 specifically - user is not a member (don't show error toast)
            if (error?.status === 403 || error?.response?.status === 403) {
                setMembershipError(true);
                return; // Return early to avoid console.error
            }
            // For other errors, log them
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            await fetchClubDetails();
            // Only fetch messages if this will be handled by membership check
            await fetchMessages();
            setLoading(false);
        };

        loadData();

        return () => {
            if (socket.current) {
                socket.current.emit('leave_club', id);
                socket.current.disconnect();
            }
        };
    }, [id]);

    // Setup socket only if user is a member - after data has loaded
    useEffect(() => {
        if (isMember && !membershipError && !loading) {
            setupSocket();
        }

        // Cleanup socket when leaving membership or unmounting
        return () => {
            if (socket.current) {
                socket.current.emit('leave_club', id);
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [isMember, membershipError, loading]);

    // Emit delivery acknowledgments for messages not sent by current user
    useEffect(() => {
        if (!socket.current || !user?._id || messages.length === 0) return;

        messages.forEach(msg => {
            if (msg.user._id !== String(user._id)) {
                const alreadyDelivered = msg.deliveredTo?.some(d => {
                    const userId = typeof d.user === 'string' ? d.user : d.user._id;
                    return userId === String(user._id);
                });

                if (!alreadyDelivered) {
                    socket.current?.emit('message_delivered', {
                        messageId: msg._id,
                        senderId: msg.user._id
                    });
                }
            }
        });
    }, [messages, user?._id]);

    // Handle app state changes for delivery updates
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && socket.current && user?._id) {
                messages.forEach(msg => {
                    if (msg.user._id !== String(user._id)) {
                        const alreadyDelivered = msg.deliveredTo?.some(d => {
                            const userId = typeof d.user === 'string' ? d.user : d.user._id;
                            return userId === String(user._id);
                        });
                        if (!alreadyDelivered) {
                            socket.current?.emit('message_delivered', {
                                messageId: msg._id,
                                senderId: msg.user._id
                            });
                        }
                    }
                });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [messages, user?._id]);

    const setupSocket = () => {
        if (!token || !id) return;

        // Clean up existing socket before creating new one
        if (socket.current) {
            socket.current.disconnect();
            socket.current = null;
        }

        socket.current = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        if (user?._id) {
            socket.current.emit('authenticate', user._id);
        }
        socket.current.emit('join_club', id);

        socket.current.on('new_message', (newMessage: any) => {
            // Validate message structure
            if (!newMessage || !newMessage._id || !newMessage.sender) {
                console.warn('Invalid message received from socket:', newMessage);
                return;
            }

            // Check if still a member (race condition protection)
            if (!isMember) {

                return;
            }

            const giftedMessage: IClubMessage = {
                _id: newMessage._id,
                text: newMessage.text,
                image: newMessage.image,
                video: newMessage.video,
                videoThumbnail: newMessage.videoThumbnail,
                createdAt: new Date(newMessage.createdAt),
                user: {
                    _id: String(newMessage.sender._id),
                    name: newMessage.sender.username || 'Unknown',
                    avatar: newMessage.sender.profileImage,
                },
                readBy: newMessage.readBy,
                deliveredTo: newMessage.deliveredTo,
                clubId: newMessage.clubId
            };

            // Prevent duplicates - check if message already exists
            setMessages(previousMessages => {
                const exists = previousMessages.some(msg => msg._id === giftedMessage._id);
                if (exists) {

                    return previousMessages;
                }
                return [...previousMessages, giftedMessage];
            });
        });

        socket.current.on('message_updated', (updatedData: any) => {
            if (!updatedData || !updatedData.messageId) return;

            setMessages(previousMessages => previousMessages.map(msg => {
                if (msg._id === updatedData.messageId) {
                    return {
                        ...msg,
                        readBy: updatedData.readBy || msg.readBy,
                        deliveredTo: updatedData.deliveredTo || msg.deliveredTo
                    };
                }
                return msg;
            }));
        });
    };

    const onSend = useCallback(async () => {
        if ((!text.trim() && !selectedImage) || !id || !user || sendingMessage) return;

        setSendingMessage(true);
        const trimmedText = text.trim();
        const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update

        try {
            // Upload image if selected
            let imageUrl: string | null = null;
            if (selectedImage) {
                imageUrl = await uploadImageToS3(selectedImage);
                if (!imageUrl) {
                    showAlert({ title: 'Error', message: 'Failed to upload image', type: 'error' });
                    return;
                }
                setSelectedImage(null); // Clear selection after upload
            }

            // Create optimistic message
            const optimisticMessage: IClubMessage = {
                _id: tempId,
                text: trimmedText,
                image: imageUrl || undefined,
                createdAt: new Date(),
                user: {
                    _id: String(user._id),
                    name: user.username,
                    avatar: user.profileImage,
                },
                readBy: [{ user: String(user._id), readAt: new Date().toISOString() }],
                deliveredTo: [{ user: String(user._id), deliveredAt: new Date().toISOString() }],
                clubId: id
            };

            // Optimistically add message to UI
            setMessages(prev => [...prev, optimisticMessage]);
            setText('');

            const response = await apiClient.post<any>(`/api/clubs/${id}/messages`, {
                text: trimmedText || '',
                image: imageUrl,
            });

            // Replace optimistic message with server response (handle socket race conditions)
            setMessages(prev => {
                const hasReal = prev.some(msg => msg._id === response._id);
                if (hasReal) return prev; // Socket already delivered, skip

                return prev.map(msg =>
                    msg._id === tempId ? {
                        _id: response._id,
                        text: response.text,
                        image: response.image,
                        video: response.video,
                        videoThumbnail: response.videoThumbnail,
                        createdAt: new Date(response.createdAt),
                        user: {
                            _id: String(response.sender._id),
                            name: response.sender.username,
                            avatar: response.sender.profileImage,
                        },
                        readBy: response.readBy,
                        deliveredTo: response.deliveredTo,
                        clubId: response.clubId
                    } : msg
                );
            });
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg._id !== tempId));
            showAlert({ title: 'Error', message: 'Failed to send message', type: 'error' });
        } finally {
            setSendingMessage(false);
        }
    }, [text, id, user, showAlert, sendingMessage, selectedImage]);

    // Mark messages as read when they become visible
    const handleMessagesViewed = useCallback(() => {
        if (!socket.current || !user?._id) return;

        messages.forEach(msg => {
            if (msg.user._id !== String(user._id)) {
                const alreadyRead = msg.readBy?.some(r => {
                    const userId = typeof r.user === 'string' ? r.user : r.user._id;
                    return userId === String(user._id);
                });

                if (!alreadyRead) {
                    socket.current?.emit('message_read', {
                        messageId: msg._id,
                        conversationId: `club_${id}`,
                        senderId: msg.user._id
                    });
                }
            }
        });
    }, [messages, user?._id, id]);

    useEffect(() => {
        if (messages.length > 0) {
            handleMessagesViewed();
        }
    }, [messages.length]);

    // Delete message for current user only
    const deleteMessageForMe = async (messageId: string) => {
        try {
            await apiClient.delete(`/api/clubs/${id}/messages/${messageId}/delete-for-me`);
            setMessages(prevMessages => prevMessages.map(msg =>
                msg._id === messageId ? { ...msg, text: 'This message was deleted', isDeleted: true } as any : msg
            ));
        } catch (error) {
            console.error('Error deleting message:', error);
            showAlert({ title: 'Error', message: 'Failed to delete message', type: 'error' });
        }
    };

    // Delete message for everyone
    const deleteMessageForEveryone = async (messageId: string) => {
        try {
            await apiClient.delete(`/api/clubs/${id}/messages/${messageId}`);
            setMessages(prevMessages => prevMessages.map(msg =>
                msg._id === messageId ? { ...msg, text: 'This message was deleted', isDeleted: true } as any : msg
            ));
        } catch (error) {
            console.error('Error deleting message:', error);
            showAlert({ title: 'Error', message: 'Failed to delete message', type: 'error' });
        }
    };

    // Handle long press on message
    const handleLongPress = useCallback((message: IClubMessage) => {
        if (!message || !user?._id) return;

        const isMyMessage = message.user._id === String(user._id);
        const isDeleted = (message as any).isDeleted;

        if (isDeleted) return;

        if (isMyMessage) {
            showAlert({
                title: 'Message Options',
                message: 'Choose an action',
                showCancel: true,
                confirmText: 'View Info',
                onConfirm: () => {
                    router.push({
                        // @ts-ignore
                        pathname: '/clubs/[id]/message-info',
                        params: {
                            id: id,
                            messageId: message._id,
                            clubId: id
                        }
                    });
                },
                confirmText2: 'Delete Message',
                onConfirm2: () => {
                    showAlert({
                        title: 'Delete Message',
                        message: 'Choose delete option',
                        showCancel: true,
                        confirmText: 'Delete for Me',
                        onConfirm: () => deleteMessageForMe(message._id as string),
                        confirmText2: 'Delete for Everyone',
                        onConfirm2: () => deleteMessageForEveryone(message._id as string),
                        type: 'warning'
                    });
                },
                type: 'info'
            });
        } else {
            showAlert({
                title: 'Message Options',
                message: 'Choose an action',
                showCancel: true,
                confirmText: 'View Info',
                onConfirm: () => {
                    router.push({
                        // @ts-ignore
                        pathname: '/clubs/[id]/message-info',
                        params: {
                            id: id,
                            messageId: message._id,
                            clubId: id
                        }
                    });
                },
                confirmText2: 'Delete for Me',
                onConfirm2: () => deleteMessageForMe(message._id as string),
                type: 'info'
            });
        }
    }, [user?._id, id, showAlert, router]);

    // Image picker handler
    // Image picker handler
    const handlePickImage = async () => {
        if (openingImagePicker) return;

        try {
            setOpeningImagePicker(true);
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert({ title: 'Permission Required', message: 'Please grant photo library access to share images.', type: 'warning' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            showAlert({ title: 'Error', message: 'Failed to select image', type: 'error' });
        } finally {
            setOpeningImagePicker(false);
        }
    };

    const handleImagePress = useCallback((uri: string) => {
        setViewingMedia({
            uri,
            type: 'image',
            timestamp: new Date().toLocaleTimeString(),
            senderName: 'Club Member'
        });
    }, []);

    // Upload image to S3
    // Upload image to S3
    const uploadImageToS3 = async (imageUri: string): Promise<string | null> => {
        try {

            setUploadingImage(true);

            // Determine content type matches chat.tsx logic
            const fileName = imageUri.split('/').pop() || 'image.jpg';
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
            let contentType = 'image/jpeg';
            if (fileExtension === 'png') contentType = 'image/png';
            else if (fileExtension === 'webp') contentType = 'image/webp';



            // Get presigned URL (using GET to match chat.tsx)
            const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                '/api/messages/presigned-url',
                { fileName, contentType }
            );



            // Upload to S3
            const imageResponse = await fetch(imageUri);
            const blob = await imageResponse.blob();


            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': contentType,
                },
            });



            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('S3 Upload Failed:', errorText);
                throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
            }


            return finalUrl;
        } catch (error) {
            console.error('S3 upload error detailed:', error);
            showAlert({ title: 'Upload Failed', message: 'Failed to upload image. Please try again.', type: 'error' });
            return null;
        } finally {
            setUploadingImage(false);
        }
    };


    // Handle joining the club
    const handleJoinClub = async () => {
        if (!id || joiningClub) return;

        setJoiningClub(true);
        try {
            await apiClient.post(`/api/clubs/${id}/join`);
            setIsMember(true);
            setMembershipError(false);
            // Refresh data
            await fetchClubDetails();
            await fetchMessages();
            setupSocket();
            showAlert({ title: 'Success', message: 'You have joined the club!', type: 'success' });
        } catch (error: any) {
            console.error('Error joining club:', error);
            showAlert({ title: 'Error', message: error?.response?.data?.message || 'Failed to join club', type: 'error' });
        } finally {
            setJoiningClub(false);
        }
    };

    const handleLeaveClub = async () => {
        Alert.alert(
            'Leave Club',
            'Are you sure you want to leave this club?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.post(`/api/clubs/${id}/leave`);
                            router.back();
                        } catch (error: any) {
                            console.error('Error leaving club:', error);
                            showAlert({ title: 'Error', message: 'Failed to leave club', type: 'error' });
                        }
                    }
                }
            ]
        );
    };

    const handleMenuPress = () => {
        Alert.alert(
            'Club Options',
            'What would you like to do?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Club Information', onPress: () => setShowDetails(true) },
                { text: 'Leave Club', style: 'destructive', onPress: handleLeaveClub },
            ]
        );
    };

    if (loading) return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        </SafeScreen>
    );

    // Show "Not a Member" UI if user is not a member
    if (!isMember || membershipError) {
        return (
            <SafeScreen top={true}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Background Gradient */}
                <View style={StyleSheet.absoluteFill}>
                    <LinearGradient
                        colors={[currentTheme.backgroundColor, '#000000']}
                        style={{ flex: 1 }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{club?.name || name}</Text>
                        <Text style={styles.headerSubtitle}>{club?.memberCount || 0} members</Text>
                    </View>
                    <View style={styles.menuButton} />
                </View>

                {/* Not a Member Content */}
                <View style={styles.notMemberContainer}>
                    <GlassCard style={styles.notMemberCard}>
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
                            </View>
                        </View>

                        <Text style={styles.notMemberTitle}>Join to Participate</Text>
                        <Text style={styles.notMemberMessage}>
                            You need to be a member of this club to view and send messages. Join now to start engaging with the community!
                        </Text>

                        {club && (
                            <View style={styles.clubPreview}>
                                {club.image && (
                                    <Image
                                        source={{ uri: club.image }}
                                        style={styles.clubPreviewImage}
                                    />
                                )}
                                <Text style={styles.clubPreviewDescription} numberOfLines={3}>
                                    {club.description}
                                </Text>
                                {club.tags && club.tags.length > 0 && (
                                    <View style={styles.tagsRow}>
                                        {club.tags.slice(0, 3).map((tag: string, i: number) => (
                                            <View key={i} style={styles.tagBadge}>
                                                <Text style={styles.tagText}>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.joinButton}
                            onPress={handleJoinClub}
                            disabled={joiningClub}
                        >
                            {joiningClub ? (
                                <ActivityIndicator size="small" color="#000000" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#000000" />
                                    <Text style={styles.joinButtonText}>Join Club</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButtonSecondary}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background Gradient */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={[currentTheme.backgroundColor, '#000000']}
                    style={{ flex: 1 }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerInfo} onPress={() => setShowDetails(!showDetails)}>
                    <Text style={styles.headerTitle}>{club?.name || name}</Text>
                    <Text style={styles.headerSubtitle}>{club?.memberCount || 0} members • Tap for info</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                    <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Expandable Details */}
            {showDetails && club && (
                <GlassCard style={styles.detailsCard}>
                    <View style={styles.detailsContent}>
                        <Image source={{ uri: club.image || 'https://via.placeholder.com/150' }} style={styles.clubImageLarge} />
                        <Text style={styles.description}>{club.description}</Text>
                        <View style={styles.tagsRow}>
                            {club.tags.map((tag: string, i: number) => (
                                <View key={i} style={styles.tagBadge}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </GlassCard>
            )}

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messagesWithSeparators}
                renderItem={({ item }) => {
                    // Handle date separator
                    if ('type' in item && item.type === 'date') {
                        return (
                            <View style={styles.dateSeparatorContainer}>
                                <View style={styles.dateSeparator}>
                                    <Text style={styles.dateSeparatorText}>{item.date}</Text>
                                </View>
                            </View>
                        );
                    }

                    // Handle regular message
                    return (
                        <MessageItem
                            message={item as IClubMessage}
                            currentUserId={String(user?._id)}
                            onLongPress={handleLongPress}
                            onImagePress={handleImagePress}
                            theme={currentTheme}
                            club={club}
                        />
                    );
                }}
                keyExtractor={(item) => item._id as string}
                contentContainerStyle={{ paddingVertical: SPACING.xl }}
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Image Preview */}
                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <View style={styles.imagePreviewWrapper}>
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.imagePreview}
                                contentFit="cover"
                            />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setSelectedImage(null)}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    {/* Attachment Button */}
                    <TouchableOpacity
                        onPress={handlePickImage}
                        style={styles.attachmentButton}
                        disabled={uploadingImage || openingImagePicker}
                    >
                        {openingImagePicker ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={text}
                            onChangeText={setText}
                            placeholder="Message..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            maxLength={1000}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={onSend}
                        style={[styles.sendButton, ((!text.trim() && !selectedImage) || uploadingImage || sendingMessage) && { opacity: 0.5 }]}
                        disabled={(!text.trim() && !selectedImage) || uploadingImage || sendingMessage}
                    >
                        {uploadingImage || sendingMessage ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Ionicons name="send" size={20} color={COLORS.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Media Viewer */}
            {viewingMedia && (
                <PremiumMediaViewer
                    visible={!!viewingMedia}
                    onClose={() => setViewingMedia(null)}
                    media={viewingMedia}
                />
            )}
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
    },
    backButton: { padding: SPACING.md },
    headerInfo: { flex: 1, marginLeft: SPACING.lg },
    headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
    headerSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
    menuButton: { padding: SPACING.md },

    detailsCard: { margin: SPACING.xl, marginTop: SPACING.md },
    detailsContent: { padding: SPACING.xl },
    clubImageLarge: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg },
    description: { fontSize: FONT_SIZE.base, color: COLORS.textPrimary, lineHeight: 22, marginBottom: SPACING.lg },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    tagBadge: {
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(25, 227, 209, 0.2)',
    },
    tagText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

    messageRow: {
        marginVertical: SPACING.xs,
        paddingHorizontal: SPACING.lg
    },
    messageRowRight: { alignItems: 'flex-end' },
    messageRowLeft: { alignItems: 'flex-start' },
    messageBubble: {
        maxWidth: '75%',
        minWidth: 80,
        paddingHorizontal: SPACING.md + 6,
        paddingVertical: SPACING.md,
        paddingTop: SPACING.md + 2,
        paddingBottom: SPACING.sm,
    },
    messageText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: SPACING.xs,
    },
    deletedText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: FONT_SIZE.md,
        fontStyle: 'italic',
        marginBottom: SPACING.xs,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        alignSelf: 'flex-end',
        gap: 4,
    },
    messageTime: {
        fontSize: FONT_SIZE.xxs,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: FONT_WEIGHT.medium,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorder,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.xxxl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.xs,
        marginRight: SPACING.lg,
        minHeight: 44,
        maxHeight: 100,
    },
    input: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.base,
        maxHeight: 80,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.circular,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(25, 227, 209, 0.2)',
    },
    attachmentButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    imagePreviewContainer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    imagePreviewWrapper: {
        position: 'relative',
        width: 120,
        height: 120,
    },
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: COLORS.error,
        borderRadius: BORDER_RADIUS.circular,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },


    // Not a Member UI Styles
    notMemberContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xxl,
    },
    notMemberCard: {
        padding: SPACING.huge,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: SPACING.xxxl,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(25, 227, 209, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notMemberTitle: {
        fontSize: FONT_SIZE.huge,
        fontWeight: FONT_WEIGHT.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    notMemberMessage: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.huge,
    },
    clubPreview: {
        width: '100%',
        marginBottom: SPACING.xxxl,
    },
    clubPreviewImage: {
        width: '100%',
        height: 150,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
    },
    clubPreviewDescription: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    joinButton: {
        width: '100%',
        height: 52,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.circular,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: SPACING.lg,
        ...SHADOWS.aura,
        shadowColor: COLORS.primary,
    },
    joinButtonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: FONT_WEIGHT.bold,
        color: '#000000',
    },
    backButtonSecondary: {
        width: '100%',
        height: 52,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },

    // Date Separator Styles
    dateSeparatorContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateSeparator: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...SHADOWS.light,
    },
    dateSeparatorText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});


// Date Separator Styles manually added
const dateSeparatorStyles = {
    dateSeparatorContainer: {
        alignItems: 'center' as const,
        marginVertical: 16,
    },
    dateSeparator: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...SHADOWS.light,
    },
    dateSeparatorText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '600' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
};
