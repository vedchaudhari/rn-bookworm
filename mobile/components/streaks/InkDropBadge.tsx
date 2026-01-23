// mobile/components/streaks/InkDropBadge.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';

interface InkDropBadgeProps {
    amount: number;
    size?: 'small' | 'medium' | 'large';
    variant?: 'default' | 'compact';
    style?: ViewStyle;
    testID?: string;
}

/**
 * InkDropBadge
 * Reusable component for displaying Ink Drops amount
 * Memoized for performance
 */
const InkDropBadge = memo<InkDropBadgeProps>(({
    amount,
    size = 'medium',
    variant = 'default',
    style,
    testID,
}) => {
    const sizes = {
        small: {
            icon: COMPONENT_SIZES.icon.small - 2,
            fontSize: FONT_SIZE.xs,
            padding: SPACING.xs,
            gap: SPACING.xs,
        },
        medium: {
            icon: COMPONENT_SIZES.icon.small,
            fontSize: FONT_SIZE.md,
            padding: SPACING.sm,
            gap: SPACING.sm,
        },
        large: {
            icon: COMPONENT_SIZES.icon.medium,
            fontSize: FONT_SIZE.lg,
            padding: SPACING.md,
            gap: SPACING.md,
        },
    };

    const currentSize = sizes[size];

    if (variant === 'compact') {
        return (
            <View
                style={[styles.containerCompact, style]}
                testID={testID}
                accessible={true}
                accessibilityLabel={`${amount} Ink Drops`}
                accessibilityRole="text"
            >
                <Ionicons
                    name="water"
                    size={currentSize.icon}
                    color={COLORS.primary}
                    accessible={false}
                />
                <Text style={[styles.amount, { fontSize: currentSize.fontSize }]}>
                    {amount.toLocaleString()}
                </Text>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    paddingHorizontal: currentSize.padding,
                    paddingVertical: currentSize.padding * 0.75,
                },
                style,
            ]}
            testID={testID}
            accessible={true}
            accessibilityLabel={`${amount} Ink Drops`}
            accessibilityRole="text"
        >
            <Ionicons
                name="water"
                size={currentSize.icon}
                color={COLORS.primary}
                accessible={false}
            />
            <Text style={[styles.amount, { fontSize: currentSize.fontSize }]}>
                {amount.toLocaleString()}
            </Text>
        </View>
    );
});

InkDropBadge.displayName = 'InkDropBadge';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.2)',
    },
    containerCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    amount: {
        fontWeight: '700',
        color: COLORS.primary,
    },
});

export default InkDropBadge;
