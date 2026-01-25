import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import AppHeader from '../../components/AppHeader';

interface NotificationData {
    likedByUsername?: string;
    bookTitle?: string;
    commentedByUsername?: string;
    commentText?: string;
    followedByUsername?: string;
    achievementName?: string;
    points?: number;
    targetBooks?: number;
}

interface UINotification {
    _id: string;
    type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'ACHIEVEMENT' | 'GOAL_COMPLETED';
    read: boolean;
    createdAt: string;
    data: NotificationData;
}

export default function Notifications() {
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, connect, disconnect } = useNotificationStore();
    const { token, user } = useAuthStore();
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            loadNotifications();
            if (user?._id) connect(user._id);

            // Auto-mark all as read when tab is opened
            markAllAsRead(token!);

            return () => disconnect();
        }, [])
    );

    const loadNotifications = async () => {
        setLoading(true);
        await fetchNotifications(token!);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications(token!);
        setRefreshing(false);
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead(token!);
    };

    const handleNotificationPress = async (notification: UINotification) => {
        if (!notification.read) await markAsRead(notification._id, token!);
    };

    const getNotificationIcon = (type: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
        switch (type) {
            case 'LIKE': return { name: 'heart', color: COLORS.error };
            case 'COMMENT': return { name: 'chatbubble', color: COLORS.accent };
            case 'FOLLOW': return { name: 'person-add', color: COLORS.accentLight };
            case 'ACHIEVEMENT': return { name: 'trophy', color: COLORS.gold };
            case 'GOAL_COMPLETED': return { name: 'checkmark-circle', color: COLORS.success };
            default: return { name: 'notifications', color: COLORS.primary };
        }
    };

    const getNotificationText = (notification: UINotification): string => {
        const { type, data } = notification;
        switch (type) {
            case 'LIKE': return `${data.likedByUsername} liked your book "${data.bookTitle}"`;
            case 'COMMENT': return `${data.commentedByUsername} commented on "${data.bookTitle}": "${data.commentText}"`;
            case 'FOLLOW': return `${data.followedByUsername} started following you`;
            case 'ACHIEVEMENT': return `🎉 Achievement unlocked: ${data.achievementName}! +${data.points} points`;
            case 'GOAL_COMPLETED': return `🎯 Congratulations! You completed your reading goal of ${data.targetBooks} books!`;
            default: return 'New notification';
        }
    };

    const renderNotification = ({ item }: ListRenderItemInfo<UINotification>) => {
        const icon = getNotificationIcon(item.type);
        const text = getNotificationText(item);

        return (
            <TouchableOpacity style={[styles.notificationItem, !item.read && styles.unreadNotification]} onPress={() => handleNotificationPress(item)}>
                <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                </View>
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>{text}</Text>
                    <Text style={styles.notificationDate}>
                        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const insets = useSafeAreaInsets();
    const TAB_BAR_SPACE = 64 + Math.max(insets.bottom, 16) + 20;

    if (loading) {
        return (<SafeScreen><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>);
    }

    return (
        <SafeScreen top={false} bottom={false}>
            <AppHeader showBack />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {unreadCount > 0 && (
                    <View style={styles.unreadBanner}>
                        <Text style={styles.unreadText}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
                    </View>
                )}
                <FlatList
                    data={(notifications as unknown) as UINotification[]}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SPACE }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-outline" size={60} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                            <Text style={styles.emptySubtext}>We'll notify you when something happens</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
    markAllButton: { position: 'absolute', right: 20, top: 24, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.surfaceLight },
    markAllText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
    unreadBanner: { backgroundColor: COLORS.primary + '10', paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.primary + '20' },
    unreadText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
    listContent: { paddingBottom: 120 },
    notificationItem: { flexDirection: 'row', padding: 16, marginHorizontal: 20, marginTop: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceLight, gap: 14, alignItems: 'center' },
    unreadNotification: { borderColor: COLORS.primary + '40', backgroundColor: COLORS.surface + '80' },
    iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    notificationContent: { flex: 1 },
    notificationText: { fontSize: 15, color: COLORS.textPrimary, marginBottom: 4, lineHeight: 20, fontWeight: '500' },
    notificationDate: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
    emptyContainer: { alignItems: 'center', padding: 60, marginTop: 80 },
    emptyText: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 20 },
    emptySubtext: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
});
