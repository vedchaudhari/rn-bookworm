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

const premiumBenefits = [
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
                        <Ionicons name="ribbon" size={60} color={COLORS.ratingGold} />
                    </View>
                    <Text style={styles.title}>Bookworm PRO</Text>
                    <Text style={styles.subtitle}>Unlock the ultimate reading experience</Text>
                </View>

                {/* Benefits Section */}
                <View style={styles.benefitsContainer}>
                    {premiumBenefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitCard}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={benefit.icon as any} size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.benefitContent}>
                                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                                <Text style={styles.benefitDescription}>{benefit.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Pricing Card */}
                <View style={styles.pricingSection}>
                    <View style={styles.planCard}>
                        <View style={styles.planTag}>
                            <Text style={styles.planTagText}>Best Value</Text>
                        </View>

                        <View style={styles.planHeader}>
                            <Text style={styles.planTitle}>Annual Membership</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.currency}>$</Text>
                                <Text style={styles.price}>24.99</Text>
                                <Text style={styles.period}>/year</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                <Text style={styles.featureText}>Everything in Free</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                <Text style={styles.featureText}>Custom App Themes</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                <Text style={styles.featureText}>Early Alpha Access</Text>
                            </View>
                        </View>

                        <GlazedButton
                            title="Go Premium"
                            onPress={handleSubscribe}
                            style={styles.subscribeBtn}
                        />
                    </View>
                </View>

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
        backgroundColor: COLORS.ratingGold + '15',
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
    benefitCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    benefitContent: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    benefitDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    pricingSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    planCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
    },
    planTag: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
    },
    planTagText: {
        color: COLORS.background,
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    planHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
    },
    price: {
        fontSize: 40,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    currency: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    period: {
        fontSize: 16,
        color: COLORS.textTertiary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 20,
        opacity: 0.5,
    },
    featureList: {
        gap: 12,
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    subscribeBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    subscribeText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    footerGlow: {
        height: 200,
        marginTop: -100,
        zIndex: -1,
    },
    restoreBtn: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 50,
    },
    restoreText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    }
});
