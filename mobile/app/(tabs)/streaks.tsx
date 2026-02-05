// mobile/app/(tabs)/streaks.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import SafeScreen from '../../components/SafeScreen';
import GlazedButton from '../../components/GlazedButton';
import GlassCard from '../../components/GlassCard';
import Loader from '../../components/Loader';
import AppHeader from '../../components/AppHeader';
import COLORS from '../../constants/colors';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';
import { useStreakStore } from '../../stores/streakStore';
import { useReadingSessionStore } from '../../store/readingSessionStore';
import { useUIStore } from '../../store/uiStore';
import { analytics } from '../../lib/analytics';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ReadingActivityCard from '../../components/ReadingActivityCard';
import ReadingActivityChart from '../../components/ReadingActivityChart';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * StreakDashboardScreen
 * Main screen for viewing and managing user's reading streak
 */
export default function StreakDashboardScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [showMilestones, setShowMilestones] = useState(false);

    const {
        streak,
        todayChallenge,
        isLoadingStreak,
        isLoadingChallenge,
        isCheckingIn,
        fetchStreak,
        fetchTodayChallenge,
        checkIn,
        restoreStreak,
    } = useStreakStore();

    const {
        overallStats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        sessions,
        isLoading: isLoadingSessions,
        fetchOverallStats,
        fetchSessions,
        fetchDailyStats,
        fetchWeeklyStats,
        fetchMonthlyStats,
    } = useReadingSessionStore();
    const { showAlert } = useUIStore();

    // Load data on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            await Promise.all([
                fetchStreak(),
                fetchTodayChallenge(),
                fetchOverallStats(),
                fetchSessions({ limit: 5 }),
                fetchDailyStats(30),
                fetchWeeklyStats(12),
                fetchMonthlyStats(12),
            ]);
        } catch (error) {
            console.error('Failed to load activity data:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    const handleCheckIn = async () => {
        try {
            // Haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const result = await checkIn();

            // Success feedback
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Show celebration if milestone achieved
            if (result.milestoneAchieved) {
                showAlert({
                    title: '🎉 Milestone Achieved!',
                    message: `${result.milestoneAchieved}\n+${result.inkDropsEarned} Ink Drops`,
                    confirmText: 'Awesome!',
                    onConfirm: () => setShowMilestones(true)
                });

                // Announce to screen readers
                AccessibilityInfo.announceForAccessibility(
                    `Milestone achieved: ${result.milestoneAchieved}. Earned ${result.inkDropsEarned} Ink Drops.`
                );
            } else if (result.inkDropsEarned > 0) {
                showAlert({
                    title: '✅ Check-in Complete!',
                    message: `+${result.inkDropsEarned} Ink Drops earned`,
                    type: 'success'
                });
            }

            // Analytics
            // Track analytics event
            analytics.trackEvent('streak_check_in', {
                streakCount: streak?.currentStreak || 0,
                inkDropsEarned: result.inkDropsEarned,
            });

            // Refresh stats to show new check-in
            fetchDailyStats(30);
            fetchOverallStats();
        } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            if (error.message.includes('already checked in')) {
                showAlert({ title: 'Already Checked In', message: 'You\'ve already checked in today! Come back tomorrow.', type: 'info' });
            } else {
                showAlert({ title: 'Error', message: error.message || 'Failed to check in. Please try again.', type: 'error' });
            }
        }
    };

    const handleRestoreStreak = () => {
        showAlert({
            title: 'Restore Streak?',
            message: `This will cost 200 Ink Drops to restore your ${streak?.longestStreak || 0}-day streak.`,
            showCancel: true,
            confirmText: 'Restore',
            type: 'warning',
            onConfirm: async () => {
                try {
                    await restoreStreak();
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showAlert({ title: 'Streak Restored!', message: 'Your streak is back on track.', type: 'success' });

                    // Analytics
                    console.log('Analytics: streak_restored', {
                        restoredStreakLength: streak?.longestStreak || 0,
                    });
                } catch (error: any) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

                    if (error.message.includes('INSUFFICIENT_INK_DROPS')) {
                        showAlert({ title: 'Not Enough Ink Drops', message: 'You need 200 Ink Drops to restore your streak.', type: 'error' });
                    } else {
                        showAlert({ title: 'Error', message: error.message || 'Failed to restore streak.', type: 'error' });
                    }
                }
            },
        });
    };

    const hasCheckedInToday = () => {
        if (!streak) return false;
        const lastCheckIn = new Date(streak.lastCheckIn);
        const today = new Date();
        return (
            lastCheckIn.getUTCFullYear() === today.getUTCFullYear() &&
            lastCheckIn.getUTCMonth() === today.getUTCMonth() &&
            lastCheckIn.getUTCDate() === today.getUTCDate()
        );
    };

    if (isLoadingStreak && !streak) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <Loader />
                </View>
            </SafeScreen>
        );
    }

    const checkedInToday = hasCheckedInToday();

    // Format data for chart
    const chartDailyData = (dailyStats || []).slice(0, 7).reverse().map((d: any) => {
        // Handle both string and object IDs
        const date = typeof d._id === 'string' ? new Date(d._id) : new Date(d._id.year, d._id.month - 1, d._id.day);
        return {
            label: date.getDate().toString(),
            value: d.totalMinutes
        };
    });

    const chartWeeklyData = (weeklyStats || []).slice(0, 5).reverse().map((d: any) => ({
        label: `W${d._id.week}`,
        value: d.totalMinutes
    }));

    const chartMonthlyData = (monthlyStats || []).slice(0, 6).reverse().map((d: any) => ({
        label: `${d._id.month}/${d._id.year.toString().slice(2)}`,
        value: d.totalMinutes
    }));

    return (
        <SafeScreen top={false}>
            <AppHeader
                showBack
                title="Activity"
                rightElement={
                    <TouchableOpacity
                        onPress={() => router.push('/streaks/leaderboard' as any)}
                        style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Ionicons name="trophy" size={24} color={COLORS.secondary} />
                    </TouchableOpacity>
                }
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* Zero State Welcome Card */}
                {(!overallStats || overallStats.totalSessions === 0) && (
                    <Animated.View entering={FadeInDown.duration(600)}>
                        <LinearGradient
                            colors={['rgba(25, 227, 209, 0.15)', 'rgba(0, 194, 255, 0.05)']}
                            style={styles.welcomeCard}
                        >
                            <View style={styles.welcomeContent}>
                                <View style={styles.welcomeIconContainer}>
                                    <Ionicons name="sparkles" size={32} color={COLORS.primary} />
                                </View>
                                <View style={styles.welcomeTextColumn}>
                                    <Text style={styles.welcomeTitle}>Begin Your Journey</Text>
                                    <Text style={styles.welcomeSub}>Track your reading goals, earn ink drops, and build a consistent habit with the Activity Hub.</Text>
                                </View>
                            </View>
                            <GlazedButton
                                title="Start Reading Now"
                                onPress={() => router.push('/(tabs)')}
                                style={styles.welcomeButton}
                                leftIcon={<Ionicons name="play" size={18} color={COLORS.white} />}
                            />
                        </LinearGradient>
                    </Animated.View>
                )}
                {/* Header Section Removed - Handled by AppHeader */}

                {/* Current Streak Card */}
                <GlassCard style={styles.streakCard}>
                    <View style={styles.streakHeader}>
                        <Text style={styles.streakEmoji}>🔥</Text>
                        <View style={styles.streakInfo}>
                            <Text style={styles.streakCount} accessibilityLabel={`Current streak: ${streak?.currentStreak || 0} days`}>
                                {streak?.currentStreak || 0}
                            </Text>
                            <Text style={styles.streakLabel}>Day Streak</Text>
                        </View>
                    </View>

                    <View style={styles.streakStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{streak?.longestStreak || 0}</Text>
                            <Text style={styles.statLabel}>Longest</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{streak?.totalCheckIns || 0}</Text>
                            <Text style={styles.statLabel}>Total Check-ins</Text>
                        </View>
                    </View>

                    {/* Check-in Button */}
                    {!checkedInToday ? (
                        <GlazedButton
                            title={isCheckingIn ? 'Checking in...' : 'Check In Today'}
                            onPress={handleCheckIn}
                            disabled={isCheckingIn}
                            style={styles.checkInButton}
                            accessibilityLabel="Check in for today"
                            accessibilityHint="Tap to mark today's reading activity and continue your streak"
                        />
                    ) : (
                        <View style={styles.checkedInBadge}>
                            <Ionicons name="checkmark-circle" size={COMPONENT_SIZES.icon.medium} color={COLORS.success} />
                            <Text style={styles.checkedInText}>Checked in today!</Text>
                        </View>
                    )}

                    {/* Restore Streak Option */}
                    {streak?.canRestore && !checkedInToday && (
                        <TouchableOpacity
                            onPress={handleRestoreStreak}
                            style={styles.restoreButton}
                            accessibilityLabel="Restore broken streak"
                            accessibilityHint="Tap to restore your streak for 200 Ink Drops"
                        >
                            <Ionicons name="refresh-circle-outline" size={COMPONENT_SIZES.icon.small} color={COLORS.primary} />
                            <Text style={styles.restoreText}>Restore Streak (200 Ink Drops)</Text>
                        </TouchableOpacity>
                    )}
                </GlassCard>

                {/* Overall Stats Section */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    {isLoadingSessions && !overallStats ? (
                        <View style={styles.statsLoading}>
                            <Loader />
                        </View>
                    ) : (
                        <View style={styles.statsRow}>
                            <GlassCard style={styles.miniStatCard}>
                                <Ionicons name="time" size={20} color={COLORS.primary} />
                                <Text style={styles.miniStatValue}>
                                    {overallStats ? Math.floor(overallStats.totalMinutes / 60) : 0}h
                                </Text>
                                <Text style={styles.miniStatLabel}>Total Time</Text>
                            </GlassCard>
                            <GlassCard style={styles.miniStatCard}>
                                <Ionicons name="book" size={20} color={COLORS.secondary} />
                                <Text style={styles.miniStatValue}>{overallStats?.totalPages || 0}</Text>
                                <Text style={styles.miniStatLabel}>Pages</Text>
                            </GlassCard>
                            <GlassCard style={styles.miniStatCard}>
                                <Ionicons name="speedometer" size={20} color={COLORS.success} />
                                <Text style={styles.miniStatValue}>
                                    {overallStats?.averageSpeed ? overallStats.averageSpeed.toFixed(1) : 0}
                                </Text>
                                <Text style={styles.miniStatLabel}>Avg Speed</Text>
                            </GlassCard>
                        </View>
                    )}
                </Animated.View>

                {/* Reading Activity Chart Section */}
                <Animated.View entering={FadeInDown.delay(150).duration(600)}>
                    <ReadingActivityChart
                        dailyData={chartDailyData.length > 0 ? chartDailyData : [{ label: 'Today', value: 0 }]}
                        weeklyData={chartWeeklyData.length > 0 ? chartWeeklyData : [{ label: 'Week', value: 0 }]}
                        monthlyData={chartMonthlyData.length > 0 ? chartMonthlyData : [{ label: 'Month', value: 0 }]}
                    />
                </Animated.View>

                {/* Today's Challenge Card */}
                {todayChallenge && (
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <GlassCard style={styles.challengeCard}>
                            <View style={styles.challengeHeader}>
                                <Text style={styles.challengeTitle}>📚 Today's Goal</Text>
                                <View style={styles.rewardBadge}>
                                    <Ionicons name="water" size={COMPONENT_SIZES.icon.small} color={COLORS.primary} />
                                    <Text style={styles.rewardText}>{todayChallenge.rewardInkDrops}</Text>
                                </View>
                            </View>

                            <Text style={styles.challengeDescription}>{todayChallenge.description}</Text>

                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(
                                                    (todayChallenge.currentProgress / todayChallenge.targetCount) * 100,
                                                    100
                                                )}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {todayChallenge.currentProgress}/{todayChallenge.targetCount}
                                </Text>
                            </View>

                            {todayChallenge.completed && (
                                <View style={styles.completedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text style={styles.completedText}>Goal Reached!</Text>
                                </View>
                            )}
                        </GlassCard>
                    </Animated.View>
                )}

                {/* Recent Activity Section */}
                <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                    <View style={styles.activityHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push(`/reading-stats/history` as any)}>
                            <Text style={styles.seeAllText}>See History</Text>
                        </TouchableOpacity>
                    </View>

                    {sessions.length > 0 ? (
                        sessions.map((session, index) => (
                            <Animated.View key={session._id} entering={FadeInRight.delay(400 + index * 100).duration(500)}>
                                <ReadingActivityCard
                                    session={session}
                                    onPress={() => router.push({ pathname: '/reading-stats/[id]', params: { id: session._id } })}
                                />
                            </Animated.View>
                        ))
                    ) : (
                        <GlassCard style={styles.emptyActivityCard}>
                            <Ionicons name="book-outline" size={32} color={COLORS.textMuted} />
                            <Text style={styles.emptyActivityText}>No recent reading sessions</Text>
                        </GlassCard>
                    )}
                </Animated.View>

                {/* Milestones Preview */}
                <GlassCard style={styles.milestonesCard}>
                    <Text style={styles.milestonesTitle}>🏆 Milestones</Text>
                    <View style={styles.milestonesGrid}>
                        {Object.entries(streak?.milestones || {}).map(([key, milestone]) => {
                            const dayNumber = parseInt(key.replace('day', ''));
                            return (
                                <View
                                    key={key}
                                    style={[styles.milestoneItem, milestone.achieved && styles.milestoneAchieved]}
                                    accessible={true}
                                    accessibilityLabel={`${dayNumber} day milestone${milestone.achieved ? ', achieved' : ', locked'}`}
                                >
                                    <Text style={styles.milestoneDay}>{dayNumber}</Text>
                                    <Text style={styles.milestoneDayLabel}>days</Text>
                                    {milestone.achieved && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={COMPONENT_SIZES.icon.small}
                                            color={COLORS.success}
                                            style={styles.milestoneCheck}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/rewards')}
                        style={styles.viewAllButton}
                        accessibilityLabel="View all milestones"
                    >
                        <Text style={styles.viewAllText}>View All Rewards</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        padding: PADDING.screen.horizontal,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsLoading: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: MARGIN.section.medium,
        marginTop: SPACING.xxl,
    },
    headerTitle: {
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
    },
    sectionTitle: {
        ...TYPOGRAPHY.h3,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        marginTop: SPACING.lg,
    },
    // Stats Grid
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    miniStatCard: {
        flex: 1,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniStatValue: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    miniStatLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    // Streak Card
    streakCard: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
    },
    streakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    streakEmoji: {
        fontSize: FONT_SIZE.giant + 20,
        marginRight: SPACING.xl,
    },
    streakInfo: {
        flex: 1,
    },
    streakCount: {
        fontSize: FONT_SIZE.giant + 10,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    streakLabel: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    streakStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.xxl,
        paddingVertical: SPACING.xl,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.glassBorder,
        height: '60%',
        alignSelf: 'center',
    },
    checkInButton: {
        marginTop: SPACING.lg,
    },
    checkedInBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        backgroundColor: 'rgba(0, 200, 100, 0.1)',
        borderRadius: BORDER_RADIUS.xl,
        marginTop: SPACING.lg,
    },
    checkedInText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.success,
        marginLeft: SPACING.md,
    },
    restoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingVertical: SPACING.lg,
    },
    restoreText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: SPACING.md,
    },

    // Challenge Card
    challengeCard: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
    },
    challengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    challengeTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.circular,
    },
    rewardText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.primary,
        marginLeft: SPACING.xs,
    },
    challengeDescription: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
        fontWeight: '500',
    },
    progressContainer: {
        marginBottom: SPACING.lg,
    },
    progressBar: {
        height: 12,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
        marginBottom: SPACING.md,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.sm,
    },
    progressText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    expiresText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: 'rgba(0, 200, 100, 0.1)',
        borderRadius: BORDER_RADIUS.xl,
    },
    completedText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.success,
        marginLeft: SPACING.md,
    },

    // Milestones Card
    milestonesCard: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
    },
    milestonesTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
    },
    milestonesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    milestoneItem: {
        width: '48%',
        aspectRatio: 1.5,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 2,
        borderColor: COLORS.glassBorder,
        position: 'relative',
    },
    milestoneAchieved: {
        borderColor: COLORS.success,
        backgroundColor: 'rgba(0, 200, 100, 0.1)',
    },
    milestoneDay: {
        fontSize: FONT_SIZE.huge,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    milestoneDayLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    milestoneCheck: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
    },
    viewAllButton: {
        paddingVertical: SPACING.lg,
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.primary,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    seeAllText: {
        color: COLORS.primary,
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },
    emptyActivityCard: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
    },
    emptyActivityText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        marginTop: 8,
    },
    // Welcome Card
    welcomeCard: {
        padding: 24,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(25, 227, 209, 0.2)',
        marginBottom: MARGIN.item.large,
    },
    welcomeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    welcomeIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    welcomeTextColumn: {
        flex: 1,
    },
    welcomeTitle: {
        ...TYPOGRAPHY.h3,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    welcomeSub: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    welcomeButton: {
        height: 50,
    },
});
