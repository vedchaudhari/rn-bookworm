// mobile/components/streaks/ChallengeCompletionAnimation.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import COLORS from '../../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
} from '../../constants/styleConstants';

interface ChallengeCompletionAnimationProps {
    visible: boolean;
    inkDropsEarned: number;
    onComplete: () => void;
}

/**
 * ChallengeCompletionAnimation
 * Lightweight celebration animation for completing challenges
 * Uses only react-native-reanimated (already installed)
 */
export default function ChallengeCompletionAnimation({
    visible,
    inkDropsEarned,
    onComplete,
}: ChallengeCompletionAnimationProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);
    const checkScale = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Reset values
            scale.value = 0;
            opacity.value = 0;
            translateY.value = 50;
            checkScale.value = 0;

            // Animate in sequence
            opacity.value = withTiming(1, { duration: 200 });

            scale.value = withSequence(
                withSpring(1.2, {
                    damping: 10,
                    stiffness: 100,
                }),
                withSpring(1, {
                    damping: 8,
                    stiffness: 80,
                })
            );

            translateY.value = withSpring(0, {
                damping: 12,
                stiffness: 90,
            });

            checkScale.value = withDelay(
                300,
                withSpring(1, {
                    damping: 8,
                    stiffness: 100,
                })
            );

            // Auto-dismiss after 2 seconds
            opacity.value = withDelay(
                2000,
                withTiming(0, { duration: 300 }, (finished) => {
                    if (finished) {
                        runOnJS(onComplete)();
                    }
                })
            );
        }
    }, [visible]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onComplete}
        >
            <Animated.View style={[styles.overlay, containerStyle]}>
                <Animated.View style={[styles.card, cardStyle]}>
                    {/* Success Icon */}
                    <Animated.View style={checkStyle}>
                        <View style={styles.checkCircle}>
                            <Text style={styles.checkmark}>✓</Text>
                        </View>
                    </Animated.View>

                    {/* Message */}
                    <Text style={styles.title}>Challenge Complete!</Text>
                    <Text style={styles.subtitle}>
                        +{inkDropsEarned} Ink Drops
                    </Text>

                    {/* Celebration Emoji */}
                    <Text style={styles.emoji}>🎉</Text>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xxl,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.huge,
        alignItems: 'center',
        minWidth: 280,
        borderWidth: 2,
        borderColor: COLORS.success,
    },
    checkCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    checkmark: {
        fontSize: 48,
        fontWeight: '900',
        color: COLORS.background,
    },
    title: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    emoji: {
        fontSize: 40,
    },
});
