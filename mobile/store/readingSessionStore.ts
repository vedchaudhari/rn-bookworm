// mobile/store/readingSessionStore.ts
import { create } from 'zustand';
import readingSessionApi, {
    ReadingSession,
    SessionStats,
    DailyStats,
    WeeklyStats,
    MonthlyStats,
    LeaderboardEntry,
    SessionFilters,
} from '../lib/api/readingSessionApi';

/**
 * READING SESSION STORE
 * 
 * Manages reading sessions and analytics with:
 * - Active session tracking
 * - Session history with pagination
 * - Cached statistics (daily/weekly/monthly)
 * - Calendar data for streak visualization
 * - Leaderboard data
 * - Optimistic session end
 */

interface ReadingSessionState {
    // Active session
    activeSession: ReadingSession | null;
    sessionStartPage: number;
    sessionPauseCount: number;
    sessionPauseDuration: number;

    // Session history
    sessions: ReadingSession[];
    currentFilters: SessionFilters;
    total: number;
    hasMore: boolean;

    // Statistics
    overallStats: SessionStats | null;
    dailyStats: DailyStats[];
    weeklyStats: WeeklyStats[];
    monthlyStats: MonthlyStats[];

    // Calendar & Leaderboard
    calendarData: { year: number; month: number; streakDays: string[] } | null;
    leaderboard: LeaderboardEntry[];

    // Loading states
    isLoading: boolean;
    isLoadingMore: boolean;
    isStartingSession: boolean;
    isEndingSession: boolean;
    isLoadingStats: boolean;

    // Error state
    error: string | null;

    // Actions - Session Lifecycle
    startSession: (bookId: string, bookshelfItemId: string, startPage: number) => Promise<boolean>;
    endSession: (endPage: number) => Promise<{ success: boolean; inkDropsEarned?: number }>;
    createManualSession: (params: {
        bookId: string;
        bookshelfItemId: string;
        startTime: string;
        endTime: string;
        startPage: number;
        endPage: number;
    }) => Promise<boolean>;

    // Session pause tracking
    recordPause: (duration: number) => void;

