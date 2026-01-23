// mobile/store/bookshelfStore.ts
import { create } from 'zustand';
import bookshelfApi, {
    BookshelfItem,
    ReadingStatus,
    Priority,
    BookshelfFilters,
    BookshelfStats,
} from '../lib/api/bookshelfApi';

/**
 * BOOKSHELF STORE
 * 
 * Manages bookshelf state with:
 * - Cached bookshelf items by status
 * - Pagination support
 * - Optimistic updates
 * - Error handling with rollback
 * - Statistics caching
 */

interface BookshelfState {
    // Bookshelf data
    items: BookshelfItem[];
    bookmarkedIds: Set<string>; // Global set of book IDs on shelf for fast, non-paginated access
    currentFilters: BookshelfFilters;

    // Pagination
    total: number;
    hasMore: boolean;
    currentPage: number;

    // Statistics
    stats: BookshelfStats | null;

    // Loading states
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;

    // Error state
    error: string | null;

    // Actions
    fetchBookshelf: (filters?: BookshelfFilters, append?: boolean) => Promise<void>;
    refreshBookshelf: () => Promise<void>;
    loadMore: () => Promise<void>;

    addBook: (params: {
        bookId: string;
        status?: ReadingStatus;
        priority?: Priority;
        isPrivate?: boolean;
    }) => Promise<BookshelfItem | null>;

    updateStatus: (id: string, status: ReadingStatus, rating?: number, review?: string) => Promise<boolean>;
    updateProgress: (id: string, currentPage: number, totalPages?: number) => Promise<boolean>;
    toggleFavorite: (id: string) => Promise<boolean>;
    updateRating: (id: string, rating?: number, review?: string) => Promise<boolean>;
    updatePrivacy: (id: string, isPrivate: boolean) => Promise<boolean>;
    updateTags: (id: string, tags: string[]) => Promise<boolean>;
    updatePriority: (id: string, priority: Priority) => Promise<boolean>;
    removeBook: (id: string, hardDelete?: boolean) => Promise<boolean>;
    removeBookByBookId: (bookId: string) => Promise<boolean>;

    // Statistics
    fetchStats: () => Promise<void>;

    // Quick filters
    getFavorites: () => Promise<void>;
    getCurrentlyReading: () => Promise<void>;
    getCompleted: () => Promise<void>;

    // Utilities
    isBookOnShelf: (bookId: string) => boolean;
    clearError: () => void;
    reset: () => void;
}

