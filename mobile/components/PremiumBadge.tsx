import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

interface PremiumBadgeProps {
    size?: 'small' | 'medium' | 'large';
    variant?: 'badge' | 'banner' | 'chip';
}

/**
 * Premium Badge Component
 * Displays a premium/pro badge on user profiles and posts
 * 
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {string} variant - 'badge' | 'banner' | 'chip'
 */
const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 'medium', variant = 'badge' }) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { height: 18, paddingHorizontal: 6, fontSize: 10, iconSize: 12 };
            case 'large':
                return { height: 32, paddingHorizontal: 12, fontSize: 14, iconSize: 18 };
            default: // medium
                return { height: 24, paddingHorizontal: 8, fontSize: 12, iconSize: 14 };
        }
    };

    const sizeStyles = getSizeStyles();

    if (variant === 'banner') {
        return (
            <LinearGradient
                colors={[COLORS.premiumGradientStart, COLORS.premiumGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.banner, { paddingVertical: sizeStyles.height / 2 }]}
            >
                <Ionicons name="star" size={sizeStyles.iconSize} color={COLORS.white} />
                <Text style={[styles.bannerText, { fontSize: sizeStyles.fontSize }]}>
                    Pro Member
                </Text>
            </LinearGradient>
        );
    }

    if (variant === 'chip') {
        return (
            <View style={[styles.chip, { height: sizeStyles.height, paddingHorizontal: sizeStyles.paddingHorizontal }]}>
                <Ionicons name="star" size={sizeStyles.iconSize} color={COLORS.premium} />
                <Text style={[styles.chipText, { fontSize: sizeStyles.fontSize }]}>PRO</Text>
            </View>
        );
    }

    // Default badge variant
    return (
        <LinearGradient
            colors={[COLORS.premiumGradientStart, COLORS.premiumGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.badge, { height: sizeStyles.height, paddingHorizontal: sizeStyles.paddingHorizontal }]}
        >
            <Ionicons name="star" size={sizeStyles.iconSize} color={COLORS.white} />
            <Text style={[styles.badgeText, { fontSize: sizeStyles.fontSize }]}>PRO</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        gap: 4,
    },
    badgeText: {
        color: COLORS.white,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    bannerText: {
        color: COLORS.white,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.premium,
        gap: 4,
    },
    chipText: {
        color: COLORS.premium,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default PremiumBadge;
