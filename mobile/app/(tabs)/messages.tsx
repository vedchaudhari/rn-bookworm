import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { useMessageStore } from '../../store/messageStore';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';

interface Conversation {
    conversationId: string;
    otherUser: {
        _id: string;
        username: string;
        profileImage: string;
    };
    lastMessage: {
        text: string;
        createdAt: string;
        senderId: string;
    };
    unreadCount: number;
}

export default function Messages() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { conversations, fetchConversations, unreadCount } = useMessageStore();
    const { token, user } = useAuthStore();
    const router = useRouter();

    const isSelfConversation = (item: any) => {
        const otherUserId = typeof item.otherUser === 'string' ? item.otherUser : item.otherUser?._id;
        return user?._id === otherUserId || user?.id === otherUserId;
    };

    const loadConversations = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        await fetchConversations(token);
        setLoading(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadConversations();
        }, [token])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchConversations(token!);
        setRefreshing(false);
    };

    const handleConversationPress = (conversation: any) => {
        const isSelf = isSelfConversation(conversation);
        const otherUser = typeof conversation.otherUser === 'object' ? conversation.otherUser : { _id: conversation.otherUser };

        router.push({
            pathname: '/chat',
            params: {
                userId: otherUser._id,
                username: isSelf ? 'Saved Messages' : otherUser.username,
                profileImage: otherUser.profileImage,
            },
        });
    };

    const formatTime = (date: string): string => {
        const now = new Date();
        const messageDate = new Date(date);
        const diffMs = now.getTime() - messageDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return messageDate.toLocaleDateString();
    };

    const renderConversation = ({ item }: ListRenderItemInfo<any>) => {
        const self = isSelfConversation(item);
        const otherUser = typeof item.otherUser === 'object' ? item.otherUser : { _id: item.otherUser, username: 'Unknown', profileImage: '' };
        const avatarUrl = otherUser.profileImage && otherUser.profileImage !== ''
            ? otherUser.profileImage
            : `https://ui-avatars.com/api/?name=${otherUser.username || 'User'}&background=random&color=fff`;

        return (
            <TouchableOpacity activeOpacity={0.9} style={{ marginBottom: 12 }} onPress={() => handleConversationPress(item)}>
                <GlassCard style={[styles.conversationCard, (item.unreadCount || 0) > 0 ? styles.unreadConversation : {}]}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        {self && (
                            <View style={styles.selfBadge}>
                                <Ionicons name="bookmark" size={10} color={COLORS.white} />
                            </View>
                        )}
                    </View>
                    <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                            <Text style={[styles.username, (item.unreadCount || 0) > 0 ? styles.usernameUnread : {}]}>
                                {self ? 'Saved Messages' : otherUser.username}
                            </Text>
                            <Text style={[styles.time, (item.unreadCount || 0) > 0 ? styles.timeUnread : {}]}>
                                {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
                            </Text>
                        </View>
                        <View style={styles.messagePreview}>
                            {item.lastMessage?.text ? (
                                <Text style={[styles.lastMessage, (item.unreadCount || 0) > 0 ? styles.messageUnread : {}]} numberOfLines={1}>
                                    {item.lastMessage.text}
                                </Text>
                            ) : (
                                <Text style={styles.mediaMessage} numberOfLines={1}>
                                    <Ionicons name="image-outline" size={14} color={COLORS.primary} /> Photo
                                </Text>
                            )}
                            {(item.unreadCount || 0) > 0 && (
                                <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{item.unreadCount}</Text></View>
                            )}
                        </View>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        );
    };

    const insets = useSafeAreaInsets();
    const TAB_BAR_SPACE = 64 + Math.max(insets.bottom, 16) + 20;

    if (loading) {
        return (<SafeScreen><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>);
    }

    return (
        <SafeScreen top={true} bottom={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    {unreadCount > 0 && (<View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{unreadCount}</Text></View>)}
                </View>
                <FlatList
                    data={conversations}
                    renderItem={renderConversation}
                    keyExtractor={(item, index) => `${item.conversationId || item._id || 'conv'}-${index}`}
                    contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SPACE }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 8 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
    headerBadge: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    listContent: { paddingBottom: 120 },
    conversationCard: { flexDirection: 'row', padding: 16, marginHorizontal: 20, gap: 16, alignItems: 'center' },
    unreadConversation: { backgroundColor: COLORS.surfaceHighlight, borderColor: COLORS.primaryLight + '44' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.borderLight },
    selfBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: COLORS.primary, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surfaceHighlight },
    conversationContent: { flex: 1, justifyContent: 'center' },
    conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    username: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    usernameUnread: { fontWeight: '800', color: COLORS.white },
    time: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
    timeUnread: { color: COLORS.primaryLight, fontWeight: '700' },
    messagePreview: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lastMessage: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '400' },
    messageUnread: { color: COLORS.textPrimary, fontWeight: '600' },
    mediaMessage: { flex: 1, fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic' },
    unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
    unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    emptyContainer: { alignItems: 'center', padding: 60, marginTop: 80 },
    emptyText: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 20 },
    emptySubtext: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
});
