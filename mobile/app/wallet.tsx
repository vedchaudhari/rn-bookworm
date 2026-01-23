import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, FlatList } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { useCurrencyStore } from '../store/currencyStore';
import { INK_DROPS_CONFIG } from '../constants/monetization';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';

export default function WalletScreen() {
    const { token } = useAuthStore();
    const { balance, transactions, isLoading, fetchBalance, fetchTransactions, purchaseInkDrops } = useCurrencyStore();
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (token) {
            loadData();
        }
    }, [token]);

    const loadData = async () => {
        if (!token) return;
        setRefreshing(true);
        await Promise.all([
            fetchBalance(token),
            fetchTransactions(token)
        ]);
        setRefreshing(false);
    };

    const handlePurchase = async (productId: string) => {
        if (!token) return;
        const result = await purchaseInkDrops(productId, token);
        if (result.success) {
            Alert.alert('Success', 'Thank you for your purchase! Your balance has been updated.');
        } else {
            Alert.alert('Purchase Failed', result.error || 'Something went wrong');
        }
    };

    const renderTransactionItem = ({ item }: { item: any }) => {
        const isDeduction = item.amount < 0 || item.type === 'tip';
        const date = new Date(item.timestamp || item.createdAt).toLocaleDateString();

        return (
            <View style={styles.transactionItem}>
                <View style={styles.txIconContainer}>
                    <Ionicons
                        name={item.source === 'purchase' ? 'card-outline' : item.source === 'tip_sent' ? 'arrow-up-circle-outline' : 'water-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                    />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txSource}>{item.source.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.txDate}>{date}</Text>
                </View>
                <Text style={[styles.txAmount, { color: isDeduction ? COLORS.error : COLORS.success }]}>
                    {isDeduction ? '' : '+'}{item.amount}
                </Text>
            </View>
        );
    };

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ title: 'Wallet', headerTintColor: COLORS.textPrimary }} />

            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={COLORS.primary} />}
            >
                {/* Balance Card */}
                <GlassCard style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <View style={styles.balanceRow}>
                        <Ionicons name="water" size={32} color={COLORS.gold} />
                        <Text style={styles.balanceValue}>{balance}</Text>
                    </View>
                    <Text style={styles.balanceSubtext}>Ink Drops are used to tip authors and unlock premium content.</Text>
                </GlassCard>

                {/* Purchase Tiers */}
                <Text style={styles.sectionTitle}>Get More Ink Drops</Text>
                <View style={styles.tiersGrid}>
                    {INK_DROPS_CONFIG.PRICING.map((tier) => (
                        <TouchableOpacity
                            key={tier.id}
                            style={styles.tierCard}
                            onPress={() => handlePurchase(tier.id)}
                        >
                            {tier.badge && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{tier.badge}</Text>
                                </View>
                            )}
                            <Ionicons name="water" size={24} color={COLORS.gold} />
                            <Text style={styles.tierAmount}>{tier.drops}</Text>
                            <Text style={styles.tierLabel}>{tier.label}</Text>
                            <View style={styles.priceBtn}>
                                <Text style={styles.priceText}>${tier.price}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Transactions */}
                <Text style={styles.sectionTitle}>Recent activity</Text>
                <GlassCard style={styles.transactionsCard}>
                    {isLoading && !refreshing ? (
                        <ActivityIndicator color={COLORS.primary} style={{ padding: 20 }} />
                    ) : transactions.length > 0 ? (
                        transactions.map((item, index) => (
                            <React.Fragment key={item._id || index}>
                                {renderTransactionItem({ item })}
                                {index < transactions.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No recent activity</Text>
                        </View>
                    )}
                </GlassCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    balanceCard: { padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 24 },
    balanceLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    balanceValue: { color: COLORS.textPrimary, fontSize: 48, fontWeight: '900' },
    balanceSubtext: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, marginTop: 8 },
    tiersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    tierCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    badge: {
        position: 'absolute',
        top: -10,
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    tierAmount: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 8 },
    tierLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 },
    priceBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
    priceText: { color: '#fff', fontWeight: '700' },
    transactionsCard: { padding: 16, borderRadius: 20 },
    transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    txIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    txInfo: { flex: 1, marginLeft: 12 },
    txSource: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
    txDate: { color: COLORS.textMuted, fontSize: 12 },
    txAmount: { fontSize: 16, fontWeight: '800' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
    emptyContainer: { padding: 20, alignItems: 'center' },
    emptyText: { color: COLORS.textMuted },
});
