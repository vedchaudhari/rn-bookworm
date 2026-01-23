// mobile/components/PrivacyBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../constants/styleConstants';
import type { Visibility } from '../lib/api/bookNoteApi';

interface PrivacyBadgeProps {
    visibility: Visibility | 'private' | 'public';
    size?: 'small' | 'medium';
    showLabel?: boolean;
}

/**
 * PrivacyBadge
 * Displays privacy/visibility status with icon and optional label
 */
export default function PrivacyBadge({
    visibility,
    size = 'medium',
    showLabel = true,
}: PrivacyBadgeProps) {
    const getVisibilityConfig = () => {
        switch (visibility) {
            case 'public':
                return {
                    icon: 'globe' as keyof typeof Ionicons.glyphMap,
                    label: 'Public',
                    color: COLORS.success,
                    backgroundColor: 'rgba(0, 200, 100, 0.1)',
                };
            case 'followers':
                return {
                    icon: 'people' as keyof typeof Ionicons.glyphMap,
                    label: 'Followers',
                    color: COLORS.primary,
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                };
            case 'private':
            default:
                return {
                    icon: 'lock-closed' as keyof typeof Ionicons.glyphMap,
                    label: 'Private',
                    color: COLORS.textMuted,
                    backgroundColor: COLORS.surface,
                };
        }
    };

    const config = getVisibilityConfig();
    const iconSize = size === 'small' ? COMPONENT_SIZES.icon.tiny : COMPONENT_SIZES.icon.small;
    const fontSize = size === 'small' ? FONT_SIZE.xs : FONT_SIZE.sm;

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: config.backgroundColor },
                size === 'small' && styles.badgeSmall,
            ]}
            accessibilityLabel={`Visibility: ${config.label}`}
            accessibilityRole="text"
        >
            <Ionicons name={config.icon} size={iconSize} color={config.color} />
            {showLabel && (
                <Text style={[styles.label, { color: config.color, fontSize }]}>
                    {config.label}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.circular,
        gap: SPACING.xs,
        alignSelf: 'flex-start',
    },
    badgeSmall: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs / 2,
    },
    label: {
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
