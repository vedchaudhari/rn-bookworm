// mobile/components/SessionTimer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import {
    SPACING,
    PADDING,
    FONT_SIZE,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../constants/styleConstants';

interface SessionTimerProps {
    isActive: boolean;
    onPause?: () => void;
    onResume?: () => void;
    showPauseButton?: boolean;
}

/**
 * SessionTimer
 * Live reading session timer with pause/resume functionality
 */
export default function SessionTimer({
    isActive,
    onPause,
    onResume,
    showPauseButton = true,
}: SessionTimerProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseCount, setPauseCount] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pauseStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (isActive && !isPaused) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, isPaused]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePauseResume = () => {
        if (isPaused) {
            // Resume
            setIsPaused(false);
            if (pauseStartRef.current) {
                const pauseDuration = Date.now() - pauseStartRef.current;
                pauseStartRef.current = null;
            }
            onResume?.();
        } else {
            // Pause
            setIsPaused(true);
            setPauseCount((prev) => prev + 1);
            pauseStartRef.current = Date.now();
            onPause?.();
        }
    };

    if (!isActive) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.timerContent}>
                {/* Timer Icon */}
                <View style={[styles.iconContainer, isPaused && styles.iconContainerPaused]}>
                    <Ionicons
                        name={isPaused ? 'pause' : 'time'}
                        size={COMPONENT_SIZES.icon.medium}
                        color={isPaused ? COLORS.warning : COLORS.primary}
                    />
                </View>

                {/* Time Display */}
                <View style={styles.timeContainer}>
                    <Text
                        style={[styles.timeText, isPaused && styles.timeTextPaused]}
                        accessibilityLabel={`Reading time: ${formatTime(elapsedSeconds)}`}
                        accessibilityLiveRegion="polite"
                    >
                        {formatTime(elapsedSeconds)}
                    </Text>
                    <Text style={styles.labelText}>
                        {isPaused ? 'Paused' : 'Reading...'}
                    </Text>
                </View>

                {/* Pause/Resume Button */}
                {showPauseButton && (
                    <TouchableOpacity
                        style={styles.pauseButton}
                        onPress={handlePauseResume}
                        accessibilityLabel={isPaused ? 'Resume reading' : 'Pause reading'}
                        accessibilityRole="button"
                    >
                        <Ionicons
                            name={isPaused ? 'play' : 'pause'}
                            size={COMPONENT_SIZES.icon.medium}
                            color={COLORS.white}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Pause Stats */}
            {pauseCount > 0 && (
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons
                            name="pause-circle-outline"
                            size={COMPONENT_SIZES.icon.small}
                            color={COLORS.textMuted}
                        />
                        <Text style={styles.statText}>{pauseCount} pauses</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.vertical,
    },
    timerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    iconContainerPaused: {
        backgroundColor: 'rgba(255, 159, 10, 0.1)',
    },
    timeContainer: {
        flex: 1,
    },
    timeText: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 1,
        fontVariant: ['tabular-nums'],
    },
    timeTextPaused: {
        color: COLORS.warning,
    },
    labelText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    pauseButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorder,
        flexDirection: 'row',
        gap: SPACING.xl,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});
