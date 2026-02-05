// mobile/components/ReadingActivityCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    SHADOWS,
} from '../constants/styleConstants';
import GlassCard from './GlassCard';
import { ReadingSession } from '../lib/api/readingSessionApi';

interface ReadingActivityCardProps {
    session: ReadingSession;
    onPress?: () => void;
}

/**
 * ReadingActivityCard
 * Displays a summary of a single reading session in the activity feed.
 */
const ReadingActivityCard = ({ session, onPress }: ReadingActivityCardProps) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle null bookId gracefully
    const bookCover = session.bookId?.coverImage || 'https://via.placeholder.com/150x225/1a1a2e/00e5ff?text=No+Cover';
    const bookTitle = session.bookId?.title || 'Unknown Book';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
            <GlassCard style={styles.card}>
                <View style={styles.container}>
                    {/* Book Cover */}
                    <Image
                        source={{ uri: bookCover }}
                        style={styles.cover}
                        contentFit="cover"
                        transition={300}
                    />

                    {/* Session Details */}
                    <View style={styles.details}>
                        <Text style={styles.title} numberOfLines={1}>
                            {bookTitle}
                        </Text>
                        <Text style={styles.date}>
                            {formatDate(session.startTime)} • {formatTime(session.startTime)}
                        </Text>

                        <View style={styles.metrics}>
                            <View style={styles.metricItem}>
                                <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.metricText}>{session.duration}m</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.metricItem}>
                                <Ionicons name="document-text-outline" size={14} color={COLORS.secondary} />
                                <Text style={styles.metricText}>{session.pagesRead} pages</Text>
                            </View>
                        </View>
                    </View>

                    {/* Rewards & Performance */}
                    <View style={styles.rightSide}>
                        <View style={styles.inkDrops}>
                            <Ionicons name="water" size={16} color={COLORS.primary} />
                            <Text style={styles.inkDropsText}>+{session.inkDropsEarned}</Text>
                        </View>

                        <View style={styles.focusScore}>
                            <Text style={[styles.focusLabel, { color: getFocusColor(session.focusScore) }]}>
                                {session.focusScore}%
                            </Text>
                            <Text style={styles.focusSub}>Focus</Text>
                        </View>
                    </View>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );
};

const getFocusColor = (score: number) => {
    if (score >= 90) return COLORS.success;
    if (score >= 70) return COLORS.primary;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
};

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cover: {
        width: 50,
        height: 75,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.surface,
    },
    details: {
        flex: 1,
        marginLeft: SPACING.lg,
        justifyContent: 'center',
    },
    title: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    date: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        marginBottom: SPACING.sm,
    },
    metrics: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    divider: {
        width: 1,
        height: 10,
        backgroundColor: COLORS.glassBorder,
    },
    rightSide: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 60,
    },
    inkDrops: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    inkDropsText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '800',
        color: COLORS.primary,
        marginLeft: 2,
    },
    focusScore: {
        alignItems: 'center',
    },
    focusLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '900',
    },
    focusSub: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});

export default ReadingActivityCard;
