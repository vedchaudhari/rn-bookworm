// mobile/app/reading-stats/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import Loader from '../../components/Loader';
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
import { useReadingSessionStore } from '../../store/readingSessionStore';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - PADDING.screen.horizontal * 2 - PADDING.card.vertical * 2;

/**
 * ReadingStatsScreen
 * Analytics dashboard for reading sessions with charts and calendar
 */
export default function ReadingStatsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [activeView, setActiveView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const {
        overallStats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        calendarData,
        isLoading,
        isLoadingStats,
        fetchOverallStats,
        fetchDailyStats,
        fetchWeeklyStats,
        fetchMonthlyStats,
        fetchCalendar,
    } = useReadingSessionStore();

    useEffect(() => {
        loadStats();
    }, [activeView]);

    useEffect(() => {
        // Load current month calendar
        const now = new Date();
        fetchCalendar(now.getFullYear(), now.getMonth() + 1);
    }, []);

    const loadStats = async () => {
        fetchOverallStats();

        switch (activeView) {
            case 'daily':
                fetchDailyStats(30);
                break;
            case 'weekly':
                fetchWeeklyStats(12);
                break;
            case 'monthly':
                fetchMonthlyStats(12);
                break;
        }
    };

    const renderBarChart = () => {
        let data: any[] = [];
        let maxValue = 0;

        switch (activeView) {
            case 'daily':
                data = dailyStats.slice(0, 14).reverse(); // Last 14 days
                maxValue = Math.max(...data.map(d => d.totalMinutes), 1);
                break;
            case 'weekly':
                data = weeklyStats.slice(0, 8).reverse(); // Last 8 weeks
                maxValue = Math.max(...data.map(d => d.totalMinutes), 1);
                break;
            case 'monthly':
                data = monthlyStats.slice(0, 6).reverse(); // Last 6 months
                maxValue = Math.max(...data.map(d => d.totalMinutes), 1);
                break;
        }

        if (data.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Ionicons name="bar-chart-outline" size={60} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No reading data yet</Text>
                </View>
            );
        }

        const barWidth = CHART_WIDTH / data.length - 8;

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chart}>
                    {data.map((item, index) => {
                        const height = (item.totalMinutes / maxValue) * 150;
                        const label =
                            activeView === 'daily'
                                ? new Date(item._id).getDate().toString()
                                : activeView === 'weekly'
                                    ? `W${item._id.week}`
                                    : `${item._id.month}/${item._id.year.toString().slice(2)}`;

                        return (
                            <View key={index} style={styles.barContainer}>
                                <View style={styles.barWrapper}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: Math.max(height, 10),
                                                width: barWidth,
                                            },
                                        ]}
                                        accessible={true}
                                        accessibilityLabel={`${label}: ${item.totalMinutes} minutes`}
                                    />
                                </View>
                                <Text style={styles.barLabel}>{label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderCalendar = () => {
        if (!calendarData) return null;

        const daysInMonth = new Date(calendarData.year, calendarData.month, 0).getDate();
        const firstDay = new Date(calendarData.year, calendarData.month - 1, 1).getDay();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        return (
            <View style={styles.calendarContainer}>
                {/* Week day headers */}
                <View style={styles.weekDaysRow}>
                    {weekDays.map((day, index) => (
                        <Text key={index} style={styles.weekDay}>
                            {day}
                        </Text>
                    ))}
                </View>

                {/* Calendar days */}
                <View style={styles.daysGrid}>
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDay }).map((_, index) => (
                        <View key={`empty-${index}`} style={styles.dayCell} />
                    ))}

                    {/* Day cells */}
                    {days.map((day) => {
                        const dateStr = `${calendarData.year}-${calendarData.month
                            .toString()
                            .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const hasActivity = calendarData.streakDays.includes(dateStr);

                        return (
                            <View
                                key={day}
                                style={[
                                    styles.dayCell,
                                    hasActivity && styles.dayCellActive,
                                ]}
                                accessible={true}
                                accessibilityLabel={`${day}${hasActivity ? ', reading activity' : ''}`}
                            >
                                <Text style={[styles.dayText, hasActivity && styles.dayTextActive]}>
                                    {day}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    if (isLoading && !overallStats) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <Loader />
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={COMPONENT_SIZES.icon.large} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reading Stats</Text>
                    <View style={{ width: COMPONENT_SIZES.icon.large }} />
                </View>

                {/* Overall Stats */}
                {overallStats && (
                    <GlassCard style={styles.card}>
                        <Text style={styles.cardTitle}>Overall Summary</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Ionicons name="time" size={COMPONENT_SIZES.icon.large} color={COLORS.primary} />
                                <Text style={styles.statValue}>
                                    {Math.floor(overallStats.totalMinutes / 60)}h {overallStats.totalMinutes % 60}m
                                </Text>
                                <Text style={styles.statLabel}>Total Time</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Ionicons name="book" size={COMPONENT_SIZES.icon.large} color={COLORS.secondary} />
                                <Text style={styles.statValue}>{overallStats.totalPages}</Text>
                                <Text style={styles.statLabel}>Pages Read</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Ionicons name="flame" size={COMPONENT_SIZES.icon.large} color={COLORS.warning} />
                                <Text style={styles.statValue}>{overallStats.streakValidSessions}</Text>
                                <Text style={styles.statLabel}>Streak Days</Text>
                            </View>

                            <View style={styles.statItem}>
                                <Ionicons name="flash" size={COMPONENT_SIZES.icon.large} color={COLORS.success} />
                                <Text style={styles.statValue}>
                                    {overallStats.averageSpeed > 0 ? overallStats.averageSpeed.toFixed(1) : '—'}
                                </Text>
                                <Text style={styles.statLabel}>Avg Speed</Text>
                            </View>
                        </View>
                    </GlassCard>
                )}

                {/* Time Period Selector */}
                <View style={styles.tabsContainer}>
                    {['daily', 'weekly', 'monthly'].map((view) => (
                        <TouchableOpacity
                            key={view}
                            style={[styles.tab, activeView === view && styles.tabActive]}
                            onPress={() => setActiveView(view as any)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeView === view }}
                        >
                            <Text style={[styles.tabText, activeView === view && styles.tabTextActive]}>
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Chart */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Reading Activity</Text>
                    {isLoadingStats ? (
                        <View style={styles.chartLoading}>
                            <Loader />
                        </View>
                    ) : (
                        renderBarChart()
                    )}
                </GlassCard>

                {/* Calendar */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Reading Calendar</Text>
                    {renderCalendar()}
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.surface }]} />
                            <Text style={styles.legendText}>No activity</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                            <Text style={styles.legendText}>Reading day</Text>
                        </View>
                    </View>
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
    content: {
        padding: PADDING.screen.horizontal,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.xl,
        marginBottom: MARGIN.section.medium,
    },
    headerTitle: {
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
    },
    card: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
    },
    cardTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.lg,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.lg,
    },
    statValue: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: 4,
        marginBottom: MARGIN.item.large,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.lg,
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.white,
    },

    // Chart
    chartContainer: {
        marginTop: SPACING.lg,
    },
    chart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 170,
        paddingVertical: SPACING.lg,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
    },
    bar: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.sm,
        minHeight: 10,
    },
    barLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    emptyChart: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        marginTop: SPACING.lg,
    },
    chartLoading: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Calendar
    calendarContainer: {
        marginTop: SPACING.lg,
    },
    weekDaysRow: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    weekDay: {
        flex: 1,
        textAlign: 'center',
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    dayCellActive: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.sm,
    },
    dayText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    dayTextActive: {
        color: COLORS.white,
        fontWeight: '800',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xxl,
        marginTop: SPACING.xl,
        paddingTop: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});