    // Session History
    fetchSessions: (filters?: SessionFilters, append?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;

    // Statistics
    fetchOverallStats: () => Promise<void>;
    fetchDailyStats: (days?: number) => Promise<void>;
    fetchWeeklyStats: (weeks?: number) => Promise<void>;
    fetchMonthlyStats: (months?: number) => Promise<void>;

    // Calendar & Social
    fetchCalendar: (year: number, month: number) => Promise<void>;
    fetchLeaderboard: (limit?: number) => Promise<void>;

    // Utilities
    clearError: () => void;
    reset: () => void;
}

export const useReadingSessionStore = create<ReadingSessionState>((set, get) => ({
    // Initial state
    activeSession: null,
    sessionStartPage: 0,
    sessionPauseCount: 0,
    sessionPauseDuration: 0,
    sessions: [],
    currentFilters: { limit: 50, offset: 0 },
    total: 0,
    hasMore: false,
    overallStats: null,
    dailyStats: [],
    weeklyStats: [],
    monthlyStats: [],
    calendarData: null,
    leaderboard: [],
    isLoading: false,
    isLoadingMore: false,
    isStartingSession: false,
    isEndingSession: false,
    isLoadingStats: false,
    error: null,

    // Start a new reading session
    startSession: async (bookId, bookshelfItemId, startPage) => {
        set({ isStartingSession: true, error: null });

        try {
            console.log('[startSession] Sending payload:', {
                bookId,
                bookshelfItemId,
                startPage,
                deviceType: 'mobile',
            });

            const response = await readingSessionApi.startSession({
                bookId,
                bookshelfItemId,
                startPage,
                deviceType: 'mobile',
            });

            set({
                activeSession: response.data,
                sessionStartPage: startPage,
                sessionPauseCount: 0,
                sessionPauseDuration: 0,
                isStartingSession: false,
            });

            return true;
        } catch (error: any) {
            console.error('Error starting session:', error);
            const validationDetails = error.details || error.response?.data?.details;

            if (validationDetails) {
                console.error('[startSession] Validation details:', JSON.stringify(validationDetails, null, 2));
            }
            set({
                error: error.response?.data?.message || error.message || 'Failed to start reading session',
                isStartingSession: false,
            });
            return false;
        }
    },

    // End active reading session
    endSession: async (endPage) => {
        const { activeSession, sessionPauseCount, sessionPauseDuration } = get();

        if (!activeSession) {
            set({ error: 'No active session to end' });
            return { success: false };
        }

        set({ isEndingSession: true, error: null });

        try {
            const response = await readingSessionApi.endSession(
                activeSession._id,
                endPage,
                sessionPauseCount,
                sessionPauseDuration > 0 ? sessionPauseDuration / sessionPauseCount : 0
            );

            // Add completed session to history
            set(state => ({
                activeSession: null,
                sessionStartPage: 0,
                sessionPauseCount: 0,
                sessionPauseDuration: 0,
                sessions: [response.data, ...state.sessions],
                isEndingSession: false,
            }));

            // Refresh stats
            get().fetchOverallStats();
            get().fetchDailyStats();

            return {
                success: true,
                inkDropsEarned: response.inkDropsEarned,
            };
        } catch (error: any) {
            console.error('Error ending session:', error);
            set({
                error: error.message || 'Failed to end reading session',
                isEndingSession: false,
            });
            return { success: false };
        }
    },

    // Create manual session (for imports or manual tracking)
    createManualSession: async (params) => {
        set({ isLoading: true, error: null });

        try {
            const response = await readingSessionApi.createManualSession(params);

            // Add to sessions list
            set(state => ({
                sessions: [response.data, ...state.sessions],
                isLoading: false,
            }));

            // Refresh stats
            get().fetchOverallStats();

            return true;
        } catch (error: any) {
            console.error('Error creating manual session:', error);
            set({
                error: error.message || 'Failed to create session',
                isLoading: false,
            });
            return false;
        }
    },

    // Record pause (for focus score calculation)
    recordPause: (duration) => {
        set(state => ({
            sessionPauseCount: state.sessionPauseCount + 1,
            sessionPauseDuration: state.sessionPauseDuration + duration,
        }));
    },

    // Fetch session history
    fetchSessions: async (filters = {}, append = false) => {
        const state = get();

        if (append) {
            set({ isLoadingMore: true, error: null });
        } else {
            set({ isLoading: true, error: null, sessions: [] });
        }

        try {
            const mergedFilters = { ...state.currentFilters, ...filters };
            const response = await readingSessionApi.getSessions(mergedFilters);

            set({
                sessions: append ? [...state.sessions, ...response.data] : response.data,
                total: response.pagination.total,
                hasMore: response.pagination.hasMore,
                currentFilters: mergedFilters,
                isLoading: false,
                isLoadingMore: false,
            });
        } catch (error: any) {
            console.error('Error fetching sessions:', error);
            set({
                error: error.message || 'Failed to load sessions',
                isLoading: false,
                isLoadingMore: false,
            });
        }
    },

    // Load more sessions (pagination)
    loadMore: async () => {
        const { hasMore, currentFilters, isLoadingMore } = get();

        if (!hasMore || isLoadingMore) return;

        const nextOffset = (currentFilters.offset || 0) + (currentFilters.limit || 50);
        await get().fetchSessions({ ...currentFilters, offset: nextOffset }, true);
    },

    // Fetch overall statistics
    fetchOverallStats: async () => {
        set({ isLoadingStats: true, error: null });

        try {
            const response = await readingSessionApi.getOverallStats();
            set({ overallStats: response.data, isLoadingStats: false });
        } catch (error: any) {
            console.error('Error fetching overall stats:', error);
            set({
                error: error.message || 'Failed to load statistics',
                isLoadingStats: false,
            });
        }
    },

    // Fetch daily statistics
    fetchDailyStats: async (days = 30) => {
        set({ isLoadingStats: true, error: null });

        try {
            const response = await readingSessionApi.getDailyStats(days);
            set({ dailyStats: response.data, isLoadingStats: false });
        } catch (error: any) {
            console.error('Error fetching daily stats:', error);
            set({
                error: error.message || 'Failed to load daily statistics',
                isLoadingStats: false,
            });
        }
    },

    // Fetch weekly statistics
    fetchWeeklyStats: async (weeks = 12) => {
        set({ isLoadingStats: true, error: null });

        try {
            const response = await readingSessionApi.getWeeklyStats(weeks);
            set({ weeklyStats: response.data, isLoadingStats: false });
        } catch (error: any) {
            console.error('Error fetching weekly stats:', error);
            set({
                error: error.message || 'Failed to load weekly statistics',
                isLoadingStats: false,
            });
        }
    },

    // Fetch monthly statistics
    fetchMonthlyStats: async (months = 12) => {
        set({ isLoadingStats: true, error: null });

        try {
            const response = await readingSessionApi.getMonthlyStats(months);
            set({ monthlyStats: response.data, isLoadingStats: false });
        } catch (error: any) {
            console.error('Error fetching monthly stats:', error);
            set({
                error: error.message || 'Failed to load monthly statistics',
                isLoadingStats: false,
            });
        }
    },

    // Fetch calendar data for streak visualization
    fetchCalendar: async (year, month) => {
        set({ isLoading: true, error: null });

        try {
            const response = await readingSessionApi.getCalendar(year, month);
            set({ calendarData: response.data, isLoading: false });
        } catch (error: any) {
            console.error('Error fetching calendar:', error);
            set({
                error: error.message || 'Failed to load calendar',
                isLoading: false,
            });
        }
    },

    // Fetch reading leaderboard
    fetchLeaderboard: async (limit = 50) => {
        set({ isLoading: true, error: null });

        try {
            const response = await readingSessionApi.getLeaderboard(limit);
            set({ leaderboard: response.data, isLoading: false });
        } catch (error: any) {
            console.error('Error fetching leaderboard:', error);
            set({
                error: error.message || 'Failed to load leaderboard',
                isLoading: false,
            });
        }
    },

    // Clear error
    clearError: () => set({ error: null }),

    // Reset store
    reset: () => set({
        activeSession: null,
        sessionStartPage: 0,
        sessionPauseCount: 0,
        sessionPauseDuration: 0,
        sessions: [],
        currentFilters: { limit: 50, offset: 0 },
        total: 0,
        hasMore: false,
        overallStats: null,
        dailyStats: [],
        weeklyStats: [],
        monthlyStats: [],
        calendarData: null,
        leaderboard: [],
        isLoading: false,
        isLoadingMore: false,
        isStartingSession: false,
        isEndingSession: false,
        isLoadingStats: false,
        error: null,
    }),
}));
