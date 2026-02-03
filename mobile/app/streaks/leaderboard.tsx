// mobile/app/streaks/leaderboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import COLORS from '../../constants/colors';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';
import { useStreakStore } from '../../stores/streakStore';
import { LeaderboardEntry } from '../../lib/api/streakApi';
import { Ionicons } from '@expo/vector-icons';

/**
 * LeaderboardScreen
 * Displays ranked list of users by streak count
 */
export default function LeaderboardScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<'global' | 'monthly'>('global');
    const [refreshing, setRefreshing] = useState(false);

    const {
        leaderboard,
        currentUserRank,
        isLoadingLeaderboard,
        fetchLeaderboard,
    } = useStreakStore();

    useEffect(() => {
        loadLeaderboard();
    }, [period]);

    const loadLeaderboard = async () => {
        try {
            await fetchLeaderboard(period);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadLeaderboard();
        setRefreshing(false);
    }, [period]);

    const handlePeriodChange = (newPeriod: 'global' | 'monthly') => {
        setPeriod(newPeriod);
        // Analytics
        console.log('Analytics: leaderboard_period_changed', { period: newPeriod });
    };

    const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isCurrentUser = item.isCurrentUser;
        const isTopThree = item.rank <= 3;

        // Medal icons for top 3
        const getMedalIcon = () => {
            if (item.rank === 1) return '🥇';
            if (item.rank === 2) return '🥈';
            if (item.rank === 3) return '🥉';
            return null;
        };

        return (
            <TouchableOpacity
                style={[
                    styles.leaderboardItem,
                    isCurrentUser && styles.currentUserItem,
                    isTopThree && styles.topThreeItem,
                ]}
                onPress={() => {
                    // Navigate to user profile
                    console.log('Navigate to profile:', item.userId);
                    router.push({ pathname: '/user-profile', params: { userId: item.userId } } as any);
                }}
                accessibilityLabel={`Rank ${item.rank}: ${item.username}, ${item.streakCount} day streak${isCurrentUser ? ', you' : ''}`}
                accessibilityRole="button"
                accessibilityHint={isCurrentUser ? 'Your position in the leaderboard' : `View ${item.username}'s profile`}
            >
                {/* Rank */}
                <View style={styles.rankContainer}>
                    {getMedalIcon() ? (
                        <Text style={styles.medalIcon}>{getMedalIcon()}</Text>
                    ) : (
                        <Text style={[styles.rankText, isCurrentUser && styles.currentUserText]}>
                            {item.rank}
                        </Text>
                    )}
                </View>

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {item.profileImage ? (
                        <Image
                            source={{ uri: item.profileImage }}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={COMPONENT_SIZES.icon.medium} color={COLORS.textMuted} />
                        </View>
                    )}
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                    <View style={styles.usernameRow}>
                        <Text
                            style={[styles.username, isCurrentUser && styles.currentUserText]}
                            numberOfLines={1}
                        >
                            {item.username}
                        </Text>
                        {isCurrentUser && (
                            <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>YOU</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Streak Count */}
                <View style={styles.streakContainer}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={[styles.streakCount, isCurrentUser && styles.currentUserText]}>
                        {item.streakCount}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No Leaderboard Yet</Text>
            <Text style={styles.emptySubtitle}>
                Be the first to start your reading streak!
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Period Tabs */}
            <View style={styles.periodTabs}>
                <TouchableOpacity
                    style={[styles.periodTab, period === 'global' && styles.periodTabActive]}
                    onPress={() => handlePeriodChange('global')}
                    accessibilityLabel="Global leaderboard"
                    accessibilityState={{ selected: period === 'global' }}
                    accessibilityRole="tab"
                >
                    <Text style={[styles.periodTabText, period === 'global' && styles.periodTabTextActive]}>
                        Global
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.periodTab, period === 'monthly' && styles.periodTabActive]}
                    onPress={() => handlePeriodChange('monthly')}
                    accessibilityLabel="Monthly leaderboard"
                    accessibilityState={{ selected: period === 'monthly' }}
                    accessibilityRole="tab"
                >
                    <Text style={[styles.periodTabText, period === 'monthly' && styles.periodTabTextActive]}>
                        This Month
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Current User Rank */}
            {currentUserRank && (
                <GlassCard style={styles.currentRankCard}>
                    <View style={styles.currentRankContent}>
                        <Text style={styles.currentRankLabel}>Your Rank</Text>
                        <View style={styles.currentRankValue}>
                            <Text style={styles.currentRankNumber}>#{currentUserRank}</Text>
                            <Ionicons name="trophy" size={COMPONENT_SIZES.icon.medium} color={COLORS.secondary} />
                        </View>
                    </View>
                </GlassCard>
            )}
        </View>
    );

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                    >
                        <Ionicons name="arrow-back" size={COMPONENT_SIZES.icon.large} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Leaderboard</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Loading State */}
                {isLoadingLeaderboard && leaderboard.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading rankings...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={leaderboard}
                        renderItem={renderLeaderboardItem}
                        keyExtractor={(item) => item.userId}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={renderEmptyState}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={COLORS.primary}
                            />
                        }
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        initialNumToRender={15}
                    />
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: PADDING.screen.horizontal,
        paddingVertical: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
    },
    backButton: {
        padding: SPACING.sm,
        marginLeft: -SPACING.sm,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    headerSpacer: {
        width: COMPONENT_SIZES.icon.large,
    },

    // List
    listContent: {
        paddingHorizontal: PADDING.screen.horizontal,
        paddingBottom: 100,
    },
    headerContainer: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.xl,
    },

    // Period Tabs
    periodTabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xs,
        marginBottom: SPACING.xl,
    },
    periodTab: {
        flex: 1,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.lg,
    },
    periodTabActive: {
        backgroundColor: COLORS.primary,
    },
    periodTabText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    periodTabTextActive: {
        color: COLORS.background,
        fontWeight: '700',
    },

    // Current Rank Card
    currentRankCard: {
        padding: PADDING.card.vertical,
        marginBottom: SPACING.xl,
    },
    currentRankContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentRankLabel: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    currentRankValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    currentRankNumber: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },

    // Leaderboard Item
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    currentUserItem: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(0, 229, 255, 0.05)',
    },
    topThreeItem: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
    },

    rankContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    rankText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    medalIcon: {
        fontSize: FONT_SIZE.xxl,
    },
    currentUserText: {
        color: COLORS.primary,
    },

    avatarContainer: {
        marginRight: SPACING.lg,
    },
    avatar: {
        width: COMPONENT_SIZES.avatar.medium,
        height: COMPONENT_SIZES.avatar.medium,
        borderRadius: COMPONENT_SIZES.avatar.medium / 2,
        backgroundColor: COLORS.surfaceLight,
    },
    avatarPlaceholder: {
        width: COMPONENT_SIZES.avatar.medium,
        height: COMPONENT_SIZES.avatar.medium,
        borderRadius: COMPONENT_SIZES.avatar.medium / 2,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },

    userInfo: {
        flex: 1,
        marginRight: SPACING.lg,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    username: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
    },
    youBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    youBadgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.background,
        letterSpacing: 0.5,
    },

    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    streakEmoji: {
        fontSize: FONT_SIZE.lg,
    },
    streakCount: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        minWidth: 40,
        textAlign: 'right',
    },

    separator: {
        height: SPACING.md,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        marginTop: SPACING.xl,
        fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
        paddingVertical: 100,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 80,
        marginBottom: SPACING.xxl,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    emptySubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        textAlign: 'center',
        fontWeight: '500',
    },
});
