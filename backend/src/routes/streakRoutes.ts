// backend/src/routes/streak Routes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import StreakService from '../services/streakService';
import DailyChallenge from '../models/DailyChallenge';
import { addInkDrops } from '../services/inkDropService';
import { getSignedUrlForFile } from '../lib/s3';

const router = Router();

/**
 * GET /api/streaks/my-streak
 * Get current user's streak data
 */
router.get('/my-streak', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString();
        if (!userId) {
            console.error(`[Streaks] User ID missing in /my-streak: user=${JSON.stringify((req as any).user)}`);
            return res.status(401).json({ error: "User not authenticated correctly" });
        }

        const streak = await StreakService.getOrCreateStreak(userId);

        res.json({
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastCheckIn: streak.lastCheckInDate.toISOString(),
            canRestore: streak.canRestoreStreak,
            milestones: {
                day7: streak.milestones.day7,
                day30: streak.milestones.day30,
                day100: streak.milestones.day100,
                day365: streak.milestones.day365
            },
            totalCheckIns: streak.totalCheckIns,
            currentStreakStartDate: streak.currentStreakStartDate.toISOString()
        });
    } catch (error: any) {
        console.error('Error fetching streak:', error);
        res.status(500).json({ error: 'Failed to fetch streak data' });
    }
});

/**
 * POST /api/streaks/check-in
 * Daily check-in (idempotent)
 */
router.post('/check-in', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    try {
        if (!userId) {
            console.error(`[Streaks] User ID missing in /check-in: user=${JSON.stringify((req as any).user)}`);
            return res.status(401).json({ error: "User not authenticated correctly" });
        }
        const isPro = (req as any).user.isPro || false;

        // Rate limiting check (simple in-memory, use Redis in production)
        // TODO: Implement proper rate limiting with Redis

        const result = await StreakService.checkIn(userId, isPro);

        res.json({
            success: true,
            streakCount: result.streak.currentStreak,
            isFirstCheckInToday: result.isFirstCheckInToday,
            inkDropsEarned: result.inkDropsEarned,
            milestoneAchieved: result.milestoneAchieved
        });
    } catch (error: any) {
        console.error(`[Streaks] Error during check-in for user ${userId || 'unknown'}:`, {
            message: error.message,
            stack: error.stack,
            userId
        });
        res.status(500).json({
            error: 'Failed to complete check-in',
            message: error.message // Include message for easier debugging in dev
        });
    }
});

/**
 * POST /api/streaks/restore
 * Restore broken streak (costs Ink Drops)
 */
router.post('/restore', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();

        const streak = await StreakService.restoreStreak(userId);

        res.json({
            success: true,
            newStreakCount: streak.currentStreak,
            inkDropsDeducted: 200 // Base cost, should calculate dynamically
        });
    } catch (error: any) {
        console.error('Error restoring streak:', error);

        if (error.message === 'ALREADY_RESTORED') {
            return res.status(400).json({
                error: 'ALREADY_RESTORED',
                message: 'You can only restore your streak once per break'
            });
        }

        if (error.message === 'NO_BROKEN_STREAK') {
            return res.status(400).json({
                error: 'NO_BROKEN_STREAK',
                message: 'Your streak is still active'
            });
        }

        if (error.message === 'INSUFFICIENT_INK_DROPS') {
            return res.status(400).json({
                error: 'INSUFFICIENT_INK_DROPS',
                message: 'You need 200 Ink Drops to restore your streak'
            });
        }

        res.status(500).json({ error: 'Failed to restore streak' });
    }
});

/**
 * GET /api/streaks/leaderboard
 * Get top streaks (global or monthly)
 */
router.get('/leaderboard', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString();
        if (!userId) {
            console.error(`[Streaks] User ID missing in request: user=${JSON.stringify((req as any).user)}`);
            return res.status(401).json({ error: "User not authenticated correctly" });
        }
        const period = (req.query.period as 'global' | 'monthly') || 'global';
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const leaderboard = await StreakService.getLeaderboard(period, limit, offset);

        // Find current user's rank
        const currentUserStreak = await StreakService.getOrCreateStreak(userId);
        const allStreaks = await StreakService.getLeaderboard(period, 10000, 0); // Get all for ranking
        const currentUserRank = allStreaks.findIndex((s: any) => s.userId._id.toString() === userId) + 1;

        const formattedLeaderboard = await Promise.all(leaderboard.map(async (entry: any, index) => ({
            rank: offset + index + 1,
            userId: entry.userId._id.toString(),
            username: entry.userId.username,
            profileImage: await getSignedUrlForFile(entry.userId.profileImage),
            streakCount: entry.currentStreak,
            isCurrentUser: entry.userId._id.toString() === userId
        })));

        res.json({
            leaderboard: formattedLeaderboard,
            currentUserRank: currentUserRank || null
        });
    } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
