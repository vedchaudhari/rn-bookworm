// mobile/app/book-notes/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import GlazedButton from '../../components/GlazedButton';
import Loader from '../../components/Loader';
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
import { useBookNoteStore } from '../../store/bookNoteStore';
import { useBookshelfStore } from '../../store/bookshelfStore';
import { useUIStore } from '../../store/uiStore';
import { Ionicons } from '@expo/vector-icons';
import type { NoteType, Visibility } from '../../lib/api/bookNoteApi';

// Placeholder for NoteCard component (will be created next)
const NoteCard = ({ note, onPress, onDelete }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.noteCardPlaceholder}>
        <View style={styles.noteHeader}>
            <View style={styles.noteBadge}>
                <Text style={styles.noteType}>{note.type}</Text>
            </View>
            <Text style={styles.notePage}>Page {note.pageNumber}</Text>
        </View>
        {note.highlightedText && (
            <Text style={styles.noteHighlight} numberOfLines={3}>
                "{note.highlightedText}"
            </Text>
        )}
        {note.userNote && (
            <Text style={styles.noteText} numberOfLines={2}>
                {note.userNote}
            </Text>
        )}
        <View style={styles.noteMeta}>
            <Text style={styles.noteMetaText}>
                {note.likes} likes • {new Date(note.createdAt).toLocaleDateString()}
            </Text>
        </View>
    </TouchableOpacity>
);

type FilterType = 'all' | NoteType;

/**
 * BookNotesScreen
 * Displays and manages notes/highlights for a specific book
 */
