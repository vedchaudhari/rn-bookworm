// mobile/components/streaks/StreakCounter.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import COLORS from '../../constants/colors';
import { SPACING, FONT_SIZE } from '../../constants/styleConstants';

interface StreakCounterProps {
    count: number;
    size?: 'small' | 'medium' | 'large';
    showFire?: boolean;
    style?: ViewStyle;
    testID?: string;
}

/**
 * StreakCounter
 * Reusable component for displaying streak count with fire emoji
 * Memoized for performance
 */
const StreakCounter = memo<StreakCounterProps>(({
    count,
    size = 'medium',
    showFire = true,
    style,
    testID,
}) => {
    const sizes = {
        small: {
            emoji: FONT_SIZE.lg,
            number: FONT_SIZE.xl,
            gap: SPACING.xs,
        },
        medium: {
            emoji: FONT_SIZE.xxl,
            number: FONT_SIZE.giant,
            gap: SPACING.sm,
        },
        large: {
            emoji: FONT_SIZE.giant,
            number: FONT_SIZE.giant + 20,
            gap: SPACING.md,
        },
    };

    const currentSize = sizes[size];

    return (
        <View
            style={[styles.container, style]}
            testID={testID}
            accessible={true}
            accessibilityLabel={`${count} day streak`}
            accessibilityRole="text"
        >
            {showFire && (
                <Text style={[styles.emoji, { fontSize: currentSize.emoji }]} accessible={false}>
                    🔥
                </Text>
            )}
            <Text style={[styles.count, { fontSize: currentSize.number }]}>
                {count.toLocaleString()}
            </Text>
        </View>
    );
});

StreakCounter.displayName = 'StreakCounter';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        marginRight: SPACING.sm,
    },
    count: {
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
});

export default StreakCounter;
