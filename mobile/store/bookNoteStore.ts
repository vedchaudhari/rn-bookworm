// mobile/store/bookNoteStore.ts
import { create } from 'zustand';
import bookNoteApi, {
    BookNote,
    NoteType,
    Visibility,
    NoteFilters,
    NoteStats,
} from '../lib/api/bookNoteApi';

/**
 * BOOK NOTE STORE
 * 
 * Manages book notes and highlights with:
 * - Notes list with filtering
 * - Search functionality
 * - Tag management
 * - Spotlight notes
 * - Social features (likes)
 * - Optimistic create/update/delete
 * - Statistics caching
 */

interface BookNoteState {
    // Notes data
    notes: BookNote[];
    currentBookshelfItemId: string | null;
    currentFilters: Omit<NoteFilters, 'bookshelfItemId'>;

    // Search
    searchResults: BookNote[];
    searchQuery: string;

    // Pagination
    total: number;
    hasMore: boolean;

    // Special lists
    spotlightNotes: BookNote[];
    userTags: string[];

    // Statistics
    stats: NoteStats | null;

    // Loading states
    isLoading: boolean;
    isLoadingMore: boolean;
    isCreating: boolean;
    isSearching: boolean;

    // Error state
    error: string | null;

    // Actions - CRUD
    createNote: (params: {
        bookId: string;
        bookshelfItemId: string;
        type: NoteType;
        pageNumber: number;
        highlightedText?: string;
        userNote?: string;
        color?: string;
        visibility?: Visibility;
        tags?: string[];
    }) => Promise<BookNote | null>;

