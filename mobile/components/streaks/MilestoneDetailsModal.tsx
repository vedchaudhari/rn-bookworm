// mobile/components/streaks/MilestoneDetailsModal.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import GlassCard from '../GlassCard';
import COLORS from '../../constants/colors';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';
import { Ionicons } from '@expo/vector-icons';

interface MilestoneData {
    day: number;
    reward: number;
    proReward: number;
    badge: string;
    achieved: boolean;
    achievedDate: string | null;
}

interface MilestoneDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    milestones: {
        day7: { achieved: boolean; date: string | null };
        day30: { achieved: boolean; date: string | null };
        day100: { achieved: boolean; date: string | null };
        day365: { achieved: boolean; date: string | null };
    };
    isPro?: boolean;
}

const MILESTONE_DATA: Omit<MilestoneData, 'achieved' | 'achievedDate'>[] = [
    {
        day: 7,
        reward: 50,
        proReward: 75,
        badge: 'One Week Warrior',
    },
    {
        day: 30,
        reward: 200,
        proReward: 300,
        badge: 'Monthly Master',
    },
    {
        day: 100,
        reward: 1000,
        proReward: 1500,
        badge: 'Century Streak',
    },
    {
        day: 365,
        reward: 5000,
        proReward: 7500,
        badge: 'Yearly Legend',
    },
];

/**
 * MilestoneDetailsModal
 * Modal showing all milestone rewards and Pro bonuses
 */
export default function MilestoneDetailsModal({
    visible,
    onClose,
    milestones,
    isPro = false,
}: MilestoneDetailsModalProps) {
    const getMilestoneData = (): MilestoneData[] => {
        return MILESTONE_DATA.map((data) => {
            const key = `day${data.day}` as keyof typeof milestones;
            const milestone = milestones[key];

            return {
                ...data,
                achieved: milestone?.achieved || false,
                achievedDate: milestone?.date || null,
            };
        });
    };

    const milestonesList = getMilestoneData();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
            accessibilityViewIsModal={true}
        >
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
                accessible={false}
            >
                <Pressable
                    style={styles.modalContainer}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>🏆 Milestones</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.closeButton}
                                accessibilityLabel="Close modal"
                                accessibilityRole="button"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={COMPONENT_SIZES.icon.large} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Pro Bonus Explanation */}
                        {!isPro && (
                            <View style={styles.proTipCard}>
                                <View style={styles.proTipHeader}>
                                    <Ionicons name="star" size={COMPONENT_SIZES.icon.medium} color={COLORS.secondary} />
                                    <Text style={styles.proTipText}>
                                        Pro members earn 1.5x Ink Drops on all milestones!
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Milestones List */}
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {milestonesList.map((milestone, index) => (
                                <GlassCard
                                    key={milestone.day}
                                    style={[
                                        styles.milestoneCard,
                                        milestone.achieved ? styles.milestoneCardAchieved : {},
                                    ]}
                                >
                                    {/* Achievement Badge */}
                                    {milestone.achieved && (
                                        <View style={styles.achievedBadge}>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={COMPONENT_SIZES.icon.medium}
                                                color={COLORS.success}
                                            />
                                        </View>
                                    )}

                                    {/* Milestone Header */}
                                    <View style={styles.milestoneHeader}>
                                        <View style={styles.milestoneDay}>
                                            <Text style={styles.milestoneDayNumber}>{milestone.day}</Text>
                                            <Text style={styles.milestoneDayLabel}>DAYS</Text>
                                        </View>
                                        <View style={styles.milestoneBadge}>
                                            <Text style={styles.milestoneBadgeText}>{milestone.badge}</Text>
                                        </View>
                                    </View>

                                    {/* Rewards */}
                                    <View style={styles.rewardsContainer}>
                                        <View style={styles.rewardRow}>
                                            <Ionicons name="water" size={COMPONENT_SIZES.icon.small} color={COLORS.primary} />
                                            <Text style={styles.rewardText}>
                                                {isPro ? milestone.proReward : milestone.reward} Ink Drops
                                            </Text>
                                            {isPro && (
                                                <View style={styles.proBonus}>
                                                    <Text style={styles.proBonusText}>+50%</Text>
                                                </View>
                                            )}
                                        </View>

                                        {!isPro && (
                                            <Text style={styles.proRewardHint}>
                                                ({milestone.proReward} with Pro)
                                            </Text>
                                        )}
                                    </View>

                                    {/* Achievement Date */}
                                    {milestone.achieved && milestone.achievedDate && (
                                        <Text style={styles.achievedDate}>
                                            Achieved on {new Date(milestone.achievedDate).toLocaleDateString()}
                                        </Text>
                                    )}

                                    {/* Locked State */}
                                    {!milestone.achieved && (
                                        <View style={styles.lockedOverlay}>
                                            <Ionicons name="lock-closed" size={COMPONENT_SIZES.icon.medium} color={COLORS.textMuted} />
                                        </View>
                                    )}
                                </GlassCard>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        maxHeight: '85%',
        backgroundColor: COLORS.background,
        borderTopLeftRadius: BORDER_RADIUS.xxxl,
        borderTopRightRadius: BORDER_RADIUS.xxxl,
        ...SHADOWS.strong,
    },
    modalContent: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: PADDING.screen.horizontal,
        paddingTop: SPACING.xxl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    closeButton: {
        padding: SPACING.sm,
    },

    // Pro Tip
    proTipCard: {
        margin: PADDING.screen.horizontal,
        marginTop: SPACING.xl,
        padding: PADDING.card.vertical,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    proTipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    proTipText: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },

    // Scroll View
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: PADDING.screen.horizontal,
        paddingTop: SPACING.xl,
        paddingBottom: 40,
    },

    // Milestone Card
    milestoneCard: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
        position: 'relative',
        overflow: 'visible',
    },
    milestoneCardAchieved: {
        borderColor: COLORS.success,
        borderWidth: 2,
        backgroundColor: 'rgba(0, 200, 100, 0.05)',
    },
    achievedBadge: {
        position: 'absolute',
        top: -12,
        right: SPACING.xl,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.circular,
        padding: SPACING.xs,
        zIndex: 10,
    },

    milestoneHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    milestoneDay: {
        alignItems: 'flex-start',
    },
    milestoneDayNumber: {
        fontSize: FONT_SIZE.giant,
        fontWeight: '900',
        color: COLORS.textPrimary,
        lineHeight: FONT_SIZE.giant,
    },
    milestoneDayLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginTop: SPACING.xs,
    },
    milestoneBadge: {
        flex: 1,
        marginLeft: SPACING.xl,
    },
    milestoneBadgeText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'right',
    },

    // Rewards
    rewardsContainer: {
        marginBottom: SPACING.lg,
    },
    rewardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.xs,
    },
    rewardText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.primary,
    },
    proBonus: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
    },
    proBonusText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.background,
    },
    proRewardHint: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        fontWeight: '500',
        marginLeft: COMPONENT_SIZES.icon.small + SPACING.md,
    },

    achievedDate: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.success,
        fontWeight: '600',
    },

    // Locked State
    lockedOverlay: {
        position: 'absolute',
        top: SPACING.xl,
        right: SPACING.xl,
        opacity: 0.3,
    },
});
