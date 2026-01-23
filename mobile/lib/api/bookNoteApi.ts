// mobile/lib/api/bookNoteApi.ts
import { API_URL } from '../../constants/api';

/**
 * BOOK NOTE API
 * 
 * Integrates with backend book note routes
 * Handles notes, highlights, bookmarks, questions, and social features
 */

export type NoteType = 'highlight' | 'note' | 'bookmark' | 'question';
export type Visibility = 'private' | 'followers' | 'public';

export interface BookNote {
    _id: string;
    userId: {
        _id: string;
        username: string;
        profileImage?: string;
    };
    bookId: {
        _id: string;
        title: string;
        author: string;
        coverImage?: string;
    };
    bookshelfItemId: string;
    type: NoteType;
    highlightedText?: string;
    userNote?: string;
    pageNumber: number;
    chapterName?: string;
    position?: {
        start: number;
        end: number;
    };
    color: string;
    visibility: Visibility;
    likes: number;
    replies: number;
    isSpotlight: boolean;
    tags: string[];
    collectionIds: string[];
    sharedWithBookClubId?: string;
    readingSessionId?: string;
    createdAtProgress: number;
    lastEditedAt?: string;
    editCount: number;
    aiSummary?: string;
    aiTags: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    isPremiumFeature: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NoteFilters {
    bookshelfItemId?: string;
    type?: NoteType | NoteType[];
    pageNumber?: number;
    tags?: string[];
    visibility?: Visibility;
    isSpotlight?: boolean;
    sortBy?: 'pageNumber' | 'createdAt' | 'likes';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface NotesResponse {
    success: boolean;
    data: BookNote[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface NoteStats {
    totalNotes: number;
    highlights: number;
    notes: number;
    bookmarks: number;
    questions: number;
    publicNotes: number;
    totalLikes: number;
}

class BookNoteApi {
    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        const token = require('../../store/authContext').useAuthStore.getState().token;

        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    /**
     * Create a new note/highlight/bookmark
     */
    async createNote(params: {
        bookId: string;
        bookshelfItemId: string;
        type: NoteType;
        pageNumber: number;
        highlightedText?: string;
        userNote?: string;
        chapterName?: string;
        position?: { start: number; end: number };
        color?: string;
        visibility?: Visibility;
        tags?: string[];
        readingSessionId?: string;
        createdAtProgress?: number;
    }): Promise<{
        success: boolean;
        data: BookNote;
        message: string;
    }> {
        return this.fetchWithAuth('/api/notes', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * Get notes for a book with filters
     */
    async getNotes(bookshelfItemId: string, filters: Omit<NoteFilters, 'bookshelfItemId'> = {}): Promise<NotesResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append('bookshelfItemId', bookshelfItemId);

        if (filters.type) {
            const types = Array.isArray(filters.type) ? filters.type.join(',') : filters.type;
            queryParams.append('type', types);
        }

        if (filters.pageNumber !== undefined) {
            queryParams.append('pageNumber', filters.pageNumber.toString());
        }

        if (filters.tags && filters.tags.length > 0) {
            queryParams.append('tags', filters.tags.join(','));
        }

        if (filters.visibility) {
            queryParams.append('visibility', filters.visibility);
        }

        if (filters.isSpotlight !== undefined) {
            queryParams.append('isSpotlight', filters.isSpotlight.toString());
        }

        if (filters.sortBy) {
            queryParams.append('sortBy', filters.sortBy);
        }

        if (filters.sortOrder) {
            queryParams.append('sortOrder', filters.sortOrder);
        }

        if (filters.limit) {
            queryParams.append('limit', filters.limit.toString());
        }

        if (filters.offset) {
            queryParams.append('offset', filters.offset.toString());
        }

        const query = queryParams.toString();
        return this.fetchWithAuth(`/api/notes?${query}`);
    }

    /**
     * Search notes by content
     */
    async searchNotes(
        searchQuery: string,
        bookshelfItemId?: string,
        limit: number = 20
    ): Promise<{
        success: boolean;
        data: BookNote[];
        query: string;
    }> {
        const queryParams = new URLSearchParams();
        queryParams.append('q', searchQuery);

        if (bookshelfItemId) {
            queryParams.append('bookshelfItemId', bookshelfItemId);
        }

        queryParams.append('limit', limit.toString());

        return this.fetchWithAuth(`/api/notes/search?${queryParams.toString()}`);
    }

    /**
     * Get note statistics
     */
    async getStats(): Promise<{ success: boolean; data: NoteStats }> {
        return this.fetchWithAuth('/api/notes/stats');
    }

    /**
     * Get user's featured/spotlight notes
     */
    async getSpotlightNotes(limit: number = 10): Promise<{ success: boolean; data: BookNote[] }> {
        return this.fetchWithAuth(`/api/notes/spotlight?limit=${limit}`);
    }

    /**
     * Get all unique tags used by user
     */
    async getUserTags(): Promise<{ success: boolean; data: string[] }> {
        return this.fetchWithAuth('/api/notes/tags');
    }

    /**
     * Get notes by specific tag
     */
    async getNotesByTag(tag: string, limit: number = 50): Promise<{
        success: boolean;
        data: BookNote[];
        tag: string;
    }> {
        return this.fetchWithAuth(`/api/notes/tag/${encodeURIComponent(tag)}?limit=${limit}`);
    }

    /**
     * Get public notes (discovery feed)
     */
    async getPublicNotes(limit: number = 20, offset: number = 0): Promise<{
        success: boolean;
        data: BookNote[];
        pagination: {
            limit: number;
            offset: number;
            hasMore: boolean;
        };
    }> {
        return this.fetchWithAuth(`/api/notes/public?limit=${limit}&offset=${offset}`);
    }

    /**
     * Get notes shared with a book club
     */
    async getBookClubNotes(bookClubId: string, limit: number = 50): Promise<{
        success: boolean;
        data: BookNote[];
    }> {
        return this.fetchWithAuth(`/api/notes/book-club/${bookClubId}?limit=${limit}`);
    }

    /**
     * Get popular highlights for a book
     */
    async getPopularHighlights(bookId: string, limit: number = 10): Promise<{
        success: boolean;
        data: BookNote[];
    }> {
        return this.fetchWithAuth(`/api/notes/popular/${bookId}?limit=${limit}`);
    }

    /**
     * Get single note
     */
    async getNote(noteId: string): Promise<{ success: boolean; data: BookNote }> {
        return this.fetchWithAuth(`/api/notes/${noteId}`);
    }

    /**
     * Update a note
     */
    async updateNote(
        noteId: string,
        params: {
            highlightedText?: string;
            userNote?: string;
            color?: string;
            visibility?: Visibility;
            tags?: string[];
            chapterName?: string;
        }
    ): Promise<{
        success: boolean;
        data: BookNote;
        message: string;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}`, {
            method: 'PATCH',
            body: JSON.stringify(params),
        });
    }

    /**
     * Toggle spotlight/featured status
     */
    async toggleSpotlight(noteId: string): Promise<{
        success: boolean;
        data: BookNote;
        isSpotlight: boolean;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/spotlight`, {
            method: 'PATCH',
        });
    }

    /**
     * Update note visibility
     */
    async updateVisibility(noteId: string, visibility: Visibility): Promise<{
        success: boolean;
        data: BookNote;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/visibility`, {
            method: 'PATCH',
            body: JSON.stringify({ visibility }),
        });
    }

    /**
     * Like a note
     */
    async likeNote(noteId: string): Promise<{
        success: boolean;
        data: BookNote;
        likes: number;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/like`, {
            method: 'POST',
        });
    }

    /**
     * Unlike a note
     */
    async unlikeNote(noteId: string): Promise<{
        success: boolean;
        data: BookNote;
        likes: number;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/like`, {
            method: 'DELETE',
        });
    }

    /**
     * Share note to book club
     */
    async shareToBookClub(noteId: string, bookClubId: string): Promise<{
        success: boolean;
        data: BookNote;
        message: string;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/share`, {
            method: 'POST',
            body: JSON.stringify({ bookClubId }),
        });
    }

    /**
     * Unshare note from book club
     */
    async unshareFromBookClub(noteId: string): Promise<{
        success: boolean;
        data: BookNote;
        message: string;
    }> {
        return this.fetchWithAuth(`/api/notes/${noteId}/share`, {
            method: 'DELETE',
        });
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string): Promise<{ success: boolean; message: string }> {
        return this.fetchWithAuth(`/api/notes/${noteId}`, {
            method: 'DELETE',
        });
    }

    /**
     * Bulk delete notes
     */
    async bulkDeleteNotes(params: {
        bookshelfItemId: string;
        type?: NoteType;
        tags?: string[];
    }): Promise<{
        success: boolean;
        deletedCount: number;
        message: string;
    }> {
        return this.fetchWithAuth('/api/notes/bulk-delete', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * Export notes for a book
     */
    async exportNotes(bookshelfItemId: string): Promise<{
        success: boolean;
        data: Array<{
            type: NoteType;
            pageNumber: number;
            chapterName?: string;
            highlightedText?: string;
            userNote?: string;
            tags: string[];
            createdAt: string;
            color: string;
        }>;
        count: number;
    }> {
        return this.fetchWithAuth(`/api/notes/export/${bookshelfItemId}`);
    }
}

export const bookNoteApi = new BookNoteApi();
export default bookNoteApi;
