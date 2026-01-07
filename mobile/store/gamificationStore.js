import { create } from 'zustand';
import { API_URL } from '../constants/api';

export const useGamificationStore = create((set, get) => ({
    achievements: [],
    stats: null,
    goals: [],
    leaderboard: [],

    // Fetch achievements
    fetchAchievements: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/achievements`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ achievements: data.achievements });
            return { success: true };
        } catch (error) {
            console.error('Error fetching achievements:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch user stats
    fetchStats: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ stats: data });
            return { success: true };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch reading goals
    fetchGoals: async (token, status = 'all') => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/goals?status=${status}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ goals: data.goals });
            return { success: true };
        } catch (error) {
            console.error('Error fetching goals:', error);
            return { success: false, error: error.message };
        }
    },

    // Create reading goal
    createGoal: async (goalData, token) => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/goal`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goalData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const { goals } = get();
            set({ goals: [data, ...goals] });

            return { success: true, goal: data };
        } catch (error) {
            console.error('Error creating goal:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch leaderboard
    fetchLeaderboard: async (token, period = 'all') => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/leaderboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ leaderboard: data.leaderboard });
            return { success: true, currentUserRank: data.currentUserRank };
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return { success: false, error: error.message };
        }
    },

    // Update streak
    updateStreak: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/gamification/update-streak`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            return { success: true, streak: data.streak, updated: data.updated };
        } catch (error) {
            console.error('Error updating streak:', error);
            return { success: false, error: error.message };
        }
    },

    // Reset store
    reset: () => {
        set({
            achievements: [],
            stats: null,
            goals: [],
            leaderboard: [],
        });
    },
}));
