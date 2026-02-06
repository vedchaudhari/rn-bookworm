import UserStreak, { IUserStreakDocument } from '../models/UserStreak';
import User from '../models/User';
import DailyChallenge from '../models/DailyChallenge';
import { addInkDrops } from './inkDropService';
import { toObjectId } from '../lib/objectId';
import mongoose from 'mongoose';

interface StreakUpdateResult {
    streak: IUserStreakDocument;
    isFirstCheckInToday: boolean;
    inkDropsEarned: number;
    milestoneAchieved: string | null;
}

interface MilestoneReward {
    day: number;
    reward: number;
    badge: string;
}

const MILESTONES: MilestoneReward[] = [
    { day: 7, reward: 50, badge: 'One Week Warrior' },
    { day: 30, reward: 200, badge: 'Monthly Master' },
    { day: 100, reward: 1000, badge: 'Century Streak' },
    { day: 365, reward: 5000, badge: 'Yearly Legend' }
];

export class StreakService {
    /**
     * Get or create user streak
     */
    static async getOrCreateStreak(userId: string): Promise<IUserStreakDocument> {
        let streak = await UserStreak.findOne({ userId: toObjectId(userId) });

        if (!streak) {
            streak = await UserStreak.create({
                userId: toObjectId(userId),
                currentStreak: 0, // Start at 0
                currentStreakStartDate: new Date(),
                lastCheckInDate: new Date(0), // Epoch start (never checked in)
                lastCheckInTimestamp: new Date(0),
                longestStreak: 0,
                longestStreakStartDate: new Date(),
                totalCheckIns: 0,
                streakRestoresUsed: 0,
                canRestoreStreak: false
            });
        } else {
            // Check for broken streaks upon retrieval
            // This ensures the UI receives the correct "broken" state even if checkIn hasn't been called
            await this.maintainStreakState(streak);
        }

        return streak;
    }

    /**
     * Daily check-in (idempotent)
     */
    static async checkIn(userId: string, isPro: boolean = false): Promise<StreakUpdateResult> {
        // use getOrCreateStreak to ensure we have the up-to-date state (including any broken status)
        const streak = await this.getOrCreateStreak(userId);
        const now = new Date();

        // Already checked in today
        if (streak.hasCheckedInToday()) {
            return {
                streak,
                isFirstCheckInToday: false,
                inkDropsEarned: 0,
                milestoneAchieved: null
            };
        }

        let inkDropsEarned = 0;
        let milestoneAchieved: string | null = null;
        let isStreakRestored = false;

        // At this point, streak.currentStreak is 0 if broken/new, or N if active (checked in yesterday)
        // If it WAS broken, getOrCreateStreak -> maintainStreakState would have set it to 0.

        // Logic to determine if we are continuing or starting over
        if (streak.isStreakActive()) {
            // Checked in yesterday (or today, but we handled today above)
            streak.currentStreak += 1;
            streak.lastCheckInDate = now;
            streak.lastCheckInTimestamp = now;

            // Update longest if exceeded
            if (streak.currentStreak > streak.longestStreak) {
                streak.longestStreak = streak.currentStreak;
                streak.longestStreakEndDate = now;
            }
        } else {
            // Streak is broken or new
            // currentStreak should be 0 here because of maintainStreakState

            // If strictly following logic, we reset to 1
            streak.currentStreak = 1;
            streak.currentStreakStartDate = now;
            streak.lastCheckInDate = now;
            streak.lastCheckInTimestamp = now;

            // Update longest if exceeded (important for first-time streaks or if longest was 0)
            if (streak.currentStreak > streak.longestStreak) {
                streak.longestStreak = streak.currentStreak;
                streak.longestStreakEndDate = now;
            }
        }

        streak.totalCheckIns += 1;

        // Check for milestone achievements
        const milestone = await this.checkMilestone(streak, userId, isPro);
        if (milestone) {
            inkDropsEarned += milestone.reward;
            milestoneAchieved = milestone.badge;
        }

        // Base check-in reward
        const baseReward = this.calculateCheckInReward(streak.currentStreak, isPro);
        inkDropsEarned += baseReward;

        await streak.save();

        // Sync to User model
        await User.findByIdAndUpdate(userId, {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak
        });



        // Award Ink Drops
        if (inkDropsEarned > 0) {
            await addInkDrops(userId, inkDropsEarned, 'streak_check_in');
        }

        return {
            streak,
            isFirstCheckInToday: true,
            inkDropsEarned,
            milestoneAchieved
        };
    }

