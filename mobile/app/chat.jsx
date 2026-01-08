import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
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

export default function ChatScreen() {
    const { userId, username, profileImage } = useLocalSearchParams();
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);

    const { messages, fetchMessages, sendMessage, markAsRead, addReceivedMessage } = useMessageStore();
    const { token, user } = useAuthStore();
    const { socket } = useNotificationStore();

    const conversationMessages = messages[userId] || [];

    useEffect(() => {
        loadMessages();
        markAsRead(userId, token);

        // Listen for new messages
        if (socket) {
            socket.on('new_message', handleNewMessage);
        }

        return () => {
            if (socket) {
                socket.off('new_message', handleNewMessage);
            }
        };
    }, [userId]);

    const handleNewMessage = (message) => {
        const senderId = message.sender._id || message.sender;
        if (senderId === userId) {
            addReceivedMessage(message);
            markAsRead(userId, token);
        }
    };

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
        await createAndSendMessage(messageText.trim(), null);
    };

    const createAndSendMessage = async (text, image) => {
        setSending(true);
        if (text) setMessageText('');

        const result = await sendMessage(userId, text, image, token);
        setSending(false);

        if (result.success) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } else {
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = (item.sender._id || item.sender) === user.id;

        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && (
                    <Image source={{ uri: profileImage }} style={styles.messageAvatar} />
                )}
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                    item.image && styles.imageBubble
                ]}>
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.sentImage}
                            contentFit="cover"
                        />
                    ) : null}

                    {item.text ? (
                        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                            {item.text}
                        </Text>
                    ) : null}

                    <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    const insets = useSafeAreaInsets();

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: username,
                    headerStyle: { backgroundColor: COLORS.background }, // Use main background
                    headerTintColor: COLORS.textPrimary,
                    headerShadowVisible: false,
                }}
            />
            <View style={[styles.container, { paddingBottom: insets.bottom }]}>
                <KeyboardAvoidingView
                    style={styles.keyboardContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <FlatList
                        ref={flatListRef}
                        data={conversationMessages}
                        renderItem={renderMessage}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Start the conversation!</Text>
                            </View>
                        }
                    />

                    <View style={styles.inputWrapper}>
                        <GlassCard style={styles.inputContainer} variant="light">
                            <TouchableOpacity onPress={handlePickImage} style={styles.iconButton}>
                                <Ionicons name="images-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                placeholder="Message..."
                                placeholderTextColor={COLORS.textMuted}
                                value={messageText}
                                onChangeText={setMessageText}
                                multiline
                                maxLength={1000}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!messageText.trim() || sending}
                                style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="arrow-up" size={20} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    messagesList: {
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    myMessage: {
        justifyContent: 'flex-end',
    },
    theirMessage: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    imageBubble: {
        padding: 4,
        overflow: 'hidden',
    },
    sentImage: {
        width: 200,
        height: 150,
        borderRadius: 16,
        marginBottom: 4,
    },
    myBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: COLORS.surfaceHighlight,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
    },
    myText: {
        color: '#fff',
    },
    theirText: {
        color: COLORS.textPrimary,
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
        alignSelf: 'flex-end',
        opacity: 0.8,
    },
    myTime: {
        color: 'rgba(255,255,255,0.8)',
    },
    theirTime: {
        color: COLORS.textMuted,
    },
    keyboardContainer: {
        flex: 1,
    },
    inputWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        gap: 12,
        alignItems: 'flex-end',
        borderRadius: 25,
        // GlassCard handles bg
    },
    input: {
        flex: 1,
        maxHeight: 100,
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '400',
        paddingVertical: 10,
    },
    iconButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    sendButtonDisabled: {
        opacity: 0.4,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 60,
        marginTop: 60,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'center',
    },
};
