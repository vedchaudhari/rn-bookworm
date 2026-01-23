import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import { formatPublishDate } from '../lib/utils';

interface Reward {
    amount: number;
    type: string;
    description: string;
    date: string;
}

interface RewardsData {
    total: number;
    rewards: Reward[];
    totals: {
        streak: number;
        challenge: number;
        reading: number;
        purchase: number;
        tip: number;
        admin: number;
    };
}

type FilterType = 'all' | 'today' | 'week' | 'month';

export default function RewardsScreen() {
    const [data, setData] = useState<RewardsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');

    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        try {
            const response = await fetch(`${API_URL}/api/currency/rewards-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            setData(result.data);
        } catch (error: any) {
            console.error('Error fetching rewards:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRewards();
    };

    const getIconForRewardType = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'streak_check_in': return 'flame';
            case 'challenge_completed': return 'trophy';
            case 'reading_session': return 'book';
            case 'purchase': return 'cart';
            case 'tip_received': return 'water';
            case 'admin_grant': return 'gift';
            default: return 'star';
        }
    };

    const getIconColor = (type: string): string => {
        switch (type) {
            case 'streak_check_in': return COLORS.warning;
            case 'challenge_completed': return COLORS.gold;
            case 'reading_session': return COLORS.primary;
            case 'purchase': return COLORS.secondary;
            case 'tip_received': return COLORS.gold;
            case 'admin_grant': return COLORS.success;
            default: return COLORS.textPrimary;
        }
    };

    const filterRewards = (rewards: Reward[]): Reward[] => {
        if (filter === 'all') return rewards;

        const now = new Date();
        const filtered = rewards.filter(reward => {
            const rewardDate = new Date(reward.date);

            if (filter === 'today') {
                return rewardDate.toDateString() === now.toDateString();
            } else if (filter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return rewardDate >= weekAgo;
            } else if (filter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return rewardDate >= monthAgo;
            }
            return true;
        });

        return filtered;
    };

    if (loading) return (
        <SafeScreen top={true}>
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        </SafeScreen>
    );

    const filteredRewards = data ? filterRewards(data.rewards) : [];
    const filteredTotal = filteredRewards.reduce((sum, r) => sum + r.amount, 0);

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ title: 'Rewards Center', headerTintColor: COLORS.textPrimary }} />

            <View style={styles.container}>
                {/* Header with Total */}
                <GlassCard style={styles.headerCard}>
                    <Ionicons name="trophy" size={48} color={COLORS.gold} />
                    <Text style={styles.totalLabel}>Total Ink Drops Earned</Text>
                    <Text style={styles.totalValue}>{filteredTotal}</Text>
                    <Text style={styles.totalSubtext}>
                        {filter === 'all' ? 'All Time' : filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : 'This Month'}
                    </Text>
                </GlassCard>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    {(['all', 'today', 'week', 'month'] as FilterType[]).map(f => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Category Summary */}
                {data && (
                    <View style={styles.categoryGrid}>
                        <View style={styles.categoryCard}>
                            <Ionicons name="flame" size={24} color={COLORS.warning} />
                            <Text style={styles.categoryValue}>{data.totals.streak}</Text>
                            <Text style={styles.categoryLabel}>Streaks</Text>
                        </View>
                        <View style={styles.categoryCard}>
                            <Ionicons name="trophy" size={24} color={COLORS.gold} />
                            <Text style={styles.categoryValue}>{data.totals.challenge}</Text>
                            <Text style={styles.categoryLabel}>Challenges</Text>
                        </View>
                        <View style={styles.categoryCard}>
                            <Ionicons name="book" size={24} color={COLORS.primary} />
                            <Text style={styles.categoryValue}>{data.totals.reading}</Text>
                            <Text style={styles.categoryLabel}>Reading</Text>
                        </View>
                    </View>
                )}

                {/* Rewards List */}
                <Text style={styles.sectionTitle}>Recent Rewards</Text>
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                >
                    {filteredRewards.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="star-outline" size={64} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No rewards yet</Text>
                            <Text style={styles.emptySubtext}>
                                Keep reading and completing challenges to earn Ink Drops!
                            </Text>
                        </View>
                    ) : (
                        filteredRewards.map((reward, index) => (
                            <GlassCard key={index} style={styles.rewardCard}>
                                <View style={[styles.iconContainer, { backgroundColor: getIconColor(reward.type) + '20' }]}>
                                    <Ionicons name={getIconForRewardType(reward.type)} size={24} color={getIconColor(reward.type)} />
                                </View>
                                <View style={styles.rewardInfo}>
                                    <Text style={styles.rewardDescription}>{reward.description}</Text>
                                    <Text style={styles.rewardDate}>{formatPublishDate(reward.date)}</Text>
                                </View>
                                <Text style={styles.rewardAmount}>+{reward.amount}</Text>
                            </GlassCard>
                        ))
                    )}
                </ScrollView>
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerCard: { alignItems: 'center', padding: 24, marginBottom: 20, borderRadius: 20 },
    totalLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, fontWeight: '600' },
    totalValue: { fontSize: 48, fontWeight: '900', color: COLORS.gold, marginTop: 4 },
    totalSubtext: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

    filterContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    filterTab: { flex: 1, paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center' },
    filterTabActive: { backgroundColor: COLORS.primary },
    filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    filterTextActive: { color: COLORS.white },

    categoryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    categoryCard: { flex: 1, backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
    categoryValue: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, marginTop: 8 },
    categoryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: 4 },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
    list: { flex: 1 },
    listContent: { paddingBottom: 40 },

    rewardCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 16 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rewardInfo: { flex: 1 },
    rewardDescription: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    rewardDate: { fontSize: 12, color: COLORS.textMuted },
    rewardAmount: { fontSize: 18, fontWeight: '900', color: COLORS.gold },

    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
