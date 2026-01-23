// mobile/components/NoteCard.tsx
import React from 'react';
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
import type { BookNote } from '../lib/api/bookNoteApi';

interface NoteCardProps {
    note: BookNote;
    onPress?: () => void;
    onLike?: () => void;
    onSpotlight?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
}

/**
 * NoteCard
 * Displays a book note/highlight with type indicator, content, and metadata
 */
export default function NoteCard({
    note,
    onPress,
    onLike,
    onSpotlight,
    onDelete,
    showActions = false,
}: NoteCardProps) {
    const getTypeColor = () => {
        switch (note.type) {
            case 'highlight':
                return COLORS.secondary;
            case 'note':
                return COLORS.primary;
            case 'bookmark':
                return COLORS.warning;
            case 'question':
                return COLORS.error;
            default:
                return COLORS.textMuted;
        }
    };

    const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
        switch (note.type) {
            case 'highlight':
                return 'color-fill';
            case 'note':
                return 'create';
            case 'bookmark':
                return 'bookmark';
            case 'question':
                return 'help-circle';
            default:
                return 'document-text';
        }
    };

    const getVisibilityIcon = (): keyof typeof Ionicons.glyphMap => {
        switch (note.visibility) {
            case 'public':
                return 'globe';
            case 'followers':
                return 'people';
            case 'private':
                return 'lock-closed';
            default:
                return 'eye-off';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                note.color && { borderLeftWidth: 4, borderLeftColor: note.color },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${note.type} on page ${note.pageNumber}`}
            accessibilityHint="Tap to view full note details"
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor()}20` }]}>
                    <Ionicons name={getTypeIcon()} size={COMPONENT_SIZES.icon.tiny} color={getTypeColor()} />
                    <Text style={[styles.typeText, { color: getTypeColor() }]}>
                        {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                    </Text>
                </View>

                <View style={styles.headerRight}>
                    <Text style={styles.pageNumber}>Page {note.pageNumber}</Text>
                    {note.isSpotlight && (
                        <Ionicons name="star" size={COMPONENT_SIZES.icon.small} color={COLORS.secondary} />
                    )}
                </View>
            </View>

            {/* Chapter Name */}
            {note.chapterName && (
                <Text style={styles.chapterName} numberOfLines={1}>
                    📖 {note.chapterName}
                </Text>
            )}

            {/* Highlighted Text */}
            {note.highlightedText && (
                <View style={styles.highlightContainer}>
                    <Ionicons
                        name="chatbubbles-outline"
                        size={COMPONENT_SIZES.icon.small}
                        color={COLORS.textMuted}
                        style={styles.quoteIcon}
                    />
                    <Text style={styles.highlightText} numberOfLines={4}>
                        {note.highlightedText}
                    </Text>
                </View>
            )}

            {/* User Note */}
            {note.userNote && (
                <Text style={styles.userNote} numberOfLines={3}>
                    {note.userNote}
                </Text>
            )}

            {/* Tags */}
            {note.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {note.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                    ))}
                    {note.tags.length > 3 && (
                        <Text style={styles.moreTagsText}>+{note.tags.length - 3}</Text>
                    )}
                </View>
            )}

            {/* Footer Metadata */}
            <View style={styles.footer}>
                <View style={styles.metaLeft}>
                    <Ionicons
                        name={getVisibilityIcon()}
                        size={COMPONENT_SIZES.icon.tiny}
                        color={COLORS.textMuted}
                    />
                    <Text style={styles.metaText}>{formatDate(note.createdAt)}</Text>
                    {note.editCount > 0 && (
                        <Text style={styles.metaText}>• Edited</Text>
                    )}
                </View>

                <View style={styles.metaRight}>
                    <TouchableOpacity
                        style={styles.metaButton}
                        onPress={onLike}
                        accessibilityLabel={`${note.likes} likes`}
                        accessibilityRole="button"
                    >
                        <Ionicons
                            name="heart-outline"
                            size={COMPONENT_SIZES.icon.small}
                            color={COLORS.textMuted}
                        />
                        <Text style={styles.metaText}>{note.likes}</Text>
                    </TouchableOpacity>

                    {note.replies > 0 && (
                        <View style={styles.metaButton}>
                            <Ionicons
                                name="chatbubble-outline"
                                size={COMPONENT_SIZES.icon.small}
                                color={COLORS.textMuted}
                            />
                            <Text style={styles.metaText}>{note.replies}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Actions (shown on long press or in detail view) */}
            {showActions && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onSpotlight}
                        accessibilityLabel="Toggle spotlight"
                    >
                        <Ionicons
                            name={note.isSpotlight ? 'star' : 'star-outline'}
                            size={COMPONENT_SIZES.icon.medium}
                            color={note.isSpotlight ? COLORS.secondary : COLORS.textMuted}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onDelete}
                        accessibilityLabel="Delete note"
                    >
                        <Ionicons name="trash-outline" size={COMPONENT_SIZES.icon.medium} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.vertical,
        marginBottom: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.circular,
        gap: SPACING.xs,
    },
    typeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    pageNumber: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    chapterName: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    highlightContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
    },
    quoteIcon: {
        marginRight: SPACING.sm,
        marginTop: 2,
    },
    highlightText: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        fontStyle: 'italic',
        lineHeight: FONT_SIZE.md * 1.5,
    },
    userNote: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        lineHeight: FONT_SIZE.md * 1.5,
        marginBottom: SPACING.md,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    tag: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.circular,
    },
    tagText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.primary,
        fontWeight: '600',
    },
    moreTagsText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
        alignSelf: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    metaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    metaRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.lg,
    },
    metaText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    metaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: SPACING.lg,
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionButton: {
        padding: SPACING.sm,
    },
});
