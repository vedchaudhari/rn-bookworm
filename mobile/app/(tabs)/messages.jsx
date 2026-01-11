import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { useMessageStore } from '../../store/messageStore';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';

export default function Messages() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { conversations, fetchConversations, unreadCount } = useMessageStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            loadConversations();
        }, [])
    );

    const loadConversations = async () => {
        setLoading(true);
        await fetchConversations(token);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchConversations(token);
        setRefreshing(false);
    };

    const handleConversationPress = (conversation) => {
        router.push({
            pathname: '/chat',
            params: {
                userId: conversation.otherUser._id,
                username: conversation.otherUser.username,
                profileImage: conversation.otherUser.profileImage,
            },
        });
    };

    const formatTime = (date) => {
        const now = new Date();
        const messageDate = new Date(date);
        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return messageDate.toLocaleDateString();
    };

    const renderConversation = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={{ marginBottom: 12 }}
            onPress={() => handleConversationPress(item)}
        >
            <GlassCard style={[
                styles.conversationCard,
                item.unreadCount > 0 && styles.unreadConversation
            ]}>
                <Image source={{ uri: item.otherUser.profileImage }} style={styles.avatar} />
                <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                        <Text style={[styles.username, item.unreadCount > 0 && styles.usernameUnread]}>
                            {item.otherUser.username}
                        </Text>
                        <Text style={[styles.time, item.unreadCount > 0 && styles.timeUnread]}>
                            {formatTime(item.lastMessage.createdAt)}
                        </Text>
                    </View>
                    <View style={styles.messagePreview}>
                        {item.lastMessage.text ? (
                            <Text
                                style={[styles.lastMessage, item.unreadCount > 0 && styles.messageUnread]}
                                numberOfLines={1}
                            >
                                {item.lastMessage.text}
                            </Text>
                        ) : (
                            <Text style={styles.mediaMessage} numberOfLines={1}>
                                <Ionicons name="image-outline" size={14} color={COLORS.primary} /> Photo
                            </Text>
                        )}

                        {item.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 64;
    const TAB_BAR_BOTTOM = Math.max(insets.bottom, 16);
    const TAB_BAR_SPACE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20;

    if (loading) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    {unreadCount > 0 && (
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>

                <FlatList
                    data={conversations}
                    renderItem={renderConversation}
                    keyExtractor={(item) => item.conversationId}
                    contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SPACE }]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No messages yet</Text>
                            <Text style={styles.emptySubtext}>Start a conversation by following users!</Text>
                        </View>
                    }
                />
            </View>
        </SafeScreen>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
    },
    listContent: {
        paddingBottom: 120,
    },
    conversationCard: {
        flexDirection: 'row',
        padding: 16,
        marginHorizontal: 20,
        gap: 16,
        alignItems: 'center',
    },
    unreadConversation: {
        backgroundColor: COLORS.surfaceHighlight, // Slightly lighter for active
        borderColor: COLORS.primaryLight + '44',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    conversationContent: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    usernameUnread: {
        fontWeight: '800',
        color: COLORS.white,
    },
    time: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    timeUnread: {
        color: COLORS.primaryLight,
        fontWeight: '700',
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lastMessage: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '400',
    },
    messageUnread: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    mediaMessage: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 60,
        marginTop: 80,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
};
