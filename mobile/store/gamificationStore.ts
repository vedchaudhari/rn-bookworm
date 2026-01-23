import { create } from 'zustand';
import { API_URL } from '../constants/api';

interface Achievement {
    _id: string;
    name: string;
    description: string;
    [key: string]: any;
}

interface Stats {
    level?: number;
    points?: number;
    booksRead?: number;
    currentStreak?: number;
    longestStreak?: number;
    [key: string]: any;
}

interface Goal {
    _id: string;
    title: string;
    target: number;
    current: number;
    status: string;
    [key: string]: any;
}

interface LeaderboardEntry {
    _id: string;
    username: string;
    points: number;
    level: number;
    [key: string]: any;
}

interface GamificationState {
    achievements: Achievement[];
    stats: Stats | null;
    goals: Goal[];
    leaderboard: LeaderboardEntry[];
    fetchAchievements: (token: string) => Promise<{ success: boolean; error?: string }>;
    fetchStats: (token: string) => Promise<{ success: boolean; error?: string }>;
    fetchGoals: (token: string, status?: string) => Promise<{ success: boolean; error?: string }>;
    createGoal: (goalData: any, token: string) => Promise<{ success: boolean; goal?: Goal; error?: string }>;
    fetchLeaderboard: (token: string, period?: string) => Promise<{ success: boolean; currentUserRank?: number; error?: string }>;
    updateStreak: (token: string) => Promise<{ success: boolean; streak?: number; updated?: boolean; error?: string }>;
    reset: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
    achievements: [],
    stats: null,
    goals: [],
    leaderboard: [],

    // Fetch achievements
    fetchAchievements: async (token: string) => {
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
        } catch (error: any) {
            console.error('Error fetching achievements:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch user stats
    fetchStats: async (token: string) => {
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
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch reading goals
    fetchGoals: async (token: string, status: string = 'all') => {
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
        } catch (error: any) {
            console.error('Error fetching goals:', error);
            return { success: false, error: error.message };
        }
    },

    // Create reading goal
    createGoal: async (goalData: any, token: string) => {
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
        } catch (error: any) {
            console.error('Error creating goal:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch leaderboard
    fetchLeaderboard: async (token: string, period: string = 'all') => {
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
        } catch (error: any) {
            console.error('Error fetching leaderboard:', error);
            return { success: false, error: error.message };
        }
    },

    // Update streak
    updateStreak: async (token: string) => {
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
        } catch (error: any) {
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
