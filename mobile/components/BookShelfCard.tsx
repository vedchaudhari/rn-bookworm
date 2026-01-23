// mobile/components/BookShelfCard.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    BORDER_RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
} from '../constants/styleConstants';
import type { BookshelfItem } from '../lib/api/bookshelfApi';

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

    const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
        switch (item.status) {
            case 'currently_reading':
                return 'book';
            case 'completed':
                return 'checkmark-circle';
            case 'want_to_read':
                return 'bookmark';
            case 'paused':
                return 'pause-circle';
            case 'dropped':
                return 'close-circle';
            default:
                return 'book-outline';
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                {/* Book Cover - Smaller */}
                <View style={styles.coverContainer}>
                    {item.bookId.coverImage ? (
                        <Image
                            source={{ uri: item.bookId.coverImage }}
                            style={styles.cover}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.cover, styles.coverPlaceholder]}>
                            <Ionicons name="book" size={24} color={COLORS.textMuted} />
                        </View>
                    )}
                </View>

                {/* Book Info - Right Side */}
                <View style={styles.info}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={1}>
                            {item.bookId.title || 'Untitled Book'}
                        </Text>
                        {item.isFavorite && (
                            <Ionicons name="heart" size={14} color={COLORS.error} style={{ marginLeft: 4 }} />
                        )}
                    </View>

                    <Text style={styles.author} numberOfLines={1}>
                        {item.bookId.author || 'Unknown Author'}
                    </Text>

                    {/* Description/Caption */}
                    {item.bookId.caption ? (
                        <Text style={styles.description} numberOfLines={2}>
                            {item.bookId.caption}
                        </Text>
                    ) : null}

                    {/* Progress Fill Bar */}
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
        borderColor: COLORS.borderLight,
        // ...SHADOWS.small,
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
    miniProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
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