export default function BookNotesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        notes,
        spotlightNotes,
        userTags,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        fetchNotes,
        searchNotes,
        fetchSpotlightNotes,
        fetchUserTags,
        deleteNote,
        toggleSpotlight,
        likeNote,
        unlikeNote,
        loadMore,
        clearError,
    } = useBookNoteStore();
    const { showAlert } = useUIStore();

    const { items } = useBookshelfStore();
    const bookshelfItem = items.find((item) => item._id === id);

    useEffect(() => {
        if (id) {
            loadInitialData();
        }
    }, [id]);

    useEffect(() => {
        if (id && activeFilter) {
            applyFilter();
        }
    }, [activeFilter]);

    const loadInitialData = async () => {
        if (!id) return;

        await fetchNotes(id, { limit: 50, offset: 0 });
        fetchSpotlightNotes();
        fetchUserTags();
    };

    const applyFilter = async () => {
        if (!id) return;

        const filters: any = { offset: 0 };
        if (activeFilter !== 'all') {
            filters.type = activeFilter;
        }

        await fetchNotes(id, filters);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadInitialData();
        setIsRefreshing(false);
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore) {
            loadMore();
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim()) {
            await searchNotes(searchQuery, id);
        } else {
            await loadInitialData();
        }
    };

    const handleNotePress = (note: any) => {
        showAlert({
            title: note.type.charAt(0).toUpperCase() + note.type.slice(1),
            message: `Page ${note.pageNumber}${note.chapterName ? ` • ${note.chapterName}` : ''}\n\n${note.highlightedText || note.userNote}`,
            showCancel: true,
            confirmText: 'Delete',
            type: 'warning',
            onConfirm: () => handleDeleteNote(note._id),
        });
    };

    const handleDeleteNote = async (noteId: string) => {
        const success = await deleteNote(noteId);
        if (success) {
            showAlert({ title: 'Deleted', message: 'Note removed successfully', type: 'success' });
        }
    };

    const handleToggleSpotlight = async (noteId: string) => {
        await toggleSpotlight(noteId);
    };

    const handleLikeNote = async (noteId: string, isLiked: boolean) => {
        if (isLiked) {
            await unlikeNote(noteId);
        } else {
            await likeNote(noteId);
        }
    };

    const renderHeader = () => (
        <View>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={COMPONENT_SIZES.icon.large} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Notes
                </Text>
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/create-note',
                        params: {
                            bookId: bookshelfItem?.bookId._id,
                            bookshelfItemId: id,
                            bookTitle: bookshelfItem?.bookId.title
                        }
                    })}
                    accessibilityLabel="Create new note"
                >
                    <Ionicons name="add-circle" size={COMPONENT_SIZES.icon.large} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Book Info */}
            {bookshelfItem && (
                <GlassCard style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={1}>
                        {bookshelfItem.bookId.title}
                    </Text>
                    <Text style={styles.bookMeta}>
                        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </Text>
                </GlassCard>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons
                    name="search"
                    size={COMPONENT_SIZES.icon.medium}
                    color={COLORS.textMuted}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notes..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    accessibilityLabel="Search notes"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            setSearchQuery('');
                            loadInitialData();
                        }}
                        style={styles.clearButton}
                    >
                        <Ionicons name="close-circle" size={COMPONENT_SIZES.icon.medium} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filtersContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { key: 'all', label: 'All', icon: 'list' },
                        { key: 'highlight', label: 'Highlights', icon: 'color-fill' },
                        { key: 'note', label: 'Notes', icon: 'create' },
                        { key: 'bookmark', label: 'Bookmarks', icon: 'bookmark' },
                        { key: 'question', label: 'Questions', icon: 'help-circle' },
                    ]}
                    keyExtractor={(item, index) => `${item.key || 'filter'}-${index}`}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterTab, activeFilter === item.key && styles.filterTabActive]}
                            onPress={() => setActiveFilter(item.key as FilterType)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeFilter === item.key }}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={COMPONENT_SIZES.icon.small}
                                color={activeFilter === item.key ? COLORS.primary : COLORS.textMuted}
                                style={styles.filterIcon}
                            />
                            <Text
                                style={[styles.filterText, activeFilter === item.key && styles.filterTextActive]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.filtersList}
                />
            </View>

            {/* Spotlight Notes */}
            {spotlightNotes.length > 0 && activeFilter === 'all' && (
                <View style={styles.spotlightSection}>
                    <Text style={styles.sectionTitle}>⭐ Spotlight Notes</Text>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={spotlightNotes.slice(0, 5)}
                        keyExtractor={(item, index) => `${item._id || 'spotlight'}-${index}`}
                        renderItem={({ item }) => (
                            <NoteCard note={item} onPress={() => handleNotePress(item)} />
                        )}
                        contentContainerStyle={styles.spotlightList}
                    />
                </View>
            )}

            {/* User Tags */}
            {userTags.length > 0 && (
                <View style={styles.tagsSection}>
                    <Text style={styles.sectionTitle}>Tags</Text>
                    <View style={styles.tagsContainer}>
                        {userTags.slice(0, 10).map((tag, index) => (
                            <TouchableOpacity key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return null;

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="create-outline" size={80} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No notes found' : 'No notes yet'}
                </Text>
                <Text style={styles.emptyDesc}>
                    {searchQuery ? 'Try a different search' : 'Start highlighting and taking notes as you read'}
                </Text>
                {!searchQuery && (
                    <GlazedButton
                        title="Create Note"
                        onPress={() => router.push({
                            pathname: '/create-note',
                            params: {
                                bookId: bookshelfItem?.bookId._id,
                                bookshelfItemId: id,
                                bookTitle: bookshelfItem?.bookId.title
                            }
                        })}
                        style={styles.emptyButton}
                    />
                )}
            </View>
        );
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <Loader />
            </View>
        );
    };

    if (isLoading && notes.length === 0) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <Loader />
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={clearError}>
                            <Text style={styles.errorDismiss}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    data={notes}
                    keyExtractor={(item, index) => `${item._id || 'note'}-${index}`}
                    renderItem={({ item }) => (
                        <NoteCard
                            note={item}
                            onPress={() => handleNotePress(item)}
                            onDelete={() => handleDeleteNote(item._id)}
                        />
                    )}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: PADDING.screen.horizontal,
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
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: SPACING.lg,
    },
    bookInfo: {
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.medium,
        alignItems: 'center',
    },
    bookTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    bookMeta: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        marginBottom: MARGIN.item.medium,
    },
    searchIcon: {
        marginRight: SPACING.md,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    clearButton: {
        padding: SPACING.xs,
    },
    filtersContainer: {
        marginBottom: MARGIN.item.medium,
    },
    filtersList: {
        gap: SPACING.md,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderColor: COLORS.primary,
    },
    filterIcon: {
        marginRight: SPACING.sm,
    },
    filterText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    filterTextActive: {
        color: COLORS.primary,
    },
    spotlightSection: {
        marginBottom: MARGIN.item.large,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    spotlightList: {
        gap: SPACING.md,
    },
    tagsSection: {
        marginBottom: MARGIN.item.large,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    tag: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.circular,
    },
    tagText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xxxl * 2,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SPACING.xxl,
        marginBottom: SPACING.md,
    },
    emptyDesc: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
    },
    emptyButton: {
        marginTop: SPACING.lg,
    },
    errorContainer: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        paddingHorizontal: PADDING.screen.horizontal,
        paddingVertical: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        flex: 1,
        fontSize: FONT_SIZE.sm,
        color: COLORS.error,
        fontWeight: '600',
    },
    errorDismiss: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.error,
        fontWeight: '700',
    },
    footerLoader: {
        paddingVertical: SPACING.xxl,
        alignItems: 'center',
    },

    // Placeholder note card
    noteCardPlaceholder: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.medium,
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    noteBadge: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.circular,
    },
    noteType: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    notePage: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    noteHighlight: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textPrimary,
        fontStyle: 'italic',
        marginBottom: SPACING.md,
    },
    noteText: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        lineHeight: FONT_SIZE.md * 1.5,
    },
    noteMeta: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    noteMetaText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});
