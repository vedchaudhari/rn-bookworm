import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreen from '../components/SafeScreen';
import COLORS from '../constants/colors';
import { SHADOWS, BORDER_RADIUS, SPACING } from '../constants/styleConstants';
import GlazedButton from '../components/GlazedButton';
import { useUIStore } from '../store/uiStore';

const { width } = Dimensions.get('window');

const BENEFITS = [
    {
        icon: 'infinite-outline',
        title: 'Unlimited Bookshelf',
        desc: 'Store as many books as you want without limits.'
    },
    {
        icon: 'eye-off-outline',
        title: 'Ad-Free Experience',
        desc: 'Enjoy reading and browsing without any interruptions.'
    },
    {
        icon: 'cloud-upload-outline',
        title: 'Premium PDF Hosting',
        desc: 'Keep your original PDF layouts with advanced syncing.'
    },
    {
        icon: 'sparkles-outline',
        title: 'Exclusive Rewards',
        desc: 'Earn 2x Ink Drops and unlock pro-only achievements.'
    }
];

export default function PremiumScreen() {
    const router = useRouter();
    const { showAlert } = useUIStore();

    const handleSubscribe = () => {
        showAlert({
            title: "Pro Subscription",
            message: "Premium features are being rolled out. You'll be notified as soon as billing is available!",
            type: "info"
        });
    };

    return (
        <SafeScreen top={false} bottom={true}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="close" size={28} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.crownContainer}>
                        <Ionicons name="ribbon" size={60} color={COLORS.gold} />
                    </View>
                    <Text style={styles.title}>Bookworm PRO</Text>
                    <Text style={styles.subtitle}>Unlock the ultimate reading experience</Text>
                </View>

                {/* Benefits List */}
                <View style={styles.benefitsContainer}>
                    {BENEFITS.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                            <View style={styles.iconCircle}>
                                <Ionicons name={benefit.icon as any} size={24} color={COLORS.gold} />
                            </View>
                            <View style={styles.benefitText}>
                                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Pricing Card */}
                <View style={styles.pricingCard}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>BEST VALUE</Text>
                    </View>
                    <Text style={styles.priceTitle}>Annual Membership</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.currency}>$</Text>
                        <Text style={styles.amount}>49.99</Text>
                        <Text style={styles.period}>/ year</Text>
                    </View>
                    <Text style={styles.discount}>Save 30% compared to monthly</Text>
                </View>

                <GlazedButton
                    title="Get Pro Now"
                    onPress={handleSubscribe}
                    style={styles.subscribeBtn}
                />

                <TouchableOpacity style={styles.restoreBtn}>
                    <Text style={styles.restoreText}>Restore Purchase</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        ...SHADOWS.medium,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        right: 30,
        zIndex: 10,
    },
    crownContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.gold + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 8,
        fontWeight: '500',
    },
    benefitsContainer: {
        padding: 30,
        gap: 24,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: COLORS.gold + '30',
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    benefitDesc: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 4,
        lineHeight: 20,
    },
    pricingCard: {
        margin: 24,
        padding: 24,
        backgroundColor: COLORS.gold + '10',
        borderRadius: 30,
        borderWidth: 2,
        borderColor: COLORS.gold,
        alignItems: 'center',
    },
    badge: {
        backgroundColor: COLORS.gold,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        position: 'absolute',
        top: -12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.background,
    },
    priceTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.gold,
        marginBottom: 10,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    currency: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 6,
        marginRight: 2,
    },
    amount: {
        fontSize: 48,
        fontWeight: '900',
        color: COLORS.white,
    },
    period: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
    },
    discount: {
        fontSize: 14,
        color: COLORS.success,
        marginTop: 10,
        fontWeight: '600',
    },
    subscribeBtn: {
        marginHorizontal: 30,
    },
    restoreBtn: {
        alignItems: 'center',
        marginTop: 20,
    },
    restoreText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '500',
    }
});
