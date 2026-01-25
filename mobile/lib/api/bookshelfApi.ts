// mobile/lib/api/bookshelfApi.ts
import { API_URL } from '../../constants/api';

/**
 * BOOKSHELF API
 * 
 * Integrates with backend bookshelf routes
 * Handles book tracking, progress, status updates, and statistics
 */

export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'completed' | 'paused' | 'dropped';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface BookshelfItem {
    _id: string;
    userId: string;
    bookId: {
        _id: string;
        title: string;
        author: string;
        coverImage?: string;
        genre?: string;
        totalPages?: number;
        caption?: string;
        likeCount?: number;
        commentCount?: number;
    };
    status: ReadingStatus;
    progress: number;
    currentPage: number;
    totalPages: number;
    startedReadingAt?: string;
    completedAt?: string;
    lastReadAt?: string;
    rating?: number;
    review?: string;
    isFavorite: boolean;
    priority: Priority;
    tags: string[];
    estimatedReadingTime: number;
    actualReadingTime: number;
    readingSpeed: number;
    recommendedByUserId?: {
        _id: string;
        username: string;
        profileImage?: string;
    };
    isPrivate: boolean;
    notes: number;
    purchasedViaApp: boolean;
    affiliateRevenue: number;
    targetCompletionDate?: string;
    reminderEnabled: boolean;
    reminderFrequency?: 'daily' | 'weekly' | 'biweekly';
    createdAt: string;
    updatedAt: string;
}

export interface BookshelfFilters {
    status?: ReadingStatus | ReadingStatus[];
    isFavorite?: boolean;
    tags?: string[];
    priority?: Priority;
    sortBy?: 'lastReadAt' | 'createdAt' | 'completedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface BookshelfResponse {
    success: boolean;
    data: BookshelfItem[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface BookshelfStats {
    totalBooks: number;
    currentlyReading: number;
    completed: number;
    wantToRead: number;
    totalPagesRead: number;
    totalReadingTime: number;
    averageRating: number;
}

class BookshelfApi {
    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        const token = require('../../store/authContext').useAuthStore.getState().token;

        if (!token) {
            console.log('[BookshelfApi] No token found in store');
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

            if (response.status === 401) {
                console.log('[BookshelfApi] 401 Unauthorized');
            }

            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    /**
     * Get user's bookshelf with filters
     */
    async getBookshelf(filters: BookshelfFilters = {}): Promise<BookshelfResponse> {
        const queryParams = new URLSearchParams();

        if (filters.status) {
            const statuses = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
            queryParams.append('status', statuses);
        }

        if (filters.isFavorite !== undefined) {
            queryParams.append('isFavorite', filters.isFavorite.toString());
        }

        if (filters.tags && filters.tags.length > 0) {
            queryParams.append('tags', filters.tags.join(','));
        }

        if (filters.priority) {
            queryParams.append('priority', filters.priority);
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
        return this.fetchWithAuth(`/api/bookshelf${query ? `?${query}` : ''}`);
    }

    /**
     * Add book to shelf
     */
    async addBookToShelf(params: {
        bookId: string;
        status?: ReadingStatus;
        priority?: Priority;
        isPrivate?: boolean;
        recommendedByUserId?: string;
        targetCompletionDate?: string;
    }): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth('/api/bookshelf', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * Get bookshelf statistics
     */
    async getStats(): Promise<{ success: boolean; data: BookshelfStats }> {
        return this.fetchWithAuth('/api/bookshelf/stats');
    }

    /**
     * Get favorite books
     */
    async getFavorites(limit: number = 20): Promise<{ success: boolean; data: BookshelfItem[] }> {
        return this.fetchWithAuth(`/api/bookshelf/favorites?limit=${limit}`);
    }

    /**
     * Get currently reading books
     */
    async getCurrentlyReading(): Promise<{ success: boolean; data: BookshelfItem[] }> {
        return this.fetchWithAuth('/api/bookshelf/reading');
    }

    /**
     * Get completed books
     */
    async getCompleted(limit: number = 10): Promise<{ success: boolean; data: BookshelfItem[] }> {
        return this.fetchWithAuth(`/api/bookshelf/completed?limit=${limit}`);
    }

    /**
     * Get books with overdue goals
     */
    async getOverdue(): Promise<{ success: boolean; data: BookshelfItem[] }> {
        return this.fetchWithAuth('/api/bookshelf/overdue');
    }

    /**
     * Get public bookshelves (discovery)
     */
    async getPublicBooks(
        status: ReadingStatus = 'currently_reading',
        limit: number = 20
    ): Promise<{ success: boolean; data: BookshelfItem[] }> {
        return this.fetchWithAuth(`/api/bookshelf/public?status=${status}&limit=${limit}`);
    }

    /**
     * Get single bookshelf item
     */
    async getBookshelfItem(id: string): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}`);
    }

    /**
     * Update reading status
     */
    async updateStatus(
        id: string,
        status: ReadingStatus,
        rating?: number,
        review?: string
    ): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, rating, review }),
        });
    }

    /**
     * Update reading progress
     */
    async updateProgress(
        id: string,
        currentPage: number,
        totalPages?: number
    ): Promise<{ success: boolean; data: BookshelfItem; message?: string }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/progress`, {
            method: 'PATCH',
            body: JSON.stringify({ currentPage, totalPages }),
        });
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id: string): Promise<{ success: boolean; data: BookshelfItem; isFavorite: boolean }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/favorite`, {
            method: 'PATCH',
        });
    }

    /**
     * Update rating and review
     */
    async updateRating(
        id: string,
        rating?: number,
        review?: string
    ): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/rating`, {
            method: 'PATCH',
            body: JSON.stringify({ rating, review }),
        });
    }

    /**
     * Update privacy setting
     */
    async updatePrivacy(id: string, isPrivate: boolean): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/privacy`, {
            method: 'PATCH',
            body: JSON.stringify({ isPrivate }),
        });
    }

    /**
     * Update tags
     */
    async updateTags(id: string, tags: string[]): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/tags`, {
            method: 'PATCH',
            body: JSON.stringify({ tags }),
        });
    }

    /**
     * Update priority
     */
    async updatePriority(id: string, priority: Priority): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/priority`, {
            method: 'PATCH',
            body: JSON.stringify({ priority }),
        });
    }

    /**
     * Set reading goal
     */
    async setReadingGoal(
        id: string,
        targetCompletionDate: string | null,
        reminderEnabled?: boolean,
        reminderFrequency?: 'daily' | 'weekly' | 'biweekly' | null
    ): Promise<{ success: boolean; data: BookshelfItem }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}/goal`, {
            method: 'PATCH',
            body: JSON.stringify({ targetCompletionDate, reminderEnabled, reminderFrequency }),
        });
    }

    /**
     * Remove book from shelf
     */
    async removeBook(id: string, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> {
        return this.fetchWithAuth(`/api/bookshelf/${id}${hardDelete ? '?hard=true' : ''}`, {
            method: 'DELETE',
        });
    }

    /**
     * Remove book by Book ID
     */
    async removeBookByBookId(bookId: string): Promise<{ success: boolean; message: string }> {
        return this.fetchWithAuth(`/api/bookshelf/book/${bookId}`, {
            method: 'DELETE',
        });
    }
}

export const bookshelfApi = new BookshelfApi();
export default bookshelfApi;
