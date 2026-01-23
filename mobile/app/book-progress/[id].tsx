// mobile/app/book-progress/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import GlazedButton from '../../components/GlazedButton';
import ReadingProgressBar from '../../components/ReadingProgressBar';
import SessionTimer from '../../components/SessionTimer';
import COLORS from '../../constants/colors';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../../constants/styleConstants';
import { useBookshelfStore } from '../../store/bookshelfStore';
import { useReadingSessionStore } from '../../store/readingSessionStore';
import { useUIStore } from '../../store/uiStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

/**
 * BookProgressScreen
 * Detailed progress tracking for a specific book with session management
 */
export default function BookProgressScreen() {
    const router = useRouter();
    const { id, autoStart } = useLocalSearchParams<{ id: string; autoStart?: string }>();
    const [currentPageInput, setCurrentPageInput] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { items, updateProgress, updateStatus } = useBookshelfStore();
    const {
        activeSession,
        isStartingSession,
        isEndingSession,
        startSession,
        endSession,
        recordPause,
    } = useReadingSessionStore();
    const { showAlert } = useUIStore();

    const bookshelfItem = items.find((item) => item._id === id);

    useEffect(() => {
        if (bookshelfItem) {
            setCurrentPageInput(bookshelfItem.currentPage.toString());
        }
    }, [bookshelfItem]);

    // Handle auto-start session if requested via navigation params
    useEffect(() => {
        if (autoStart === 'true' && bookshelfItem && !activeSession && !isStartingSession) {
            handleStartSession();
        }
    }, [autoStart, bookshelfItem, !!activeSession]);

    if (!bookshelfItem) {
        return (
            <SafeScreen>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={60} color={COLORS.error} />
                    <Text style={styles.errorText}>Book not found</Text>
                    <GlazedButton title="Go Back" onPress={() => router.back()} />
                </View>
            </SafeScreen>
        );
    }

    const handleUpdateProgress = async () => {
        const newPage = parseInt(currentPageInput);

        if (isNaN(newPage) || newPage < 0 || newPage > bookshelfItem.totalPages) {
            showAlert({ title: 'Invalid Page', message: `Please enter a page between 0 and ${bookshelfItem.totalPages}`, type: 'error' });
            return;
        }

        setIsUpdating(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const success = await updateProgress(id, newPage);

        if (success) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert({ title: 'Progress Updated', message: `You're now on page ${newPage}!`, type: 'success' });
        } else {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        setIsUpdating(false);
    };

    const handleStartSession = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Safely handle bookId (populated object vs string)
        const bookId = typeof bookshelfItem.bookId === 'object' && bookshelfItem.bookId !== null
            ? bookshelfItem.bookId._id
            : bookshelfItem.bookId as string;

        const success = await startSession(
            bookId,
            bookshelfItem._id,
            bookshelfItem.currentPage
        );

        if (success) {
            showAlert({ title: 'Session Started', message: 'Happy reading! 📚', type: 'success' });
            // Auto-update status to currently_reading if not already
            if (bookshelfItem.status !== 'currently_reading') {
                updateStatus(id, 'currently_reading');
            }
        }
    };

    const handleEndSession = async () => {
        if (!activeSession) return;

        const result = await endSession(bookshelfItem.currentPage);

        if (result.success) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const inkDropsMessage = result.inkDropsEarned
                ? `\n\n+${result.inkDropsEarned} Ink Drops earned! 💧`
                : '';

            showAlert({ title: 'Session Complete', message: `Great reading session!${inkDropsMessage}`, type: 'success' });
        }
    };

    const handleMarkCompleted = () => {
        showAlert({
            title: 'Mark as Completed?',
            message: `Congratulations on finishing "${bookshelfItem.bookId.title}"!`,
            showCancel: true,
            confirmText: 'Complete',
            type: 'success',
            onConfirm: async () => {
                await updateStatus(id, 'completed');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
            },
        });
    };

    const handlePauseSession = () => {
        recordPause(60); // Record 1 minute pause (simplified)
    };

    const isSessionActive = activeSession?.bookshelfItemId === id;

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={COMPONENT_SIZES.icon.large} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {bookshelfItem.bookId.title}
                    </Text>
                    <View style={{ width: COMPONENT_SIZES.icon.large }} />
                </View>

                {/* Progress Overview */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Reading Progress</Text>
                    <ReadingProgressBar
                        currentPage={bookshelfItem.currentPage}
                        totalPages={bookshelfItem.totalPages}
                        progress={bookshelfItem.progress}
                        showLabel={true}
                        showGoal={!!bookshelfItem.targetCompletionDate}
                        targetCompletionDate={bookshelfItem.targetCompletionDate}
                    />

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{bookshelfItem.actualReadingTime || 0}</Text>
                            <Text style={styles.statLabel}>Minutes</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {bookshelfItem.readingSpeed > 0 ? bookshelfItem.readingSpeed.toFixed(1) : '—'}
                            </Text>
                            <Text style={styles.statLabel}>Pages/Hour</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{bookshelfItem.notes}</Text>
                            <Text style={styles.statLabel}>Notes</Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Session Timer */}
                {isSessionActive && (
                    <SessionTimer
                        isActive={true}
                        onPause={handlePauseSession}
                        showPauseButton={true}
                    />
                )}

                {/* Update Progress */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Update Current Page</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={currentPageInput}
                            onChangeText={setCurrentPageInput}
                            keyboardType="number-pad"
                            placeholder={`0 - ${bookshelfItem.totalPages}`}
                            placeholderTextColor={COLORS.textMuted}
                            accessibilityLabel="Current page number"
                        />
                        <Text style={styles.inputSuffix}>of {bookshelfItem.totalPages}</Text>
                    </View>
                    <GlazedButton
                        title={isUpdating ? 'Updating...' : 'Update Progress'}
                        onPress={handleUpdateProgress}
                        disabled={isUpdating}
                        style={styles.updateButton}
                    />
                </GlassCard>

                {/* Session Controls */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Reading Session</Text>
                    {isSessionActive ? (
                        <GlazedButton
                            title={isEndingSession ? 'Ending...' : 'End Session'}
                            onPress={handleEndSession}
                            disabled={isEndingSession}
                            style={styles.sessionButton}
                        />
                    ) : (
                        <GlazedButton
                            title={isStartingSession ? 'Starting...' : 'Start Reading Session'}
                            onPress={handleStartSession}
                            disabled={isStartingSession}
                            style={styles.sessionButton}
                        />
                    )}
                    <Text style={styles.sessionHint}>
                        {isSessionActive
                            ? 'Track your reading time and earn Ink Drops!'
                            : 'Start a session to track time and progress'}
                    </Text>
                </GlassCard>

                {/* Quick Actions */}
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push(`/book-notes/${id}` as any)}
                            accessibilityLabel="View notes"
                        >
                            <Ionicons name="create" size={COMPONENT_SIZES.icon.medium} color={COLORS.primary} />
                            <Text style={styles.actionText}>Notes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push(`/reading-stats/${id}` as any)}
                            accessibilityLabel="View statistics"
                        >
                            <Ionicons name="stats-chart" size={COMPONENT_SIZES.icon.medium} color={COLORS.secondary} />
                            <Text style={styles.actionText}>Stats</Text>
                        </TouchableOpacity>

                        {bookshelfItem.progress >= 100 && bookshelfItem.status !== 'completed' && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleMarkCompleted}
                                accessibilityLabel="Mark as completed"
                            >
                                <Ionicons name="checkmark-circle" size={COMPONENT_SIZES.icon.medium} color={COLORS.success} />
                                <Text style={styles.actionText}>Complete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </GlassCard>
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: PADDING.screen.horizontal,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.xl,
        marginBottom: MARGIN.section.medium,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: SPACING.lg,
    },
    card: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.large,
    },
    cardTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.xxl,
        paddingTop: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZE.xxl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    inputSuffix: {
        fontSize: FONT_SIZE.lg,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginLeft: SPACING.md,
    },
    updateButton: {
        marginTop: 0,
    },
    sessionButton: {
        marginTop: 0,
        marginBottom: SPACING.md,
    },
    sessionHint: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.lg,
    },
    actionButton: {
        flex: 1,
        minWidth: 100,
        aspectRatio: 1,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    actionText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.screen.horizontal,
    },
    errorText: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.error,
        marginVertical: SPACING.xxl,
    },
});
