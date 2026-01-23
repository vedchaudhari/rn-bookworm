// backend/src/routes/challengeRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import DailyChallenge, { ChallengeType } from '../models/DailyChallenge';
import { addInkDrops } from '../services/inkDropService';

const router = Router();

/**
 * Challenge rewards based on type
 */
const CHALLENGE_REWARDS: Record<ChallengeType, { target: number; reward: number }> = {
    'read_posts': { target: 5, reward: 10 },
    'like_posts': { target: 10, reward: 15 },
    'comment': { target: 3, reward: 20 },
    'recommend_book': { target: 1, reward: 50 }
};

/**
 * GET /api/challenges/today
 * Get today's challenge for user
 */
router.get('/today', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        let challenge = await DailyChallenge.findOne({
            userId,
            challengeDate: today
        });

        // Generate challenge if doesn't exist
        if (!challenge) {
            challenge = await generateDailyChallengeForUser(userId, today);
        }

        // Check if expired
        if (challenge && challenge.isExpired() && challenge.status === 'active') {
            challenge.status = 'expired';
            await challenge.save();
        }

        if (!challenge) {
            return res.json({ challenge: null });
        }

        res.json({
            challenge: {
                type: challenge.challengeType,
                description: getChallengeDescription(challenge.challengeType, challenge.targetCount),
                targetCount: challenge.targetCount,
                currentProgress: challenge.currentProgress,
                rewardInkDrops: challenge.rewardInkDrops,
                expiresAt: challenge.expiresAt.toISOString(),
                completed: challenge.status === 'completed'
            }
        });
    } catch (error: any) {
        console.error('Error fetching daily challenge:', error);
        res.status(500).json({ error: 'Failed to fetch challenge' });
    }
});

/**
 * POST /api/challenges/track-progress
 * Track progress on challenge (internal use - called from other services)
 */
router.post('/track-progress', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const { actionType } = req.body as { actionType: ChallengeType };

        if (!actionType) {
            return res.status(400).json({ error: 'actionType is required' });
        }

        const today = new Date().toISOString().split('T')[0];

        const challenge = await DailyChallenge.findOne({
            userId,
            challengeDate: today,
            challengeType: actionType,
            status: 'active'
        });

        if (!challenge) {
            return res.json({
                progressUpdated: false,
                message: 'No active challenge for this action'
            });
        }

        const wasCompleted = await challenge.updateProgress(1);

        let inkDropsEarned = 0;

        // Award Ink Drops if just completed
        if (wasCompleted) {
            inkDropsEarned = challenge.rewardInkDrops;
            await addInkDrops(userId, inkDropsEarned, 'challenge_completed');
        }

        res.json({
            progressUpdated: true,
            currentProgress: challenge.currentProgress,
            challengeCompleted: wasCompleted,
            inkDropsEarned
        });
    } catch (error: any) {
        console.error('Error tracking challenge progress:', error);
        res.status(500).json({ error: 'Failed to track progress' });
    }
});

/**
 * Helper: Generate daily challenge for user
 */
async function generateDailyChallengeForUser(userId: string, date: string): Promise<any> {
    const isPro = false; // TODO: Get from user object

    // Select challenge type (rotate based on user ID for variety)
    const challengeTypes: ChallengeType[] = ['read_posts', 'like_posts', 'comment', 'recommend_book'];
    const userIdHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const typeIndex = userIdHash % challengeTypes.length;
    const challengeType = challengeTypes[typeIndex];

    const challengeConfig = CHALLENGE_REWARDS[challengeType];

    // Pro users can have 3 challenges, free users only 1
    // For MVP, just create 1 challenge for all users

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const challenge = await DailyChallenge.create({
        userId,
        challengeType,
        targetCount: challengeConfig.target,
        currentProgress: 0,
        rewardInkDrops: isPro ? Math.floor(challengeConfig.reward * 1.5) : challengeConfig.reward,
        status: 'active',
        challengeDate: date,
        expiresAt: endOfDay
    });

    return challenge;
}

/**
 * Helper: Get human-readable challenge description
 */
function getChallengeDescription(type: ChallengeType, count: number): string {
    const descriptions: Record<ChallengeType, string> = {
        'read_posts': `Read ${count} book posts`,
        'like_posts': `Like ${count} book recommendations`,
        'comment': `Leave ${count} comments`,
        'recommend_book': `Recommend ${count} book`
    };

    return descriptions[type];
}

export default router;
