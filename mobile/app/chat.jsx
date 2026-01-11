import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, AppState } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Animated, { useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../constants/colors';
import GlassCard from '../components/GlassCard';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import SafeScreen from '../components/SafeScreen';
import { Keyboard } from 'react-native';

import styles from '../assets/styles/chat.styles';

export default function ChatScreen() {
    const { userId, username, profileImage } = useLocalSearchParams();
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef(null);

    const { messages, fetchMessages, sendMessage, markAsRead, addReceivedMessage, setActiveConversation } = useMessageStore();
    const { token, user } = useAuthStore();
    const { socket, userStatuses, typingStatus, sendTypingStart, sendTypingStop, isConnected } = useNotificationStore();
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const show = Keyboard.addListener("keyboardDidShow", (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });

        const hide = Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardHeight(0);
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);


    const conversationMessages = messages[userId] || [];

    // Derive status from store
    const userStatus = userStatuses[userId] || { status: 'offline', lastActive: null };
    const isOnline = userStatus.status === 'online';

    // Calculate display status
    const getDisplayStatus = () => {
        if (isOnline) return 'Online';
        if (!userStatus.lastActive) return 'Offline';

        const lastActive = new Date(userStatus.lastActive);
        const diffValid = !isNaN(lastActive.getTime());

        if (!diffValid) return 'Offline';

        const diffMinutes = (new Date() - lastActive) / 1000 / 60;
        if (diffMinutes < 5) return 'Recently active';

        return 'Offline';
    };

    const displayStatus = getDisplayStatus();
    const pulseOpacity = useSharedValue(0.4);


    const isTyping = typingStatus[userId];

    useEffect(() => {
        if (isOnline) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000 }),
                    withTiming(0.4, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            pulseOpacity.value = 0; // Stop pulsing if offline
        }

        loadMessages();
        markAsRead(userId, token);
        setActiveConversation(userId);

        if (socket) {
            socket.on('new_message', handleNewMessage);
        }

        return () => {
            setActiveConversation(null);
            if (socket) {
                socket.off('new_message', handleNewMessage);
            }
        };
    }, [userId, socket, isOnline]);

    // Refresh messages when socket reconnects
    useEffect(() => {
        if (isConnected) {
            console.log('Socket reconnected, refreshing messages...');
            loadMessages();
        }
    }, [isConnected]);

    // Refresh messages when app comes to foreground
    const appState = useRef(AppState.currentState);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('Chat active, refreshing messages...');
                loadMessages();
                markAsRead(userId, token);
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [userId, token]);

    const handleNewMessage = (message) => {
        const senderId = message.sender._id || message.sender;
        if (senderId === userId) {
            addReceivedMessage(message);
            markAsRead(userId, token);
        }
    };

    const animatedStatusStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    const loadMessages = async () => {
        await fetchMessages(userId, token);
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                await createAndSendMessage(null, base64Img);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSend = async () => {
        if (!messageText.trim() || sending) return;

        // Stop typing immediately when sending
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingStop(userId);

        await createAndSendMessage(messageText.trim(), null);
    };

    const handleTextChange = (text) => {
        setMessageText(text);

        if (!text.trim()) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            sendTypingStop(userId);
            return;
        }

        // If not already scheduled to stop (meaning actively typing), send start
        if (!typingTimeoutRef.current) {
            sendTypingStart(userId);
        }

        // Debounce stop
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingStop(userId);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const createAndSendMessage = async (text, image) => {
        setSending(true);
        if (text) setMessageText('');

        const result = await sendMessage(userId, text, image, token);
        setSending(false);

        if (result.success) {
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        } else {
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const renderMessage = ({ item, index }) => {
        const isMe = (item.sender._id || item.sender) === user.id || item.sender._id === 'me';
        const showAvatar = !isMe && (index === 0 || (messages[userId][index - 1]?.sender._id !== userId));

        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && (
                    <View style={{ width: 32 }}>
                        {showAvatar ? (
                            <Image source={{ uri: profileImage }} style={styles.messageAvatar} />
                        ) : null}
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                    item.image && styles.imageBubble
                ]}>
                    {item.image && (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.sentImage}
                            contentFit="cover"
                        />
                    )}

                    {item.text && (
                        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                            {item.text}
                        </Text>
                    )}

                    <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMe && item.pending && (
                            <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.7)" />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: () => (
                        <View style={styles.headerRow}>
                            <View style={styles.avatarContainer}>
                                <Image source={{ uri: profileImage }} style={styles.headerAvatar} />
                                {isOnline && <Animated.View style={[styles.statusDot, animatedStatusStyle]} />}
                            </View>
                            <View style={styles.headerInfo}>
                                <Text style={styles.headerName}>{username}</Text>
                                {isTyping ? (
                                    <Text style={[styles.headerStatus, { color: COLORS.primary, textTransform: 'none' }]}>Typing...</Text>
                                ) : (
                                    <Text style={styles.headerStatus}>{displayStatus}</Text>
                                )}
                            </View>
                        </View>
                    ),
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.textPrimary,
                    headerShadowVisible: false,
                    headerTitleAlign: 'left',
                    headerStatusBarHeight: insets.top,
                }}
            />

            {/* <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            > */}
            <View style={[styles.container]}>
                <FlatList
                    ref={flatListRef}
                    data={conversationMessages}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
                    inverted
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyText}>Start a literary conversation with {username}</Text>
                        </View>
                    }
                />

                <View
                    style={[
                        styles.inputWrapper,
                        {
                            marginBottom: keyboardHeight ? keyboardHeight + 50 : insets.bottom,
                            paddingBottom: keyboardHeight || insets.bottom > 0 ? 8 : 16
                        },
                    ]}
                >
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
                            style={[
                                styles.sendButton,
                                (!messageText.trim() || sending) && styles.sendButtonDisabled
                            ]}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            {/* </KeyboardAvoidingView> */}
        </View>
    );
}
