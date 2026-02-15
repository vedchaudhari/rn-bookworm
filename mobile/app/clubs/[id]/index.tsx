import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
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

// Define strict types for Club and User
interface ClubUser {
    _id: string;
    username: string;
    profileImage: string;
}

interface Club {
    _id: string;
    name: string;
    description: string;
    image: string;
    memberCount: number;
    tags: string[];
    createdBy: ClubUser;
}

export default function ClubDetailScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    const { user, token } = useAuthStore();
    const router = useRouter();
    const { showAlert } = useUIStore();
    const socket = useRef<Socket | null>(null);
    const { getTheme } = useChatThemeStore();
    const currentTheme = getTheme(user?._id || 'default');

    useEffect(() => {
        if (!id) {
            console.log('❌ No club ID provided');
            return;
        }

        console.log('🚀 Club Chat Mounted - ID:', id);

        const loadData = async () => {
            console.log('📡 Starting data load...');
            await Promise.all([fetchClubDetails(), fetchMessages()]);
            setLoading(false);
            console.log('✅ Data load complete');
        };

        loadData();
        setupSocket();

        return () => {
            console.log('🔌 Disconnecting from club:', id);
            if (socket.current) {
                socket.current.emit('leave_club', id);
                socket.current.disconnect();
            }
        };
    }, [id]);

    const setupSocket = () => {
        if (!token || !id) return;

        socket.current = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.current.emit('join_club', id);

        socket.current.on('new_message', (newMessage: any) => {
            // Need to transform backend message to GiftedChat format
            const giftedMessage: IMessage = {
                _id: newMessage._id,
                text: newMessage.text,
                createdAt: new Date(newMessage.createdAt),
                user: {
                    _id: String(newMessage.sender._id),
                    name: newMessage.sender.username,
                    avatar: newMessage.sender.profileImage,
                },
            };
            setMessages(previousMessages => GiftedChat.append(previousMessages, [giftedMessage]));
        });
    };

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

            console.log('📥 Raw backend response:', data);
            console.log('📊 Response type:', typeof data, 'Is Array:', Array.isArray(data));

            const formattedMessages: IMessage[] = data.map((msg: any) => ({
                _id: msg._id,
                text: msg.text,
                createdAt: new Date(msg.createdAt),
                user: {
                    _id: String(msg.sender._id),
                    name: msg.sender.username,
                    avatar: msg.sender.profileImage,
                },
            }));

            // DEBUG: Verify message data
            console.log('📩 Club Messages Fetched:', formattedMessages.length);
            if (formattedMessages.length > 0) {
                console.log('📩 First Message:', JSON.stringify(formattedMessages[0], null, 2));
                console.log('📩 Last Message:', JSON.stringify(formattedMessages[formattedMessages.length - 1], null, 2));
            } else {
                console.log('⚠️ No messages returned from backend');
            }

            setMessages(formattedMessages);
            console.log('✅ Messages state updated');
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
        }
    };

    const onSend = useCallback(async (newMessages: IMessage[] = []) => {
        const msg = newMessages[0];

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

    // Custom Renderers for Premium Look - Aligned with Single Chat Style
    const renderBubble = useCallback((props: BubbleProps<IMessage>) => (
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
                    color: '#000000',
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
                right: { color: 'rgba(0,0,0,0.6)' },
                left: { color: 'rgba(255,255,255,0.6)' }
            }}
        />
    ), [currentTheme]);

    const renderInputToolbar = useCallback((props: any) => (
        <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={{ alignItems: 'center' }}
            textInputProps={{
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
        <SafeScreen top={false} bottom={false}>
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
                <TouchableOpacity style={styles.menuButton}>
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
        paddingTop: Platform.OS === 'android' ? 40 : 16, // Adjust for status bar
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
