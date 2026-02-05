// mobile/components/ReadingActivityChart.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import COLORS from '../constants/colors';
import { SPACING, BORDER_RADIUS, FONT_SIZE, TYPOGRAPHY } from '../constants/styleConstants';
import GlassCard from './GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface DataPoint {
    label: string;
    value: number;
}

interface ReadingActivityChartProps {
    dailyData: DataPoint[];
    weeklyData: DataPoint[];
    monthlyData: DataPoint[];
    title?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 24;
const CHART_HEIGHT = 120; // Reduced from 150 to give labels more room

const ReadingActivityChart = ({
    dailyData,
    weeklyData,
    monthlyData,
    title = "Reading Activity"
}: ReadingActivityChartProps) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const getCurrentData = () => {
        switch (activeTab) {
            case 'daily': return dailyData;
            case 'weekly': return weeklyData;
            case 'monthly': return monthlyData;
            default: return dailyData;
        }
    };

    const data = getCurrentData();
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <View style={styles.container}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                {['Daily', 'Weekly', 'Monthly'].map((tab) => {
                    const tabKey = tab.toLowerCase() as 'daily' | 'weekly' | 'monthly';
                    const isActive = activeTab === tabKey;
                    return (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tabKey)}
                            style={styles.tab}
                        >
                            {isActive ? (
                                <LinearGradient
                                    colors={['#19E3D1', '#00C2FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.activeTabGradient}
                                >
                                    <Text style={styles.activeTabText}>{tab}</Text>
                                </LinearGradient>
                            ) : (
                                <Text style={styles.tabText}>{tab}</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Chart Card */}
            <GlassCard style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.unitText}>Minutes</Text>
                </View>

                <View style={styles.chartArea}>
                    {data.length > 0 && maxValue > 0 ? (
                        <View style={styles.barsContainer}>
                            {data.map((item, index) => {
                                const barHeight = (item.value / maxValue) * CHART_HEIGHT;
                                return (
                                    <View key={index} style={styles.barWrapper}>
                                        {item.value > 0 && (
                                            <Text style={styles.valueLabel}>{item.value}</Text>
                                        )}
                                        <View style={styles.barBackground}>
                                            <LinearGradient
                                                colors={[COLORS.primary, COLORS.primaryDark]}
                                                style={[
                                                    styles.bar,
                                                    { height: Math.max(barHeight, 8) }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.barLabel}>{item.label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyChartContainer}>
                            <View style={[styles.barsContainer, { opacity: 0.1 }]}>
                                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                    <View key={i} style={styles.barWrapper}>
                                        <View style={styles.barBackground}>
                                            <View style={[styles.bar, { height: 20 + (i * 10), backgroundColor: COLORS.textMuted }]} />
                                        </View>
                                        <Text style={styles.barLabel}>-</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.emptyOverlay}>
                                <Ionicons name="stats-chart" size={32} color={COLORS.primary} style={styles.emptyIcon} />
                                <Text style={styles.emptyTitle}>Ready to track your first session?</Text>
                                <Text style={styles.emptySubText}>Start reading any book to see your activity here.</Text>
                            </View>
                        </View>
                    )}
                </View>
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: SPACING.lg,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BORDER_RADIUS.xl,
        padding: 6,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTabGradient: {
        width: '100%',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.lg,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    activeTabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '800',
        color: COLORS.white,
    },
    card: {
        padding: CARD_PADDING,
        minHeight: 280,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40, // Increased spacing
    },
    cardTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '800',
        color: COLORS.textPrimary,
        flex: 1,
    },
    unitText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    chartArea: {
        flex: 1,
        justifyContent: 'flex-end', // Align to bottom to leave room for value labels
        paddingTop: 10,
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center', // Center when few bars
        height: CHART_HEIGHT,
        width: '100%',
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1, // Let bars grow/shrink
        minWidth: 28,
        marginHorizontal: 2,
    },
    barBackground: {
        width: 14,
        height: CHART_HEIGHT,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 7,
        justifyContent: 'flex-end',
    },
    bar: {
        width: 14, // Explicit width
        borderRadius: 7,
    },
    valueLabel: {
        fontSize: 9, // Slightly smaller
        color: COLORS.white,
        fontWeight: '800',
        marginBottom: 2, // Tighter
        textAlign: 'center',
    },
    barLabel: {
        marginTop: 16,
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyChartContainer: {
        height: CHART_HEIGHT + 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    emptyOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyIcon: {
        marginBottom: 12,
        opacity: 0.8,
    },
    emptyTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.md,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    emptySubText: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ReadingActivityChart;