export const useBookshelfStore = create<BookshelfState>((set, get) => ({
    // Initial state
    items: [],
    bookmarkedIds: new Set(),
    currentFilters: { limit: 20, offset: 0, sortBy: 'lastReadAt', sortOrder: 'desc' },
    total: 0,
    hasMore: false,
    currentPage: 0,
    stats: null,
    isLoading: false,
    isLoadingMore: false,
    isRefreshing: false,
    error: null,

    // Fetch bookshelf with filters
    fetchBookshelf: async (filters: BookshelfFilters = {}, append: boolean = false) => {
        const state = get();

        if (append) {
            set({ isLoadingMore: true, error: null });
        } else {
            set({ isLoading: true, error: null, items: [] });
        }

        try {
            const mergedFilters = { ...get().currentFilters, ...filters };
            const response = await bookshelfApi.getBookshelf(mergedFilters);

            set(state => {
                const rawItems = append ? [...state.items, ...response.data] : response.data;

                // Diagnostic Check
                const seenIds = new Set();
                const duplicates = rawItems.filter(item => {
                    const isDuplicate = seenIds.has(item._id);
                    seenIds.add(item._id);
                    return isDuplicate;
                });

                if (duplicates.length > 0) {
                    console.warn(`[BookshelfStore] ⚠️ Detected ${duplicates.length} duplicate IDs in set:`,
                        duplicates.map(d => ({ id: d._id, title: d.bookId.title }))
                    );
                }

                const dedupedItems = Array.from(new Map(rawItems.map(item => [item._id, item])).values());

                // Update bookmarkedIds Set
                const newBookmarkedIds = new Set(state.bookmarkedIds);
                response.data.forEach(item => newBookmarkedIds.add((item.bookId?._id || item.bookId) as string));

                return {
                    items: dedupedItems,
                    bookmarkedIds: newBookmarkedIds,
                    total: response.pagination.total,
                    hasMore: response.pagination.hasMore,
                    currentFilters: mergedFilters,
                    currentPage: Math.floor((mergedFilters.offset || 0) / (mergedFilters.limit || 20)),
                    isLoading: false,
                    isLoadingMore: false,
                    isRefreshing: false,
                };
            });
        } catch (error: any) {
            console.error('Error fetching bookshelf:', error);
            set({
                error: error.message || 'Failed to load bookshelf',
                isLoading: false,
                isLoadingMore: false,
                isRefreshing: false,
            });
        }
    },

    // Refresh bookshelf (pull to refresh)
    refreshBookshelf: async () => {
        set({ isRefreshing: true });
        const filters = { ...get().currentFilters, offset: 0 };
        await get().fetchBookshelf(filters, false);
    },

    // Load more items (pagination)
    loadMore: async () => {
        const { hasMore, currentFilters, isLoadingMore } = get();

        if (!hasMore || isLoadingMore) return;

        const nextOffset = (currentFilters.offset || 0) + (currentFilters.limit || 20);
        await get().fetchBookshelf({ ...currentFilters, offset: nextOffset }, true);
    },

    // Add book to shelf
    addBook: async (params) => {
        set({ isLoading: true, error: null });

        try {
            const response = await bookshelfApi.addBookToShelf(params);

            // Add to items list with deduplication
            set(state => {
                const newItems = [response.data, ...state.items];
                const dedupedItems = Array.from(new Map(newItems.map(item => [item._id, item])).values());

                return {
                    items: dedupedItems,
                    total: state.total + 1,
                    isLoading: false,
                };
            });

            // Refresh stats
            get().fetchStats();

            return response.data;
        } catch (error: any) {
            console.error('Error adding book:', error);

            // If the book is already on shelf, we should update our local state to reflect this
            if (error.message === 'BOOK_ALREADY_ON_SHELF') {
                set(state => {
                    const nextIds = new Set(state.bookmarkedIds);
                    nextIds.add(params.bookId);
                    return { bookmarkedIds: nextIds };
                });
            }

            set({
                error: error.message || 'Failed to add book',
                isLoading: false,
            });
            return null;
        }
    },

    // Update reading status (with optimistic update)
    updateStatus: async (id, status, rating, review) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id
                    ? { ...item, status, rating: rating || item.rating, review: review || item.review }
                    : item
            ),
        }));

        try {
            const response = await bookshelfApi.updateStatus(id, status, rating, review);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            // Refresh stats if completed
            if (status === 'completed') {
                get().fetchStats();
            }

            return true;
        } catch (error: any) {
            console.error('Error updating status:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update status' });
            return false;
        }
    },

    // Update reading progress (with optimistic update)
    updateProgress: async (id, currentPage, totalPages) => {
        const previousItems = get().items;

        // Calculate optimistic progress
        const item = get().items.find(i => i._id === id);
        if (!item) return false;

        const pages = totalPages || item.totalPages;
        const progress = pages > 0 ? Math.round((currentPage / pages) * 100) : 0;

        // Optimistic update
        set(state => ({
            items: state.items.map(i =>
                i._id === id
                    ? {
                        ...i,
                        currentPage,
                        totalPages: totalPages || i.totalPages,
                        progress,
                        lastReadAt: new Date().toISOString(),
                    }
                    : i
            ),
        }));

        try {
            const response = await bookshelfApi.updateProgress(id, currentPage, totalPages);

            // Update with server data
            set(state => ({
                items: state.items.map(i =>
                    i._id === id ? response.data : i
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating progress:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update progress' });
            return false;
        }
    },

    // Toggle favorite (with optimistic update)
    toggleFavorite: async (id) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id ? { ...item, isFavorite: !item.isFavorite } : item
            ),
        }));

        try {
            const response = await bookshelfApi.toggleFavorite(id);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error toggling favorite:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to toggle favorite' });
            return false;
        }
    },

    // Update rating and review
    updateRating: async (id, rating, review) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id ? { ...item, rating, review } : item
            ),
        }));

        try {
            const response = await bookshelfApi.updateRating(id, rating, review);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating rating:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update rating' });
            return false;
        }
    },

    // Update privacy setting
    updatePrivacy: async (id, isPrivate) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id ? { ...item, isPrivate } : item
            ),
        }));

        try {
            const response = await bookshelfApi.updatePrivacy(id, isPrivate);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating privacy:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update privacy' });
            return false;
        }
    },

    // Update tags
    updateTags: async (id, tags) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id ? { ...item, tags } : item
            ),
        }));

        try {
            const response = await bookshelfApi.updateTags(id, tags);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating tags:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update tags' });
            return false;
        }
    },

    // Update priority
    updatePriority: async (id, priority) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
            items: state.items.map(item =>
                item._id === id ? { ...item, priority } : item
            ),
        }));

        try {
            const response = await bookshelfApi.updatePriority(id, priority);

            // Update with server data
            set(state => ({
                items: state.items.map(item =>
                    item._id === id ? response.data : item
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating priority:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to update priority' });
            return false;
        }
    },

    // Remove book from shelf
    removeBook: async (id, hardDelete = false) => {
        const previousItems = get().items;
        const previousItem = previousItems.find(i => i._id === id);
        const bookId = previousItem ? (previousItem.bookId?._id || previousItem.bookId) : null;

        // Optimistic removal
        set(state => {
            const nextIds = new Set(state.bookmarkedIds);
            if (bookId) nextIds.delete(bookId as string);

            return {
                items: state.items.filter(item => item._id !== id),
                bookmarkedIds: nextIds,
                total: state.total - 1,
            };
        });

        try {
            await bookshelfApi.removeBook(id, hardDelete);

            // Refresh stats
            get().fetchStats();

            return true;
        } catch (error: any) {
            console.error('Error removing book:', error);

            // Rollback on error
            set({ items: previousItems, error: error.message || 'Failed to remove book' });
            return false;
        }
    },

    // Remove book by Book ID (Stateless removal)
    removeBookByBookId: async (bookId) => {
        const previousItems = get().items;

        // Optimistic removal
        set(state => {
            // Remove from items if present
            const items = state.items.filter(item =>
                (item.bookId?._id || item.bookId) !== bookId
            );

            // Remove from bookmarkedIds
            const nextIds = new Set(state.bookmarkedIds);
            nextIds.delete(bookId);

            return {
                items,
                bookmarkedIds: nextIds,
                total: items.length < state.items.length ? state.total - 1 : state.total,
            };
        });

        try {
            await bookshelfApi.removeBookByBookId(bookId);

            // Refresh stats
            get().fetchStats();

            return true;
        } catch (error: any) {
            console.error('Error removing book by ID:', error);

            // Rollback on error - restore previous state but we might have lost the sync if it was partial
            // Simplest rollback is just resetting items, but bookmarkedIds needs care
            set(state => {
                const nextIds = new Set(state.bookmarkedIds);
                nextIds.add(bookId);
                return { items: previousItems, bookmarkedIds: nextIds, error: error.message || 'Failed to remove book' };
            });
            return false;
        }
    },

    // Fetch statistics
    fetchStats: async () => {
        try {
            const response = await bookshelfApi.getStats();
            set({ stats: response.data });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            set({ error: error.message || 'Failed to load statistics' });
        }
    },

    // Get favorites
    getFavorites: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await bookshelfApi.getFavorites();
            const dedupedItems = Array.from(new Map(response.data.map(item => [item._id, item])).values());

            set({
                items: dedupedItems,
                currentFilters: { isFavorite: true },
                isLoading: false,
            });
        } catch (error: any) {
            console.error('Error fetching favorites:', error);
            set({
                error: error.message || 'Failed to load favorites',
                isLoading: false,
            });
        }
    },

    // Get currently reading
    getCurrentlyReading: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await bookshelfApi.getCurrentlyReading();
            const dedupedItems = Array.from(new Map(response.data.map(item => [item._id, item])).values());

            set({
                items: dedupedItems,
                currentFilters: { status: 'currently_reading' },
                isLoading: false,
            });
        } catch (error: any) {
            console.error('Error fetching currently reading:', error);
            set({
                error: error.message || 'Failed to load currently reading books',
                isLoading: false,
            });
        }
    },

    // Get completed books
    getCompleted: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await bookshelfApi.getCompleted();
            const dedupedItems = Array.from(new Map(response.data.map(item => [item._id, item])).values());

            set({
                items: dedupedItems,
                currentFilters: { status: 'completed' },
                isLoading: false,
            });
        } catch (error: any) {
            console.error('Error fetching completed books:', error);
            set({
                error: error.message || 'Failed to load completed books',
                isLoading: false,
            });
        }
    },

    // Utilities
    isBookOnShelf: (bookId: string) => {
        return get().bookmarkedIds.has(bookId);
    },

    clearError: () => set({ error: null }),

    // Reset store
    reset: () => set({
        items: [],
        bookmarkedIds: new Set(),
        currentFilters: { limit: 20, offset: 0, sortBy: 'lastReadAt', sortOrder: 'desc' },
        total: 0,
        hasMore: false,
        currentPage: 0,
        stats: null,
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
        error: null,
    }),
}));