    /**
     * Internal helper to handle broken streaks on read
     * This ensures the user sees "Streak 0" or "Restore Streak" immediately
     */
    private static async maintainStreakState(streak: IUserStreakDocument): Promise<void> {
        // If streak is already 0, nothing to break
        if (streak.currentStreak <= 0) return;

        // If today is checked in, status is fine
        if (streak.hasCheckedInToday()) return;

        // If yesterday was checked in, status is active.
        if (streak.isStreakActive()) return;

        // If we get here, the streak is broken (last checkin was < yesterday)
        // We must mark it as broken.



        // If it was a meaningful streak, allow restore
        if (streak.currentStreak > 0) {
            streak.lastBreakDate = new Date();
            streak.canRestoreStreak = true;
        }

        streak.currentStreak = 0;

        // We do strictly save here to ensure other clients see the update
        await streak.save();

        // Sync to User
        await User.findByIdAndUpdate(streak.userId, {
            currentStreak: 0
        });
    }

    /**
     * Restore broken streak (costs Ink Drops)
     */
    static async restoreStreak(userId: string): Promise<IUserStreakDocument> {
        const streak = await this.getOrCreateStreak(userId);

        if (!streak.canRestoreStreak) {
            throw new Error('ALREADY_RESTORED');
        }

        if (streak.isStreakActive()) {
            throw new Error('NO_BROKEN_STREAK');
        }

        // Calculate restore cost (increases with each use)
        const baseCost = 200;
        const restoreCost = baseCost * Math.pow(2.5, streak.streakRestoresUsed);

        // Deduct Ink Drops (will throw if insufficient)
        await addInkDrops(userId, -restoreCost, 'streak_restore');

        // Restore streak to previous value
        streak.currentStreak = streak.longestStreak;
        streak.currentStreakStartDate = new Date();
        streak.lastCheckInDate = new Date();
        streak.lastCheckInTimestamp = new Date();
        streak.canRestoreStreak = false;
        streak.streakRestoresUsed = (streak.streakRestoresUsed || 0) + 1;

        await streak.save();

        // Sync to User model
        await User.findByIdAndUpdate(userId, {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak
        });

        return streak;
    }

    /**
     * Get leaderboard
     */
    static async getLeaderboard(period: 'global' | 'monthly', limit: number = 50, offset: number = 0) {
        const query = period === 'monthly'
            ? { lastCheckInDate: { $gte: this.getMonthStart() } }
            : {};

        const leaderboard = await UserStreak.find(query)
            .sort({ currentStreak: -1 })
            .skip(offset)
            .limit(limit)
            .populate('userId', 'username profileImage')
            .lean();

        return leaderboard;
    }

    /**
     * Check and award milestone if achieved
     */
    private static async checkMilestone(
        streak: IUserStreakDocument,
        userId: string,
        isPro: boolean
    ): Promise<MilestoneReward | null> {
        const milestone = MILESTONES.find(m => m.day === streak.currentStreak);

        if (!milestone) return null;

        // Check if already achieved
        const milestoneKey = `day${milestone.day}` as keyof typeof streak.milestones;
        if (streak.milestones[milestoneKey].achieved) {
            return null;
        }

        // Mark as achieved
        if (!streak.milestones) {
            (streak as any).milestones = {
                day7: { achieved: false, date: null },
                day30: { achieved: false, date: null },
                day100: { achieved: false, date: null },
                day365: { achieved: false, date: null }
            };
        }

        streak.milestones[milestoneKey].achieved = true;
        streak.milestones[milestoneKey].date = new Date();
        streak.markModified('milestones');

        // Pro users get 1.5x bonus
        const reward = isPro ? Math.floor(milestone.reward * 1.5) : milestone.reward;

        return {
            ...milestone,
            reward
        };
    }

    /**
     * Calculate check-in Ink Drops reward
     */
    private static calculateCheckInReward(streak: number, isPro: boolean): number {
        let baseReward = 5;

        // Streak bonuses
        if (streak >= 7) baseReward += 5;   // Week bonus
        if (streak >= 30) baseReward += 10; // Month bonus
        if (streak >= 100) baseReward += 20; // Century bonus

        // Pro multiplier
        if (isPro) {
            baseReward = Math.floor(baseReward * 1.5);
        }

        return baseReward;
    }

    /**
     * Helper: Get UTC date string YYYY-MM-DD
     */
    private static getUTCDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Helper: Get start of current month
     */
    private static getMonthStart(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
}

export default StreakService;
