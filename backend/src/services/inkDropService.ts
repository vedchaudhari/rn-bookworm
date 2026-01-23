import User from '../models/User';
import { toObjectId } from '../lib/objectId';
import mongoose from 'mongoose';

export type InkDropSource =
    | 'streak_check_in'
    | 'streak_restore'
    | 'challenge_completed'
    | 'milestone_achieved'
    | 'referral_bonus'
    | 'purchase'
    | 'tip_sent'
    | 'tip_received'
    | 'admin_grant';

interface InkDropTransaction {
    amount: number;
    source: InkDropSource;
    timestamp: Date;
    recipientId?: mongoose.Types.ObjectId;
    senderId?: mongoose.Types.ObjectId;
}

/**
 * Add or deduct Ink Drops from user balance
 * @param userId - User ID
 * @param amount - Positive to add, negative to deduct
 * @param source - Source of transaction
 * @returns New balance
 */
export async function addInkDrops(
    userId: string,
    amount: number,
    source: InkDropSource
): Promise<number> {
    const user = await User.findById(toObjectId(userId));

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    // Initialize inkDrops if not exists
    if (typeof user.inkDrops !== 'number') {
        user.inkDrops = 0;
    }

    const newBalance = user.inkDrops + amount;

    // Prevent negative balance
    if (newBalance < 0) {
        throw new Error('INSUFFICIENT_INK_DROPS');
    }

    user.inkDrops = newBalance;

    // Log transaction
    if (!user.inkDropTransactions) {
        user.inkDropTransactions = [];
    }

    user.inkDropTransactions.push({
        amount,
        source,
        timestamp: new Date()
    } as any);

    await user.save();

    return newBalance;
}

/**
 * Get user Ink Drops balance
 */
export async function getInkDropsBalance(userId: string): Promise<number> {
    const user = await User.findById(toObjectId(userId));

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    return user.inkDrops || 0;
}

export default {
    addInkDrops,
    getInkDropsBalance
};
