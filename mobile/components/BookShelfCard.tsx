import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import ProgressiveImage from './ProgressiveImage';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    BORDER_RADIUS,
} from '../constants/styleConstants';
import type { BookshelfItem } from '../lib/api/bookshelfApi';
import { useSocialStore } from '../store/socialStore';

interface BookShelfCardProps {
    item: BookshelfItem;
    onPress: () => void;
    onStartReading?: () => void;
    onAddNote?: () => void;
}

/**
 * BookShelfCard
 * Displays a book on the user's bookshelf with progress, status, and metadata
 */
export default function BookShelfCard({ item, onPress, onStartReading, onAddNote }: BookShelfCardProps) {
    const { syncBookMetrics, bookMetrics } = useSocialStore();
    const bookId = item?.bookId?._id;
    const metrics = bookId ? bookMetrics[bookId] : null;

    // Initialize metrics on mount
    useEffect(() => {
        if (bookId && item.bookId) {
            // Social likes and bookshelf favorites are separate.
            // We pass the current likeCount and commentCount from the book object to synchronize it with global state.
            syncBookMetrics(bookId, false, (item.bookId as any).likeCount || 0, (item.bookId as any).commentCount || 0);
        }
    }, [bookId]);

    const getStatusColor = () => {
        switch (item.status) {
            case 'currently_reading':
                return COLORS.primary;
            case 'completed':
                return COLORS.success;
            case 'want_to_read':
                return COLORS.secondary;
            case 'paused':
                return COLORS.warning;
            case 'dropped':
                return COLORS.error;
            default:
                return COLORS.textMuted;
        }
    };

    const getStatusLabel = () => {
        switch (item.status) {
            case 'currently_reading':
                return 'Reading';
            case 'completed':
                return 'Completed';
            case 'want_to_read':
                return 'Want to Read';
            case 'paused':
                return 'Paused';
            case 'dropped':
                return 'Dropped';
            default:
                return '';
        }
    };

    if (!item?.bookId) {
        return (
            <TouchableOpacity style={styles.card} onPress={onPress}>
                <View style={styles.cardContent}>
                    <View style={styles.coverContainer}>
                        <View style={[styles.cover, styles.coverPlaceholder]}>
                            <Ionicons name="alert-circle-outline" size={24} color={COLORS.error} />
                        </View>
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.title, { color: COLORS.error }]}>Book data missing</Text>
                        <Text style={styles.author}>ID: {item?._id || 'Unknown'}</Text>
                        <Text style={styles.description}>This book may have been deleted.</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    const book = item.bookId as any;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                {/* Book Cover */}
                <View style={styles.coverContainer}>
                    {book.image ? (
                        <ProgressiveImage
                            source={{ uri: book.image }}
                            style={styles.cover}
                        />
                    ) : (
                        <View style={[styles.cover, styles.coverPlaceholder]}>
                            <Ionicons name="book" size={24} color={COLORS.textMuted} />
                        </View>
                    )}
                </View>

                {/* Book Info */}
                <View style={styles.info}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={1}>
                            {book.title || 'Untitled Book'}
                        </Text>
                        {item.isFavorite && (
                            <Ionicons name="heart" size={14} color={COLORS.error} style={{ marginLeft: 4 }} />
                        )}
                    </View>

                    <Text style={styles.author} numberOfLines={1}>
                        {book.author || 'Unknown Author'}
                    </Text>

                    {book.caption ? (
                        <Text style={styles.description} numberOfLines={2}>
                            {book.caption}
                        </Text>
                    ) : null}

                    {/* Progress & Social Strip */}
                    <View style={styles.metricsRow}>
                        {item.status !== 'want_to_read' && (
                            <View style={styles.miniProgressContainer}>
                                <View style={styles.miniProgressBar}>
                                    <View
                                        style={[
                                            styles.miniProgressFill,
                                            {
                                                width: `${item.progress || 0}%`,
                                                backgroundColor: getStatusColor(),
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.miniProgressText}>{item.progress || 0}%</Text>
                            </View>
                        )}

                        <View style={styles.socialBadges}>
                            <View style={styles.miniStat}>
                                <Ionicons name="heart" size={10} color={COLORS.error} />
                                <Text style={styles.miniStatText}>{metrics?.likeCount ?? book.likeCount ?? 0}</Text>
                            </View>
                            <View style={styles.miniStat}>
                                <Ionicons name="chatbubble" size={10} color={COLORS.secondary} />
                                <Text style={styles.miniStatText}>{metrics?.commentCount ?? book.commentCount ?? 0}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions Row */}
                    <View style={styles.actionsRow}>
                        {onStartReading && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: COLORS.primary }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onStartReading();
                                }}
                            >
                                <Ionicons name="play" size={12} color={COLORS.primary} />
                                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Read</Text>
                            </TouchableOpacity>
                        )}
                        {onAddNote && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: COLORS.textMuted }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onAddNote();
                                }}
                            >
                                <Ionicons name="create-outline" size={12} color={COLORS.textMuted} />
                                <Text style={[styles.actionBtnText, { color: COLORS.textMuted }]}>Note</Text>
                            </TouchableOpacity>
                        )}
                        <View style={styles.badgeContainer}>
                            <View style={[styles.miniStatusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                                <Text style={[styles.miniStatusText, { color: getStatusColor() }]}>
                                    {getStatusLabel()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: MARGIN.item.medium,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
    },
    cardContent: {
        flexDirection: 'row',
    },
    coverContainer: {
        marginRight: SPACING.md,
    },
    cover: {
        width: 60,
        height: 90,
        borderRadius: BORDER_RADIUS.md,
    },
    coverPlaceholder: {
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        flex: 1,
    },
    author: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        fontWeight: '500',
    },
    description: {
        fontSize: 12,
        color: COLORS.textMuted,
        lineHeight: 16,
        marginBottom: SPACING.sm,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        gap: SPACING.md,
    },
    miniProgressContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniProgressBar: {
        flex: 1,
        height: 4,
        backgroundColor: COLORS.background,
        borderRadius: 2,
        overflow: 'hidden',
        marginRight: SPACING.sm,
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    miniProgressText: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    socialBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    miniStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    miniStatText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    actionBtnText: {
        fontSize: 10,
        fontWeight: '700',
    },
    badgeContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    miniStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    miniStatusText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
});