    fetchNotes: (bookshelfItemId: string, filters?: Omit<NoteFilters, 'bookshelfItemId'>, append?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;

    updateNote: (noteId: string, params: {
        highlightedText?: string;
        userNote?: string;
        color?: string;
        tags?: string[];
    }) => Promise<boolean>;

    deleteNote: (noteId: string) => Promise<boolean>;

    // Search
    searchNotes: (query: string, bookshelfItemId?: string) => Promise<void>;

    // Social features
    toggleSpotlight: (noteId: string) => Promise<boolean>;
    updateVisibility: (noteId: string, visibility: Visibility) => Promise<boolean>;
    likeNote: (noteId: string) => Promise<boolean>;
    unlikeNote: (noteId: string) => Promise<boolean>;

    // Tags
    fetchUserTags: () => Promise<void>;

    // Special lists
    fetchSpotlightNotes: () => Promise<void>;

    // Statistics
    fetchStats: () => Promise<void>;

    // Utilities
    clearError: () => void;
    reset: () => void;
}

export const useBookNoteStore = create<BookNoteState>((set, get) => ({
    // Initial state
    notes: [],
    currentBookshelfItemId: null,
    currentFilters: { limit: 100, offset: 0, sortBy: 'pageNumber', sortOrder: 'asc' },
    searchResults: [],
    searchQuery: '',
    total: 0,
    hasMore: false,
    spotlightNotes: [],
    userTags: [],
    stats: null,
    isLoading: false,
    isLoadingMore: false,
    isCreating: false,
    isSearching: false,
    error: null,

    // Create a new note
    createNote: async (params) => {
        set({ isCreating: true, error: null });

        try {
            const response = await bookNoteApi.createNote(params);

            // Add to notes list if viewing same book
            const state = get();
            if (state.currentBookshelfItemId === params.bookshelfItemId) {
                set(prevState => {
                    const newNotes = [response.data, ...prevState.notes];
                    const dedupedNotes = Array.from(new Map(newNotes.map(note => [note._id, note])).values());

                    return {
                        notes: dedupedNotes,
                        total: prevState.total + 1,
                    };
                });
            }

            set({ isCreating: false });

            // Refresh stats
            get().fetchStats();

            return response.data;
        } catch (error: any) {
            console.error('Error creating note:', error);
            set({
                error: error.message || 'Failed to create note',
                isCreating: false,
            });
            return null;
        }
    },

    // Fetch notes for a book
    fetchNotes: async (bookshelfItemId, filters = {}, append = false) => {
        const state = get();

        if (append) {
            set({ isLoadingMore: true, error: null });
        } else {
            set({ isLoading: true, error: null, notes: [] });
        }

        try {
            const mergedFilters = { ...get().currentFilters, ...filters };
            const response = await bookNoteApi.getNotes(bookshelfItemId, mergedFilters);

            set(state => {
                const rawNotes = append ? [...state.notes, ...response.data] : response.data;

                // Diagnostic Check
                const seenIds = new Set();
                const duplicates = rawNotes.filter(n => {
                    const isDuplicate = seenIds.has(n._id);
                    seenIds.add(n._id);
                    return isDuplicate;
                });

                if (duplicates.length > 0) {
                    console.warn(`[BookNoteStore] ⚠️ Detected ${duplicates.length} duplicate IDs in set:`,
                        duplicates.map(d => ({ id: d._id, type: d.type, page: d.pageNumber }))
                    );
                }

                const dedupedNotes = Array.from(new Map(rawNotes.map(note => [note._id, note])).values());

                return {
                    notes: dedupedNotes,
                    currentBookshelfItemId: bookshelfItemId,
                    currentFilters: mergedFilters,
                    total: response.pagination.total,
                    hasMore: response.pagination.hasMore,
                    isLoading: false,
                    isLoadingMore: false,
                };
            });
        } catch (error: any) {
            console.error('Error fetching notes:', error);
            set({
                error: error.message || 'Failed to load notes',
                isLoading: false,
                isLoadingMore: false,
            });
        }
    },

    // Load more notes (pagination)
    loadMore: async () => {
        const { hasMore, currentBookshelfItemId, currentFilters, isLoadingMore } = get();

        if (!hasMore || isLoadingMore || !currentBookshelfItemId) return;

        const nextOffset = (currentFilters.offset || 0) + (currentFilters.limit || 100);
        await get().fetchNotes(currentBookshelfItemId, { ...currentFilters, offset: nextOffset }, true);
    },

    // Update note (with optimistic update)
    updateNote: async (noteId, params) => {
        const previousNotes = get().notes;

        // Optimistic update
        set(state => ({
            notes: state.notes.map(note =>
                note._id === noteId
                    ? {
                        ...note,
                        ...params,
                        lastEditedAt: new Date().toISOString(),
                        editCount: note.editCount + 1,
                    }
                    : note
            ),
        }));

        try {
            const response = await bookNoteApi.updateNote(noteId, params);

            // Update with server data
            set(state => ({
                notes: state.notes.map(note =>
                    note._id === noteId ? response.data : note
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating note:', error);

            // Rollback on error
            set({ notes: previousNotes, error: error.message || 'Failed to update note' });
            return false;
        }
    },

    // Delete note (with optimistic delete)
    deleteNote: async (noteId) => {
        const previousNotes = get().notes;
        const previousTotal = get().total;

        // Optimistic delete
        set(state => ({
            notes: state.notes.filter(note => note._id !== noteId),
            total: state.total - 1,
        }));

        try {
            await bookNoteApi.deleteNote(noteId);

            // Refresh stats
            get().fetchStats();

            return true;
        } catch (error: any) {
            console.error('Error deleting note:', error);

            // Rollback on error
            set({
                notes: previousNotes,
                total: previousTotal,
                error: error.message || 'Failed to delete note',
            });
            return false;
        }
    },

    // Search notes
    searchNotes: async (query, bookshelfItemId) => {
        set({ isSearching: true, error: null, searchQuery: query });

        try {
            const response = await bookNoteApi.searchNotes(query, bookshelfItemId);
            set({
                searchResults: response.data,
                isSearching: false,
            });
        } catch (error: any) {
            console.error('Error searching notes:', error);
            set({
                error: error.message || 'Failed to search notes',
                isSearching: false,
            });
        }
    },

    // Toggle spotlight status (with optimistic update)
    toggleSpotlight: async (noteId) => {
        const previousNotes = get().notes;

        // Optimistic update
        set(state => ({
            notes: state.notes.map(note =>
                note._id === noteId ? { ...note, isSpotlight: !note.isSpotlight } : note
            ),
        }));

        try {
            const response = await bookNoteApi.toggleSpotlight(noteId);

            // Update with server data
            set(state => ({
                notes: state.notes.map(note =>
                    note._id === noteId ? response.data : note
                ),
            }));

            // Refresh spotlight list if toggled on
            if (response.isSpotlight) {
                get().fetchSpotlightNotes();
            }

            return true;
        } catch (error: any) {
            console.error('Error toggling spotlight:', error);

            // Rollback on error
            set({ notes: previousNotes, error: error.message || 'Failed to toggle spotlight' });
            return false;
        }
    },

    // Update visibility (with optimistic update)
    updateVisibility: async (noteId, visibility) => {
        const previousNotes = get().notes;

        // Optimistic update
        set(state => ({
            notes: state.notes.map(note =>
                note._id === noteId ? { ...note, visibility } : note
            ),
        }));

        try {
            const response = await bookNoteApi.updateVisibility(noteId, visibility);

            // Update with server data
            set(state => ({
                notes: state.notes.map(note =>
                    note._id === noteId ? response.data : note
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error updating visibility:', error);

            // Rollback on error
            set({ notes: previousNotes, error: error.message || 'Failed to update visibility' });
            return false;
        }
    },

    // Like note (with optimistic update)
    likeNote: async (noteId) => {
        const previousNotes = get().notes;

        // Optimistic update
        set(state => ({
            notes: state.notes.map(note =>
                note._id === noteId ? { ...note, likes: note.likes + 1 } : note
            ),
        }));

        try {
            const response = await bookNoteApi.likeNote(noteId);

            // Update with server data
            set(state => ({
                notes: state.notes.map(note =>
                    note._id === noteId ? response.data : note
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error liking note:', error);

            // Rollback on error
            set({ notes: previousNotes, error: error.message || 'Failed to like note' });
            return false;
        }
    },

    // Unlike note (with optimistic update)
    unlikeNote: async (noteId) => {
        const previousNotes = get().notes;

        // Optimistic update
        set(state => ({
            notes: state.notes.map(note =>
                note._id === noteId ? { ...note, likes: Math.max(0, note.likes - 1) } : note
            ),
        }));

        try {
            const response = await bookNoteApi.unlikeNote(noteId);

            // Update with server data
            set(state => ({
                notes: state.notes.map(note =>
                    note._id === noteId ? response.data : note
                ),
            }));

            return true;
        } catch (error: any) {
            console.error('Error unliking note:', error);

            // Rollback on error
            set({ notes: previousNotes, error: error.message || 'Failed to unlike note' });
            return false;
        }
    },

    // Fetch user tags
    fetchUserTags: async () => {
        try {
            const response = await bookNoteApi.getUserTags();
            set({ userTags: response.data });
        } catch (error: any) {
            console.error('Error fetching tags:', error);
            set({ error: error.message || 'Failed to load tags' });
        }
    },

    // Fetch spotlight notes
    fetchSpotlightNotes: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await bookNoteApi.getSpotlightNotes();
            set({ spotlightNotes: response.data, isLoading: false });
        } catch (error: any) {
            console.error('Error fetching spotlight notes:', error);
            set({
                error: error.message || 'Failed to load spotlight notes',
                isLoading: false,
            });
        }
    },

    // Fetch statistics
    fetchStats: async () => {
        try {
            const response = await bookNoteApi.getStats();
            set({ stats: response.data });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            set({ error: error.message || 'Failed to load statistics' });
        }
    },

    // Clear error
    clearError: () => set({ error: null }),

    // Reset store
    reset: () => set({
        notes: [],
        currentBookshelfItemId: null,
        currentFilters: { limit: 100, offset: 0, sortBy: 'pageNumber', sortOrder: 'asc' },
        searchResults: [],
        searchQuery: '',
        total: 0,
        hasMore: false,
        spotlightNotes: [],
        userTags: [],
        stats: null,
        isLoading: false,
        isLoadingMore: false,
        isCreating: false,
        isSearching: false,
        error: null,
    }),
}));
