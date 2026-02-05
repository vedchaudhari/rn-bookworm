// mobile/app/(tabs)/bookshelf.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import GlazedButton from '../../components/GlazedButton';
import Loader from '../../components/Loader';
import SkeletonLoader from '../../components/SkeletonLoader';
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
import { useUIStore } from '../../store/uiStore';
import { Ionicons } from '@expo/vector-icons';
import BookShelfCard from '../../components/BookShelfCard';
import AppHeader from '../../components/AppHeader';
import type { ReadingStatus } from '../../lib/api/bookshelfApi';



type TabType = 'all' | ReadingStatus;

interface Tab {
    key: TabType;
    label: string;
    status?: ReadingStatus;
    icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
    { key: 'all', label: 'All', icon: 'library' },
    { key: 'currently_reading', label: 'Reading', status: 'currently_reading', icon: 'book' },
    { key: 'want_to_read', label: 'Want to Read', status: 'want_to_read', icon: 'bookmark' },
    { key: 'completed', label: 'Completed', status: 'completed', icon: 'checkmark-circle' },
    { key: 'paused', label: 'Paused', status: 'paused', icon: 'pause-circle' },
    { key: 'dropped', label: 'Dropped', status: 'dropped', icon: 'close-circle' },
];

/**
 * BookshelfScreen
 * Main bookshelf screen with tabs, filtering, sorting, and infinite scroll
 */
