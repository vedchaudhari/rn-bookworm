// mobile/lib/api/streakApi.ts
import { API_URL } from '../../constants/api';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastCheckIn: string;
    canRestore: boolean;
    milestones: {
        day7: { achieved: boolean; date: string | null };
        day30: { achieved: boolean; date: string | null };
        day100: { achieved: boolean; date: string | null };
        day365: { achieved: boolean; date: string | null };
    };
    totalCheckIns: number;
    currentStreakStartDate: string;
}

export interface CheckInResult {
    success: boolean;
    streakCount: number;
    isFirstCheckInToday: boolean;
    inkDropsEarned: number;
    milestoneAchieved: string | null;
}

export interface DailyChallenge {
    type: string;
    description: string;
    targetCount: number;
    currentProgress: number;
    rewardInkDrops: number;
    expiresAt: string;
    completed: boolean;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    profileImage: string;
    streakCount: number;
    isCurrentUser: boolean;
}

export interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    currentUserRank: number | null;
}

class StreakApi {
    private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
        // Use Zustand store instead of global variable
        const token = require('../../store/authContext').useAuthStore.getState().token;

        if (!token) {
            console.log('[StreakApi] No token found in store');
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

            // Handle 401 specifically
            if (response.status === 401) {
                // Optional: trigger logout here
                console.log('[StreakApi] 401 Unauthorized');
            }

            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    async getMyStreak(): Promise<StreakData> {
        return this.fetchWithAuth('/api/streaks/my-streak');
    }

    async checkIn(): Promise<CheckInResult> {
        return this.fetchWithAuth('/api/streaks/check-in', {
            method: 'POST',
        });
    }

    async restoreStreak(): Promise<{ success: boolean; newStreakCount: number; inkDropsDeducted: number }> {
        return this.fetchWithAuth('/api/streaks/restore', {
            method: 'POST',
        });
    }

    async getLeaderboard(
        period: 'global' | 'monthly' = 'global',
        limit: number = 50,
        offset: number = 0
    ): Promise<LeaderboardResponse> {
        return this.fetchWithAuth(
            `/api/streaks/leaderboard?period=${period}&limit=${limit}&offset=${offset}`
        );
    }

    async getTodayChallenge(): Promise<{ challenge: DailyChallenge | null }> {
        return this.fetchWithAuth('/api/challenges/today');
    }
}

export const streakApi = new StreakApi();
export default streakApi;
