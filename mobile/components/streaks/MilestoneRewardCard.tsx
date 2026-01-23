// mobile/components/streaks/MilestoneRewardCard.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../GlassCard';
import InkDropBadge from './InkDropBadge';
import COLORS from '../../constants/colors';
import {
    SPACING,
    PADDING,
    FONT_SIZE,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';

interface MilestoneRewardCardProps {
    day: number;
    badge: string;
    reward: number;
    achieved: boolean;
    achievedDate?: string | null;
    isPro?: boolean;
    style?: ViewStyle;
    testID?: string;
}

/**
 * MilestoneRewardCard
 * Reusable component for displaying milestone rewards
 * Memoized for performance
 */
const MilestoneRewardCard = memo<MilestoneRewardCardProps>(({
    day,
    badge,
    reward,
    achieved,
    achievedDate,
    isPro = false,
    style,
    testID,
}) => {
    return (
        <GlassCard
            style={[
                styles.container,
                achieved ? styles.containerAchieved : {},
                style || {},
            ]}
            testID={testID}
        >
            {/* Achievement Badge */}
            {achieved && (
                <View style={styles.achievedBadge}>
                    <Ionicons
                        name="checkmark-circle"
                        size={COMPONENT_SIZES.icon.medium}
                        color={COLORS.success}
                        accessible={false}
                    />
                </View>
            )}

            {/* Day Counter */}
            <View style={styles.dayContainer}>
                <Text style={styles.dayNumber}>{day}</Text>
                <Text style={styles.dayLabel}>DAYS</Text>
            </View>

            {/* Badge Name */}
            <Text style={styles.badgeText} numberOfLines={2}>
                {badge}
            </Text>

            {/* Reward */}
            <View style={styles.rewardContainer}>
                <InkDropBadge amount={reward} size="small" />
                {isPro && (
                    <View style={styles.proBonus}>
                        <Text style={styles.proBonusText}>PRO +50%</Text>
                    </View>
                )}
            </View>

            {/* Achievement Date */}
            {achieved && achievedDate && (
                <Text style={styles.achievedDate}>
                    {new Date(achievedDate).toLocaleDateString()}
                </Text>
            )}

            {/* Locked Overlay */}
            {!achieved && (
                <View style={styles.lockedOverlay}>
                    <Ionicons
                        name="lock-closed"
                        size={COMPONENT_SIZES.icon.large}
                        color={COLORS.textMuted}
                        style={styles.lockIcon}
                        accessible={false}
                    />
                </View>
            )}
        </GlassCard>
    );
});

MilestoneRewardCard.displayName = 'MilestoneRewardCard';

const styles = StyleSheet.create({
    container: {
        padding: PADDING.card.vertical,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
        position: 'relative',
        overflow: 'visible',
    },
    containerAchieved: {
        borderWidth: 2,
        borderColor: COLORS.success,
        backgroundColor: 'rgba(0, 200, 100, 0.05)',
    },

    achievedBadge: {
        position: 'absolute',
        top: -12,
        right: SPACING.lg,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.circular,
        padding: SPACING.xs,
        zIndex: 10,
    },

    dayContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    dayNumber: {
        fontSize: FONT_SIZE.giant + 10,
        fontWeight: '900',
        color: COLORS.textPrimary,
        lineHeight: FONT_SIZE.giant + 10,
    },
    dayLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginTop: SPACING.xs,
    },

    badgeText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        minHeight: FONT_SIZE.md * 2.5, // Reserve space for 2 lines
    },

    rewardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    proBonus: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    proBonusText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.background,
        letterSpacing: 0.5,
    },

    achievedDate: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.success,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },

    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.xl,
    },
    lockIcon: {
        opacity: 0.4,
    },
});

export default MilestoneRewardCard;