export default function BookshelfScreen() {
    const router = useRouter();
    const { showAlert } = useUIStore();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);

    const {
        items,
        isLoading,
        isLoadingMore,
        isRefreshing,
        hasMore,
        error,
        stats,
        fetchBookshelf,
        refreshBookshelf,
        loadMore,
        fetchStats,
        clearError,
    } = useBookshelfStore();

    // Load initial data
    useEffect(() => {
        loadInitialData();
        fetchStats();
    }, []);

    // Reload when tab changes (skip on initial mount)
    useEffect(() => {
        if (isInitialLoad) return;

        const loadTabData = async () => {
            setIsFilterLoading(true);
            try {
                if (activeTab !== 'all') {
                    const tab = TABS.find(t => t.key === activeTab);
                    if (tab?.status) {
                        await fetchBookshelf({ status: tab.status, offset: 0 });
                    }
                } else {
                    await fetchBookshelf({ offset: 0 });
                }
            } finally {
                setIsFilterLoading(false);
            }
        };

        loadTabData();
    }, [activeTab]);

    const loadInitialData = async () => {
        try {
            await fetchBookshelf({ offset: 0 });
        } catch (error) {
            console.error('Failed to load bookshelf:', error);
        } finally {
            setIsInitialLoad(false);
        }
    };

    const handleRefresh = async () => {
        await refreshBookshelf();
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore) {
            loadMore();
        }
    };

    const handleBookPress = (item: any) => {
        router.push(`/book-progress/${item._id}` as any);
    };

    const handleAddBook = () => {
        router.push('/create' as any);
        AccessibilityInfo.announceForAccessibility('Navigate to create to add books');
    };

    const handleBrowse = () => {
        router.push('/explore' as any);
        AccessibilityInfo.announceForAccessibility('Navigate to explore to browse books');
    };

    const handleStartReading = (item: any) => {
        router.push({
            pathname: `/book-progress/${item._id}`,
            params: { autoStart: 'true' }
        } as any);
    };

    const handleAddNote = (item: any) => {
        console.log('[Bookshelf] handleAddNote called for item:', item?._id);
        console.log('[Bookshelf] Navigating to create-note with:', {
            bookId: item?.bookId?._id,
            bookshelfItemId: item?._id,
            bookTitle: item?.bookId?.title
        });

        if (!item?.bookId) {
            showAlert({ title: 'Error', message: 'Cannot add note: Book data is missing.', type: 'error' });
            return;
        }

        try {
            router.push({
                pathname: '/create-note',
                params: {
                    bookId: item.bookId._id,
                    bookshelfItemId: item._id,
                    bookTitle: item.bookId.title || 'Untitled'
                }
            });
        } catch (error) {
            console.error('[Bookshelf] Add Note Navigation Error:', error);
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchQuery('');
        AccessibilityInfo.announceForAccessibility(`Switched to ${TABS.find(t => t.key === tab)?.label} tab`);
    };

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;

        const query = searchQuery.toLowerCase();
        return items.filter(item => {
            const title = item?.bookId?.title?.toLowerCase() || '';
            const author = item?.bookId?.author?.toLowerCase() || '';
            const tags = item?.tags || [];

            return title.includes(query) ||
                author.includes(query) ||
                tags.some(tag => tag.toLowerCase().includes(query));
        });
    }, [items, searchQuery]);

    const renderHeader = () => (
        <View>
            {/* Header with Stats */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookshelf</Text>
                <TouchableOpacity
                    onPress={() => setShowFilters(!showFilters)}
                    accessibilityLabel="Toggle filters"
                    accessibilityHint="Shows or hides filter options"
                >
                    <Ionicons
                        name={showFilters ? 'filter' : 'filter-outline'}
                        size={COMPONENT_SIZES.icon.large}
                        color={COLORS.primary}
                    />
                </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            {stats && (
                <View style={styles.statsContainer}>
                    <GlassCard style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalBooks}</Text>
                        <Text style={styles.statLabel}>Total Books</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.currentlyReading}</Text>
                        <Text style={styles.statLabel}>Reading</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.completed}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </GlassCard>
                </View>
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
                    placeholder="Search books, authors, tags..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    accessibilityLabel="Search bookshelf"
                    accessibilityHint="Type to filter books by title, author, or tags"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        accessibilityLabel="Clear search"
                        style={styles.clearButton}
                    >
                        <Ionicons name="close-circle" size={COMPONENT_SIZES.icon.medium} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={TABS}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item: tab }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => handleTabChange(tab.key)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === tab.key }}
                            accessibilityLabel={tab.label}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={COMPONENT_SIZES.icon.small}
                                color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
                                style={styles.tabIcon}
                            />
                            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.tabsList}
                />
            </View>
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return null;

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={80} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No books found' : `No books in "${TABS.find(t => t.key === activeTab)?.label}"`}
                </Text>
                <Text style={styles.emptyDesc}>
                    {searchQuery
                        ? 'Try adjusting your search'
                        : 'Start building your reading collection'}
                </Text>
                {!searchQuery && (
                    <GlazedButton
                        title="Browse Books"
                        onPress={handleBrowse}
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

    const renderError = () => {
        if (!error) return null;

        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
                    <Text style={styles.errorDismissText}>Dismiss</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const BookshelfSkeleton = () => (
        <SafeScreen>
            <View style={styles.container}>
                {/* Header Skeleton */}
                <View style={[styles.header, { paddingHorizontal: 20 }]}>
                    <SkeletonLoader width={150} height={32} />
                    <SkeletonLoader width={32} height={32} borderRadius={16} />
                </View>

                {/* Stats Skeleton */}
                <View style={[styles.statsContainer, { paddingHorizontal: 20 }]}>
                    <SkeletonLoader width="30%" height={80} borderRadius={16} />
                    <SkeletonLoader width="30%" height={80} borderRadius={16} />
                    <SkeletonLoader width="30%" height={80} borderRadius={16} />
                </View>

                {/* Search Skeleton */}
                <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                    <SkeletonLoader width="100%" height={48} borderRadius={24} />
                </View>

                {/* List Skeleton */}
                <View style={{ paddingHorizontal: 20 }}>
                    {[1, 2, 3].map((key) => (
                        <View key={key} style={{ marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 }}>
                            <SkeletonLoader width="60%" height={24} style={{ marginBottom: 8 }} />
                            <SkeletonLoader width="40%" height={16} style={{ marginBottom: 16 }} />
                            <SkeletonLoader width="100%" height={8} borderRadius={4} />
                            <SkeletonLoader width={80} height={12} style={{ marginTop: 8 }} />
                        </View>
                    ))}
                </View>
            </View>
        </SafeScreen>
    );

    if (isLoading && items.length === 0) {
        return <BookshelfSkeleton />;
    }

    return (
        <SafeScreen top={false} bottom={false}>
            <AppHeader />
            <View style={styles.container}>
                {renderError()}

                {/* Static Header with Stats */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Bookshelf</Text>
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        accessibilityLabel="Toggle filters"
                        accessibilityHint="Shows or hides filter options"
                    >
                        <Ionicons
                            name={showFilters ? 'filter' : 'filter-outline'}
                            size={COMPONENT_SIZES.icon.large}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Static Stats Cards */}
                {stats && (
                    <View style={styles.statsContainer}>
                        <GlassCard style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.totalBooks}</Text>
                            <Text style={styles.statLabel}>Total Books</Text>
                        </GlassCard>
                        <GlassCard style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.currentlyReading}</Text>
                            <Text style={styles.statLabel}>Reading</Text>
                        </GlassCard>
                        <GlassCard style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.completed}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </GlassCard>
                    </View>
                )}

                {/* Static Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons
                        name="search"
                        size={COMPONENT_SIZES.icon.medium}
                        color={COLORS.textMuted}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search books, authors, tags..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        accessibilityLabel="Search bookshelf"
                        accessibilityHint="Type to filter books by title, author, or tags"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            accessibilityLabel="Clear search"
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={COMPONENT_SIZES.icon.medium} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Static Tabs */}
                <View style={styles.tabsContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={TABS}
                        keyExtractor={(item) => item.key}
                        renderItem={({ item: tab }) => (
                            <TouchableOpacity
                                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                                onPress={() => handleTabChange(tab.key)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: activeTab === tab.key }}
                                accessibilityLabel={tab.label}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={COMPONENT_SIZES.icon.small}
                                    color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
                                    style={styles.tabIcon}
                                />
                                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.tabsList}
                    />
                </View>

                {/* Dynamic Book List - Only this part reloads */}
                <View style={{ flex: 1, opacity: isFilterLoading ? 0.5 : 1 }}>
                    <FlatList
                        data={filteredItems}
                        keyExtractor={(item, index) => `${item._id || 'item'}-${index}`}
                        renderItem={({ item, index }) => (
                            isInitialLoad ? (
                                <Animated.View entering={FadeInDown.delay(index * 100).duration(600).springify()}>
                                    <BookShelfCard
                                        item={item}
                                        onPress={() => handleBookPress(item)}
                                        onStartReading={() => handleStartReading(item)}
                                        onAddNote={() => handleAddNote(item)}
                                    />
                                </Animated.View>
                            ) : (
                                <BookShelfCard
                                    item={item}
                                    onPress={() => handleBookPress(item)}
                                    onStartReading={() => handleStartReading(item)}
                                    onAddNote={() => handleAddNote(item)}
                                />
                            )
                        )}
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
                        contentContainerStyle={styles.bookListContent}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        updateCellsBatchingPeriod={50}
                        windowSize={10}
                    />
                </View>

                {/* Floating Add Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleAddBook}
                    accessibilityLabel="Add new book"
                    accessibilityHint="Opens book creation to add books to your shelf"
                    accessibilityRole="button"
                >
                    <Ionicons name="add" size={COMPONENT_SIZES.icon.large} color={COLORS.white} />
                </TouchableOpacity>
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
    loadingText: {
        marginTop: SPACING.xl,
        fontSize: FONT_SIZE.lg,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: PADDING.screen.horizontal,
        paddingBottom: 100,
    },
    bookListContent: {
        paddingHorizontal: PADDING.screen.horizontal,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xxl,
        marginBottom: MARGIN.section.medium,
        paddingHorizontal: PADDING.screen.horizontal,
    },
    headerTitle: {
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: MARGIN.item.large,
        gap: SPACING.md,
        paddingHorizontal: PADDING.screen.horizontal,
    },
    statCard: {
        flex: 1,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xs,
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

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        marginBottom: MARGIN.item.medium,
        marginHorizontal: PADDING.screen.horizontal,
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

    // Tabs
    tabsContainer: {
        marginBottom: MARGIN.item.medium,
        paddingHorizontal: PADDING.screen.horizontal,
    },
    tabsList: {
        gap: SPACING.md,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tabActive: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderColor: COLORS.primary,
    },
    tabIcon: {
        marginRight: SPACING.sm,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
    },

    // Empty State
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

    // Error
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
        padding: SPACING.sm,
    },
    errorDismissText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.error,
        fontWeight: '700',
    },

    // Footer
    footerLoader: {
        paddingVertical: SPACING.xxl,
        alignItems: 'center',
    },

    // Filter Loading
    filterLoadingContainer: {
        paddingVertical: SPACING.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
    },
    filterLoadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        fontWeight: '600',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 110,
        right: SPACING.xxl,
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    // Placeholder card (temporary)
    cardPlaceholder: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.vertical,
        marginBottom: MARGIN.item.medium,
    },
    cardTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    cardAuthor: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
    },
    cardProgress: {
        height: 8,
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.sm,
        overflow: 'hidden',
        marginBottom: SPACING.sm,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    cardProgressText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});
