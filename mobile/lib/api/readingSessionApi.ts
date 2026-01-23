// mobile/lib/api/readingSessionApi.ts
import { API_URL } from '../../constants/api';

/**
 * READING SESSION API
 * 
 * Integrates with backend reading session routes
 * Handles session lifecycle, analytics, and statistics
 */

export type SessionSource = 'manual' | 'auto' | 'imported';
export type DeviceType = 'mobile' | 'tablet' | 'web' | 'unknown';

export interface ReadingSession {
    _id: string;
    userId: string;
    bookId: {
        _id: string;
        title: string;
        author: string;
        coverImage?: string;
    };
    bookshelfItemId: string;
    startTime: string;
    endTime: string;
    duration: number; // minutes
    pagesRead: number;
    startPage: number;
    endPage: number;
    source: SessionSource;
    deviceType: DeviceType;
    location?: string;
    wordsRead: number;
    readingSpeed: number; // pages per hour
    focusScore: number; // 0-100
    contributesToStreak: boolean;
    sessionDate: string; // YYYY-MM-DD
    inkDropsEarned: number;
    achievementsUnlocked: string[];
    pauseCount: number;
    averagePauseDuration: number;
    isCompleteSession: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SessionStats {
    totalSessions: number;
    totalMinutes: number;
    totalPages: number;
    totalWords: number;
    averageSpeed: number;
    averageFocusScore: number;
    longestSession: number;
    streakValidSessions: number;
}

export interface DailyStats {
    _id: string; // YYYY-MM-DD
    totalMinutes: number;
    totalPages: number;
    totalWords: number;
    sessionCount: number;
    avgFocusScore: number;
}

export interface WeeklyStats {
    _id: {
        year: number;
        week: number;
    };
    totalMinutes: number;
    totalPages: number;
    totalWords: number;
    sessionCount: number;
    avgFocusScore: number;
}

export interface MonthlyStats {
    _id: {
        year: number;
        month: number;
    };
    totalMinutes: number;
    totalPages: number;
    totalWords: number;
    sessionCount: number;
    avgFocusScore: number;
    avgReadingSpeed: number;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    profileImage?: string;
    totalMinutes: number;
    totalPages: number;
    sessionCount: number;
}

export interface SessionsResponse {
    success: boolean;
    data: ReadingSession[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface SessionFilters {
    bookshelfItemId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

class ReadingSessionApi {
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
     * Start a new reading session
     */
    async startSession(params: {
        bookId: string;
        bookshelfItemId: string;
        startPage: number;
        source?: SessionSource;
        deviceType?: DeviceType;
        location?: string;
    }): Promise<{
        success: boolean;
        data: ReadingSession;
        message: string;
    }> {
        return this.fetchWithAuth('/api/sessions/start', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * End an active reading session
     */
    async endSession(
        sessionId: string,
        endPage: number,
        pauseCount?: number,
        averagePauseDuration?: number
    ): Promise<{
        success: boolean;
        data: ReadingSession;
        inkDropsEarned: number;
        message: string;
    }> {
        return this.fetchWithAuth(`/api/sessions/${sessionId}/end`, {
            method: 'POST',
            body: JSON.stringify({
                endPage,
                pauseCount,
                averagePauseDuration,
            }),
        });
    }

    /**
     * Create a manual or imported session
     */
    async createManualSession(params: {
        bookId: string;
        bookshelfItemId: string;
        startTime: string;
        endTime: string;
        startPage: number;
        endPage: number;
        source?: SessionSource;
        location?: string;
    }): Promise<{
        success: boolean;
        data: ReadingSession;
        message: string;
    }> {
        return this.fetchWithAuth('/api/sessions/manual', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * Get user's reading sessions with filters
     */
    async getSessions(filters: SessionFilters = {}): Promise<SessionsResponse> {
        const queryParams = new URLSearchParams();

        if (filters.bookshelfItemId) {
            queryParams.append('bookshelfItemId', filters.bookshelfItemId);
        }

        if (filters.startDate) {
            queryParams.append('startDate', filters.startDate);
        }

        if (filters.endDate) {
            queryParams.append('endDate', filters.endDate);
        }

        if (filters.limit) {
            queryParams.append('limit', filters.limit.toString());
        }

        if (filters.offset) {
            queryParams.append('offset', filters.offset.toString());
        }

        const query = queryParams.toString();
        return this.fetchWithAuth(`/api/sessions${query ? `?${query}` : ''}`);
    }

    /**
     * Get single reading session
     */
    async getSession(sessionId: string): Promise<{ success: boolean; data: ReadingSession }> {
        return this.fetchWithAuth(`/api/sessions/${sessionId}`);
    }

    /**
     * Get overall reading statistics
     */
    async getOverallStats(): Promise<{ success: boolean; data: SessionStats }> {
        return this.fetchWithAuth('/api/sessions/stats/overall');
    }

    /**
     * Get daily reading statistics
     */
    async getDailyStats(days: number = 30): Promise<{ success: boolean; data: DailyStats[] }> {
        return this.fetchWithAuth(`/api/sessions/stats/daily?days=${days}`);
    }

    /**
     * Get weekly reading statistics
     */
    async getWeeklyStats(weeks: number = 12): Promise<{ success: boolean; data: WeeklyStats[] }> {
        return this.fetchWithAuth(`/api/sessions/stats/weekly?weeks=${weeks}`);
    }

    /**
     * Get monthly reading statistics
     */
    async getMonthlyStats(months: number = 12): Promise<{ success: boolean; data: MonthlyStats[] }> {
        return this.fetchWithAuth(`/api/sessions/stats/monthly?months=${months}`);
    }

    /**
     * Get reading streak calendar (days with activity)
     */
    async getCalendar(year: number, month: number): Promise<{
        success: boolean;
        data: {
            year: number;
            month: number;
            streakDays: string[];
        };
    }> {
        return this.fetchWithAuth(`/api/sessions/calendar?year=${year}&month=${month}`);
    }

    /**
     * Get all sessions for a specific book
     */
    async getBookSessions(bookshelfItemId: string): Promise<{
        success: boolean;
        data: {
            sessions: ReadingSession[];
            summary: {
                totalMinutes: number;
                totalPages: number;
                sessionCount: number;
            };
        };
    }> {
        return this.fetchWithAuth(`/api/sessions/book/${bookshelfItemId}`);
    }

    /**
     * Get monthly reading leaderboard
     */
    async getLeaderboard(limit: number = 50): Promise<{
        success: boolean;
        data: LeaderboardEntry[];
    }> {
        return this.fetchWithAuth(`/api/sessions/leaderboard?limit=${limit}`);
    }

    /**
     * Delete a reading session
     */
    async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
        return this.fetchWithAuth(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }
}

export const readingSessionApi = new ReadingSessionApi();
export default readingSessionApi;
