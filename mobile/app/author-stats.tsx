import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import { formatPublishDate } from '../lib/utils';

const { width } = Dimensions.get('window');

interface Stats {
    totalReaders: number;
    currentlyReading: number;
    completed: number;
    avgProgress: number;
    chapterStats: Record<string, number>;
    recentReaders: Array<{
        user: { _id: string; username: string; profileImage: string };
        progress: number;
        lastReadAt: string;
    }>;
}

export default function AuthorStats() {
    const { bookId, bookTitle } = useLocalSearchParams<{ bookId: string; bookTitle: string }>();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const { token } = useAuthStore();
    const { showAlert } = useUIStore();

    useEffect(() => {
        fetchStats();
    }, [bookId]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setStats(data.stats);
        } catch (error: any) {
            showAlert({ title: 'Error', message: 'Failed to load statistics', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeScreen top={true}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    const renderChapterProgress = () => {
        if (!stats) return null;
        const chapterNumbers = Object.keys(stats.chapterStats).map(Number).sort((a, b) => a - b);
        if (chapterNumbers.length === 0) return <Text style={styles.noDataText}>No chapter data yet</Text>;

        const maxReaders = Math.max(...Object.values(stats.chapterStats));

        return (
            <View style={styles.chartContainer}>
                {chapterNumbers.map(ch => (
                    <View key={ch} style={styles.chartBarRow}>
                        <Text style={styles.chartLabel}>CH {ch}</Text>
                        <View style={styles.barBackground}>
                            <View
                                style={[
                                    styles.barFill,
                                    { width: `${(stats.chapterStats[ch] / maxReaders) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.chartValue}>{stats.chapterStats[ch]}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ title: 'Book Insights', headerTintColor: COLORS.textPrimary }} />

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>{bookTitle}</Text>

                <View style={styles.statsGrid}>
                    <GlassCard style={styles.statBox}>
                        <Ionicons name="people-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.statVal}>{stats?.totalReaders}</Text>
                        <Text style={styles.statLabel}>Total Readers</Text>
                    </GlassCard>

                    <GlassCard style={styles.statBox}>
                        <Ionicons name="trending-up-outline" size={24} color={COLORS.secondary} />
                        <Text style={styles.statVal}>{stats?.avgProgress}%</Text>
                        <Text style={styles.statLabel}>Avg Progress</Text>
                    </GlassCard>

                    <GlassCard style={styles.statBox}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
                        <Text style={styles.statVal}>{stats?.completed}</Text>
                        <Text style={styles.statLabel}>Completions</Text>
                    </GlassCard>

                    <GlassCard style={styles.statBox}>
                        <Ionicons name="book-outline" size={24} color={COLORS.ratingGold} />
                        <Text style={styles.statVal}>{stats?.currentlyReading}</Text>
                        <Text style={styles.statLabel}>Active Now</Text>
                    </GlassCard>
                </View>

                <Text style={styles.sectionTitle}>Chapter Retention</Text>
                <GlassCard style={styles.retentionCard}>
                    <Text style={styles.cardSubtitle}>Number of readers who completed each chapter</Text>
                    {renderChapterProgress()}
                </GlassCard>

                <Text style={styles.sectionTitle}>Recent Readers</Text>
                {stats?.recentReaders.length === 0 ? (
                    <Text style={styles.noDataText}>No recent activity</Text>
                ) : (
                    stats?.recentReaders.map((r, idx) => (
                        <GlassCard key={idx} style={styles.readerItem}>
                            <Image source={{ uri: r.user.profileImage }} style={styles.readerAvatar} />
                            <View style={styles.readerInfo}>
                                <Text style={styles.readerName}>{r.user.username}</Text>
                                <Text style={styles.readerDate}>{formatPublishDate(r.lastReadAt)}</Text>
                            </View>
                            <View style={styles.readerProgressWrapper}>
                                <Text style={styles.readerProgress}>{r.progress}%</Text>
                                <View style={styles.miniProgressBack}>
                                    <View style={[styles.miniProgressFill, { width: `${r.progress}%` }]} />
                                </View>
                            </View>
                        </GlassCard>
                    ))
                )}
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statBox: { width: (width - 44) / 2, padding: 16, borderRadius: 20, alignItems: 'center' },
    statVal: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
    statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 12 },
    retentionCard: { padding: 20, borderRadius: 24 },
    cardSubtitle: { fontSize: 13, color: COLORS.textTertiary, marginBottom: 20 },
    chartContainer: { gap: 12 },
    chartBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chartLabel: { width: 40, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    barBackground: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
    chartValue: { width: 30, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
    readerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10, borderRadius: 16 },
    readerAvatar: { width: 40, height: 40, borderRadius: 20 },
    readerInfo: { marginLeft: 12, flex: 1 },
    readerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    readerDate: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
    readerProgressWrapper: { alignItems: 'flex-end', width: 80 },
    readerProgress: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
    miniProgressBack: { width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
    miniProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
    noDataText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginVertical: 20 }
});
