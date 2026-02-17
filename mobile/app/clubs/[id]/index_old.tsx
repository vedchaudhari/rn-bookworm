import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, TextInput, AppState, AppStateStatus } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GiftedChat, IMessage, Bubble, InputToolbar, BubbleProps, Composer } from 'react-native-gifted-chat';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../../constants/colors';
import { useAuthStore } from '../../../store/authContext';
import { apiClient } from '../../../lib/apiClient';
import SafeScreen from '../../../components/SafeScreen';
import GlassCard from '../../../components/GlassCard';
import { useUIStore } from '../../../store/uiStore';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../../../constants/api';
import { useChatThemeStore } from '../../../store/chatThemeStore';
import { SHADOWS } from '../../../constants/styleConstants';

import { Club, ClubUser, IClubMessage } from '../../../types/club';

export default function ClubDetailScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const [messages, setMessages] = useState<IClubMessage[]>([]);
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [text, setText] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<IClubMessage | null>(null);

    const { user, token } = useAuthStore();
    const router = useRouter();
    const { showAlert } = useUIStore();
    const socket = useRef<Socket | null>(null);
    const { getTheme } = useChatThemeStore();
    const currentTheme = getTheme(user?._id || 'default');

    const fetchClubDetails = async () => {
        try {
            const data = await apiClient.get<Club>(`/api/clubs/${id}`);
            setClub(data);
        } catch (error) {
            console.error('Error fetching club details:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            console.log(`📡 Fetching messages for club ${id}...`);
            const data = await apiClient.get<any[]>(`/api/clubs/${id}/messages`);

            const formattedMessages: IClubMessage[] = data.map((msg: any) => ({
                _id: msg._id,
                text: msg.text,
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

            setMessages(formattedMessages);
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
        }
    };

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            await Promise.all([fetchClubDetails(), fetchMessages()]);
            setLoading(false);
        };

        loadData();
        setupSocket();

        return () => {
            if (socket.current) {
                socket.current.emit('leave_club', id);
                socket.current.disconnect();
            }
        };
    }, [id]);

    // Emit delivery acknowledgments for messages not sent by current user
    useEffect(() => {
        if (!socket.current || !user?._id || messages.length === 0) return;

        messages.forEach(msg => {
            // Only acknowledge messages from others
            if (msg.user._id !== String(user._id)) {
                // Check if already delivered by current user
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
                // Re-emit delivery acknowledgments when app becomes active
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

        socket.current = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.current.emit('join_club', id);

        socket.current.on('new_message', (newMessage: any) => {
            const giftedMessage: IClubMessage = {
                _id: newMessage._id,
                text: newMessage.text,
                createdAt: new Date(newMessage.createdAt),
                user: {
                    _id: String(newMessage.sender._id),
                    name: newMessage.sender.username,
                    avatar: newMessage.sender.profileImage,
                },
                readBy: newMessage.readBy,
                deliveredTo: newMessage.deliveredTo,
                clubId: newMessage.clubId
            };
            setMessages(previousMessages => GiftedChat.append(previousMessages, [giftedMessage]));
        });

        socket.current.on('message_updated', (updatedData: any) => {
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

    const onSend = useCallback(async (newMessages: IMessage[] = []) => {
        const msg = newMessages[0];
        setText(''); // Clear input immediately

        try {
            // Optimistic update
            setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));

            // Send to backend
            await apiClient.post(`/api/clubs/${id}/messages`, {
                text: msg.text
            });

        } catch (error) {
            console.error('Error sending message:', error);
            showAlert({ title: 'Error', message: 'Failed to send message', type: 'error' });
        }
    }, [id, showAlert]);

    // Mark messages as read when they become visible
    const handleMessagesViewed = useCallback(() => {
        if (!socket.current || !user?._id) return;

        // Emit read receipt for unread messages from others
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

    // Emit read receipts when component mounts and messages are loaded
    useEffect(() => {
        if (messages.length > 0) {
            handleMessagesViewed();
        }
    }, [messages.length]); // Only run when messages first load

    // Delete message for current user only
    const deleteMessageForMe = async (messageId: string) => {
        try {
            await apiClient.delete(`/api/clubs/${id}/messages/${messageId}/delete-for-me`);
            // Optimistically update UI
            setMessages(prevMessages => prevMessages.map(msg =>
                msg._id === messageId ? { ...msg, text: 'This message was deleted', isDeleted: true } : msg
            ));
        } catch (error) {
            console.error('Error deleting message:', error);
            showAlert({ title: 'Error', message: 'Failed to delete message', type: 'error' });
        }
    };

    // Delete message for everyone (admin/sender only)
    const deleteMessageForEveryone = async (messageId: string) => {
        try {
            await apiClient.delete(`/api/clubs/${id}/messages/${messageId}`);
            // Optimistically update UI
            setMessages(prevMessages => prevMessages.map(msg =>
                msg._id === messageId ? { ...msg, text: 'This message was deleted', isDeleted: true } : msg
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

        if (isDeleted) return; // Don't show menu for deleted messages

        if (isMyMessage) {
            // Owner can delete for self or everyone, and view info
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
                    // Show second alert for delete type
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
            // Others can only delete for themselves or view info
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

    // Custom Renderers for Premium Look - Aligned with Single Chat Style
    const renderBubble = useCallback((props: BubbleProps<IMessage>) => (
        <TouchableOpacity
            onLongPress={() => {
                const message = props.currentMessage as IClubMessage;
                if (message) {
                    handleLongPress(message);
                }
            }}
            activeOpacity={1}
            delayLongPress={300}
        >
            <Bubble
                {...props}
                containerStyle={{
                    right: { marginRight: 8 },
                    left: { marginLeft: 8 }
                }}
                wrapperStyle={{
                    right: {
                        backgroundColor: currentTheme.myBubbleColor,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 20,
                        borderBottomLeftRadius: 20,
                        borderTopLeftRadius: 20,
                        marginBottom: 4,
                        ...SHADOWS.aura,
                        shadowColor: currentTheme.auraColor,
                    },
                    left: {
                        backgroundColor: currentTheme.theirBubbleColor,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 20,
                        borderBottomRightRadius: 20,
                        borderTopRightRadius: 20,
                        marginBottom: 4,
                    }
                }}
                textStyle={{
                    right: {
                        color: '#FFFFFF',
                        fontWeight: '600',
                        fontSize: 16,
                        lineHeight: 22,
                    },
                    left: {
                        color: '#FFFFFF',
                        fontWeight: '600',
                        fontSize: 16,
                        lineHeight: 22,
                    }
                }}
                // @ts-ignore
                timeTextStyle={{
                    right: { color: 'rgba(255,255,255,0.6)' },
                    left: { color: 'rgba(255,255,255,0.6)' }
                }}
                renderTicks={(message) => {
                    if (message.user._id !== user?._id) return null;

                    const msg = message as IClubMessage;
                    const members = club?.memberCount || 1;
                    // Exclude sender from count
                    const targetCount = Math.max(1, members - 1);

                    const deliveredCount = msg.deliveredTo?.length || 0;
                    const readCount = msg.readBy?.length || 0;

                    let iconName: keyof typeof Ionicons.glyphMap = "checkmark";
                    let iconColor = "rgba(255,255,255,0.5)";

                    if (readCount >= targetCount) {
                        iconName = "checkmark-done";
                        iconColor = "#34B7F1"; // WhatsApp Blue
                    } else if (deliveredCount >= targetCount) {
                        iconName = "checkmark-done";
                        iconColor = "rgba(255,255,255,0.5)"; // Double Grey
                    }

                    return (
                        <View style={{ marginRight: 4, marginBottom: 2 }}>
                            <Ionicons name={iconName} size={16} color={iconColor} />
                        </View>
                    );
                }}
            />
        </TouchableOpacity>
    ), [currentTheme, club, user, handleLongPress]);

    const renderInputToolbar = useCallback((props: any) => (
        <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={{ alignItems: 'center' }}
            textInputProps={{
                ...props.textInputProps,
                placeholder: "Type a message...",
                placeholderTextColor: COLORS.textMuted,
            }}
        />
    ), []);

    const renderComposer = useCallback((props: any) => (
        <View style={styles.composerContainer}>
            <Composer
                {...props}
                textInputStyle={styles.inputArgs}
                placeholder="Message..."
                placeholderTextColor={COLORS.textMuted}
            />
        </View>
    ), []);

    const renderSend = useCallback((props: any) => {
        const canSend = props.text && props.text.trim().length > 0;
        return (
            <TouchableOpacity
                onPress={() => canSend ? props.onSend({ text: props.text.trim() }, true) : null}
                style={[styles.sendButton, !canSend && { opacity: 0.5 }]}
                disabled={!canSend}
            >
                <Ionicons name="send" size={20} color={COLORS.primary} />
            </TouchableOpacity>
        );
    }, []);

    if (loading) return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        </SafeScreen>
    );

    // DEBUG: Log render data
    console.log('🎨 Rendering Club Chat - Messages:', messages.length, 'User:', user?._id, 'Club:', club?.name);

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
            {selectedMessage ? (
                <View style={[styles.header, { backgroundColor: 'rgba(25, 227, 209, 0.1)' }]}>
                    <TouchableOpacity onPress={() => setSelectedMessage(null)} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>1 Selected</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => {
                            router.push({
                                // @ts-ignore
                                pathname: '/clubs/[id]/message-info',
                                params: {
                                    id: id,
                                    messageId: selectedMessage._id,
                                    clubId: id // Ensure clubId is passed
                                }
                            });
                            setSelectedMessage(null);
                        }}
                    >
                        <Ionicons name="information-circle-outline" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerInfo} onPress={() => setShowDetails(!showDetails)}>
                        <Text style={styles.headerTitle}>{club?.name || name}</Text>
                        <Text style={styles.headerSubtitle}>{club?.memberCount || 0} members • Tap for info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            )}

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

            {/* Chat Interface */}
            <View style={{ flex: 1 }}>
                <GiftedChat
                    messages={messages}
                    onSend={onSend}
                    user={{
                        _id: String(user?._id || 'guest'),
                        name: user?.username,
                        avatar: user?.profileImage,
                    }}
                    text={text}
                    textInputProps={{ onChangeText: setText }}
                    renderBubble={renderBubble}
                    renderInputToolbar={renderInputToolbar}
                    renderComposer={renderComposer}
                    renderSend={renderSend}
                    messagesContainerStyle={{ paddingBottom: 20 }}
                    listProps={{
                        showsVerticalScrollIndicator: false,
                    }}
                />
            </View>
            {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 0.5 },
    headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    detailsCard: { margin: 16, marginTop: 0, padding: 16, zIndex: 10 },
    detailsContent: { alignItems: 'center' },
    clubImageLarge: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: COLORS.primary },
    description: { color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    tagBadge: { backgroundColor: 'rgba(25, 227, 209, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(25, 227, 209, 0.2)' },
    tagText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

    // Chat Styles
    inputToolbar: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    composerContainer: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        marginRight: 12,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    inputArgs: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
        maxHeight: 100,
        paddingTop: Platform.OS === 'ios' ? 0 : 8, // Center text vertically
        paddingBottom: Platform.OS === 'ios' ? 0 : 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(25, 227, 209, 0.2)',
    }
});
