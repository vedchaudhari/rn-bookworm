// mobile/components/ReadingProgressBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
} from '../constants/styleConstants';

interface ReadingProgressBarProps {
    currentPage: number;
    totalPages: number;
    progress: number; // 0-100
    showLabel?: boolean;
    showGoal?: boolean;
    targetCompletionDate?: string;
    color?: string;
    height?: number;
}

/**
 * ReadingProgressBar
 * Animated progress bar for reading progress with optional goal indicator
 */
export default function ReadingProgressBar({
    currentPage,
    totalPages,
    progress,
    showLabel = true,
    showGoal = false,
    targetCompletionDate,
    color = COLORS.primary,
    height = 12,
}: ReadingProgressBarProps) {
    const isOverdue = targetCompletionDate && new Date(targetCompletionDate) < new Date();
    const goalColor = isOverdue ? COLORS.error : COLORS.secondary;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <View style={styles.container}>
            {/* Progress Bar */}
            <View style={[styles.progressBar, { height }]}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: color,
                        },
                    ]}
                    accessibilityLabel={`Reading progress: ${progress}%`}
                    accessible={true}
                />

                {/* Milestone markers at 25%, 50%, 75% */}
                <View style={[styles.milestone, { left: '25%' }]} />
                <View style={[styles.milestone, { left: '50%' }]} />
                <View style={[styles.milestone, { left: '75%' }]} />
            </View>

            {/* Labels */}
            {showLabel && (
                <View style={styles.labelsContainer}>
                    <View style={styles.labelItem}>
                        <Text style={styles.labelText}>
                            {currentPage} / {totalPages} pages
                        </Text>
                        <Text style={styles.percentText}>{progress}%</Text>
                    </View>

                    {showGoal && targetCompletionDate && (
                        <View style={styles.goalContainer}>
                            <Ionicons
                                name={isOverdue ? 'warning' : 'flag'}
                                size={14}
                                color={goalColor}
                                style={styles.goalIcon}
                            />
                            <Text style={[styles.goalText, { color: goalColor }]}>
                                {isOverdue ? 'Overdue' : 'Goal'}: {formatDate(targetCompletionDate)}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    progressBar: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.sm,
    },
    milestone: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    labelsContainer: {
        marginTop: SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    labelText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    percentText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
        fontWeight: '700',
    },
    goalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalIcon: {
        marginRight: SPACING.xs,
    },
    goalText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
});
