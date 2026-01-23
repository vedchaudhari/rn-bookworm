// mobile/components/streaks/ProgressBar.tsx
import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import COLORS from '../../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
} from '../../constants/styleConstants';

interface ProgressBarProps {
    current: number;
    total: number;
    height?: number;
    showLabel?: boolean;
    labelPosition?: 'top' | 'bottom' | 'inline';
    color?: string;
    backgroundColor?: string;
    style?: ViewStyle;
    animated?: boolean;
    testID?: string;
}

/**
 * ProgressBar
 * Reusable animated progress bar component
 * Memoized for performance
 */
const ProgressBar = memo<ProgressBarProps>(({
    current,
    total,
    height = 12,
    showLabel = true,
    labelPosition = 'inline',
    color = COLORS.primary,
    backgroundColor = COLORS.surface,
    style,
    animated = true,
    testID,
}) => {
    const progress = useSharedValue(0);

    const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

    useEffect(() => {
        if (animated) {
            progress.value = withTiming(percentage, {
                duration: 600,
                easing: Easing.out(Easing.cubic),
            });
        } else {
            progress.value = percentage;
        }
    }, [percentage, animated]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${progress.value}%`,
        };
    });

    const renderLabel = () => {
        if (!showLabel) return null;

        const label = `${current}/${total}`;

        if (labelPosition === 'inline') {
            return (
                <Text style={styles.labelInline} accessible={false}>
                    {label}
                </Text>
            );
        }

        return (
            <Text
                style={[
                    styles.label,
                    labelPosition === 'top' && styles.labelTop,
                    labelPosition === 'bottom' && styles.labelBottom,
                ]}
            >
                {label}
            </Text>
        );
    };

    return (
        <View style={[styles.container, style]} testID={testID}>
            {labelPosition === 'top' && renderLabel()}

            <View
                style={[styles.bar, { height, backgroundColor, borderRadius: height / 2 }]}
                accessible={true}
                accessibilityLabel={`Progress: ${current} of ${total}, ${Math.round(percentage)}%`}
                accessibilityRole="progressbar"
                accessibilityValue={{
                    min: 0,
                    max: total,
                    now: current,
                }}
            >
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            backgroundColor: color,
                            borderRadius: height / 2,
                        },
                        animatedStyle,
                    ]}
                    accessible={false}
                />
            </View>

            {labelPosition === 'bottom' && renderLabel()}
            {labelPosition === 'inline' && renderLabel()}
        </View>
    );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    bar: {
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        height: '100%',
    },
    label: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    labelTop: {
        marginBottom: SPACING.xs,
    },
    labelBottom: {
        marginTop: SPACING.xs,
        textAlign: 'right',
    },
    labelInline: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginTop: SPACING.sm,
    },
});

export default ProgressBar;
