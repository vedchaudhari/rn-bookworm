import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator, StyleSheet, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZE } from '../constants/styleConstants';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShareSheetProps {
    visible: boolean;
    onClose: () => void;
    content: {
        type: 'book' | 'post'; // Extendable
        data: any; // The book or post object
    };
}

interface UserTarget {
    _id: string;
    username: string;
    profileImage: string;
    source: 'recent' | 'following';
    lastMessageTime?: string;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, onClose, content }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { showAlert } = useUIStore();

    // Animation states
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);

    // Data states
    const [searchQuery, setSearchQuery] = useState('');
    const [targets, setTargets] = useState<UserTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({}); // Track sending state per user
    const [sentMap, setSentMap] = useState<Record<string, boolean>>({}); // Track sent state

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
            opacity.value = withTiming(1);
            fetchTargets();
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT);
            opacity.value = withTiming(0);
            // Reset states after animation
            setTimeout(() => {
                setSearchQuery('');
                setSendingMap({});
                setSentMap({});
            }, 300);
        }
    }, [visible]);

    const fetchTargets = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            // Parallel fetch: Recent Conversations + Following
            const [convRes, followRes]: [any, any] = await Promise.all([
                apiClient.get('/api/messages/conversations'),
                apiClient.get(`/api/social/following/${user._id}`)
            ]);

            const recentUsers: UserTarget[] = (convRes.conversations || [])
                .map((c: any) => ({
                    _id: c.otherUser._id,
                    username: c.otherUser.username,
                    profileImage: c.otherUser.profileImage,
                    source: 'recent',
                    lastMessageTime: c.lastMessage?.createdAt
                }));

            const followingUsers: UserTarget[] = (followRes.following || [])
                .map((u: any) => ({
                    _id: u._id,
                    username: u.username,
                    profileImage: u.profileImage,
                    source: 'following'
                }));

            // Merge: Recent first, then Following (deduplicated)
            const seenIds = new Set(recentUsers.map(u => u._id));
            const merged = [...recentUsers];

            followingUsers.forEach(u => {
                if (!seenIds.has(u._id)) {
                    merged.push(u);
                    seenIds.add(u._id);
                }
            });

            // Filter out self just in case
            const filtered = merged.filter(u => u._id !== user._id);
            setTargets(filtered);

        } catch (error) {
            console.error('Error fetching share targets:', error);
            showAlert({ title: "Error", message: "Failed to load contacts", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const filteredTargets = useMemo(() => {
        if (!searchQuery.trim()) return targets;
        return targets.filter(t => t.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [targets, searchQuery]);

    const handleSend = async (targetUser: UserTarget) => {
        if (sendingMap[targetUser._id] || sentMap[targetUser._id]) return;

        setSendingMap(prev => ({ ...prev, [targetUser._id]: true }));

        try {
            // Construct payload based on content type
            const payload: any = {
                text: '', // Optional message text could be added here
            };

            if (content.type === 'book') {
                payload.book = {
                    _id: content.data._id,
                    title: content.data.title,
                    author: content.data.author || 'Unknown',
                    image: content.data.image
                };
            }

            await apiClient.post(`/api/messages/send/${targetUser._id}`, payload);

            setSentMap(prev => ({ ...prev, [targetUser._id]: true }));

            // Optional: Vibrate or show small success feedback? UI updates button to "Sent"

        } catch (error) {
            console.error('Error sharing:', error);
            showAlert({ title: "Error", message: "Failed to send", type: "error" });
        } finally {
            setSendingMap(prev => ({ ...prev, [targetUser._id]: false }));
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value
    }));

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View style={[styles.sheet, animatedStyle, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <Text style={styles.title}>Share to...</Text>
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search people..."
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Content Preview (Mini) */}
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: content.data.image }} style={styles.previewImage} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.previewTitle} numberOfLines={1}>{content.data.title}</Text>
                            <Text style={styles.previewSubtitle} numberOfLines={1}>
                                {content.type === 'book' ? (content.data.author || 'Book') : 'Post'}
                            </Text>
                        </View>
                    </View>

                    {/* List */}
                    {loading ? (
                        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator color={COLORS.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredTargets}
                            keyExtractor={item => item._id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
                            renderItem={({ item }) => (
                                <View style={styles.userItem}>
                                    <View style={styles.userInfo}>
                                        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                                        <View>
                                            <Text style={styles.username}>{item.username}</Text>
                                            <Text style={styles.userSource}>
                                                {item.source === 'recent' ? 'Recent' : 'Following'}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleSend(item)}
                                        disabled={sendingMap[item._id] || sentMap[item._id]}
                                        style={[
                                            styles.sendButton,
                                            sentMap[item._id] && styles.sentButton
                                        ]}
                                    >
                                        {sendingMap[item._id] ? (
                                            <ActivityIndicator size="small" color="#000" />
                                        ) : sentMap[item._id] ? (
                                            <Text style={styles.sentText}>Sent</Text>
                                        ) : (
                                            <Text style={styles.sendText}>Send</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: COLORS.textMuted }}>No users found</Text>
                                </View>
                            }
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: COLORS.surfaceSilk, // Using silk/glass dark theme
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        minHeight: SCREEN_HEIGHT * 0.5,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.godLevel,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: SPACING.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginHorizontal: SPACING.lg,
        padding: 8,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    previewImage: {
        width: 40,
        height: 56,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: '#222',
    },
    previewTitle: {
        color: COLORS.textPrimary,
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 2,
    },
    previewSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: '#333',
    },
    username: {
        color: COLORS.textPrimary,
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 2,
    },
    userSource: {
        color: COLORS.textMuted,
        fontSize: 12,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    sentButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    sendText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 13,
    },
    sentText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
});

export default ShareSheet;
