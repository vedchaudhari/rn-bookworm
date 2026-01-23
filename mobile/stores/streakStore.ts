// mobile/stores/streakStore.ts
import { create } from 'zustand';
import streakApi, { StreakData, DailyChallenge, LeaderboardEntry } from '../lib/api/streakApi';

interface StreakStore {
    // State
    streak: StreakData | null;
    todayChallenge: DailyChallenge | null;
    leaderboard: LeaderboardEntry[];
    currentUserRank: number | null;

    // Loading states
    isLoadingStreak: boolean;
    isLoadingChallenge: boolean;
    isLoadingLeaderboard: boolean;
    isCheckingIn: boolean;
    isRestoring: boolean;

    // Error states
    error: string | null;

    // Actions
    fetchStreak: () => Promise<void>;
    checkIn: () => Promise<{ success: boolean; inkDropsEarned: number; milestoneAchieved: string | null }>;
    restoreStreak: () => Promise<void>;
    fetchTodayChallenge: () => Promise<void>;
    fetchLeaderboard: (period?: 'global' | 'monthly') => Promise<void>;
    clearError: () => void;
}

export const useStreakStore = create<StreakStore>((set, get) => ({
    // Initial state
    streak: null,
    todayChallenge: null,
    leaderboard: [],
    currentUserRank: null,
    isLoadingStreak: false,
    isLoadingChallenge: false,
    isLoadingLeaderboard: false,
    isCheckingIn: false,
    isRestoring: false,
    error: null,

    // Fetch user's streak data
    fetchStreak: async () => {
        set({ isLoadingStreak: true, error: null });
        try {
            const data = await streakApi.getMyStreak();
            set({ streak: data, isLoadingStreak: false });
        } catch (error: any) {
            set({ error: error.message, isLoadingStreak: false });
            throw error;
        }
    },

    // Daily check-in
    checkIn: async () => {
        const { streak } = get();

        // Optimistic update
        if (streak) {
            set({
                isCheckingIn: true,
                streak: {
                    ...streak,
                    currentStreak: streak.currentStreak + 1,
                    lastCheckIn: new Date().toISOString(),
                },
            });
        } else {
            set({ isCheckingIn: true });
        }

        try {
            const result = await streakApi.checkIn();

            // Fetch updated streak data
            await get().fetchStreak();

            set({ isCheckingIn: false });

            return {
                success: result.success,
                inkDropsEarned: result.inkDropsEarned,
                milestoneAchieved: result.milestoneAchieved,
            };
        } catch (error: any) {
            // Revert optimistic update on error
            await get().fetchStreak();
            set({ error: error.message, isCheckingIn: false });
            throw error;
        }
    },

    // Restore broken streak
    restoreStreak: async () => {
        set({ isRestoring: true, error: null });
        try {
            await streakApi.restoreStreak();
            await get().fetchStreak(); // Refresh data
            set({ isRestoring: false });
        } catch (error: any) {
            set({ error: error.message, isRestoring: false });
            throw error;
        }
    },

    // Fetch today's challenge
    fetchTodayChallenge: async () => {
        set({ isLoadingChallenge: true, error: null });
        try {
            const { challenge } = await streakApi.getTodayChallenge();
            set({ todayChallenge: challenge, isLoadingChallenge: false });
        } catch (error: any) {
            set({ error: error.message, isLoadingChallenge: false });
            throw error;
        }
    },

    // Fetch leaderboard
    fetchLeaderboard: async (period: 'global' | 'monthly' = 'global') => {
        set({ isLoadingLeaderboard: true, error: null });
        try {
            const data = await streakApi.getLeaderboard(period, 50, 0);
            set({
                leaderboard: data.leaderboard,
                currentUserRank: data.currentUserRank,
                isLoadingLeaderboard: false,
            });
        } catch (error: any) {
            set({ error: error.message, isLoadingLeaderboard: false });
            throw error;
        }
    },

    // Clear error
    clearError: () => set({ error: null }),
}));

export default useStreakStore;
