import express, { Request, Response } from 'express';
import protectRoute from '../middleware/auth.middleware';
import User from '../models/User';
import { addInkDrops, getInkDropsBalance } from '../services/inkDropService';
import { toObjectId } from '../lib/objectId';

const router = express.Router();

/**
 * @route GET /api/currency/balance
 * @desc Get user's Ink Drop balance
 * @access Private
 */
router.get('/balance', protectRoute, async (req: Request, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            console.error(`[Currency] User or _id missing in request: user=${JSON.stringify(req.user)}`);
            return res.status(401).json({ success: false, message: "User not authenticated correctly" });
        }
        const balance = await getInkDropsBalance(req.user._id.toString());
        res.json({ success: true, balance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route GET /api/currency/transactions
 * @desc Get user's transaction history
 * @access Private
 */
router.get('/transactions', protectRoute, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).select('inkDropTransactions');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Sort transactions by date descending
        const transactions = (user.inkDropTransactions || []).sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        res.json({ success: true, transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route GET /api/currency/rewards-history
 * @desc Get user's rewards history (earned Ink Drops from various sources)
 * @access Private
 */
router.get('/rewards-history', protectRoute, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).select('inkDropTransactions');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Filter only positive transactions (rewards earned, not spent)
        const rewards = (user.inkDropTransactions || [])
            .filter(tx => tx.amount > 0)
            .map(tx => ({
                amount: tx.amount,
                type: tx.source,
                description: getRewardDescription(tx.source, tx.amount),
                date: tx.timestamp
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate totals by category
        const totals = {
            streak: 0,
            challenge: 0,
            reading: 0,
            purchase: 0,
            tip: 0,
            admin: 0
        };

        rewards.forEach(reward => {
            if (reward.type === 'streak_check_in') totals.streak += reward.amount;
            else if (reward.type === 'challenge_completed') totals.challenge += reward.amount;
            else if (reward.type === 'reading_session') totals.reading += reward.amount;
            else if (reward.type === 'purchase') totals.purchase += reward.amount;
            else if (reward.type === 'tip_received') totals.tip += reward.amount;
            else if (reward.type === 'admin_grant') totals.admin += reward.amount;
        });

        res.json({
            success: true,
            data: {
                total: rewards.reduce((sum, r) => sum + r.amount, 0),
                rewards,
                totals
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Helper function to generate user-friendly reward descriptions
 */
function getRewardDescription(source: string, amount: number): string {
    switch (source) {
        case 'streak_check_in':
            return `Daily streak check-in reward`;
        case 'challenge_completed':
            return `Challenge completed`;
        case 'reading_session':
            return `Reading session reward`;
        case 'purchase':
            return `Purchased ${amount} Ink Drops`;
        case 'tip_received':
            return `Tip from a reader`;
        case 'admin_grant':
            return `Bonus reward`;
        default:
            return `Earned ${amount} Ink Drops`;
    }
}


/**
 * @route POST /api/currency/purchase
 * @desc Record a purchase of Ink Drops (In-App Purchase)
 * @access Private
 */
router.post('/purchase', protectRoute, async (req: Request, res: Response) => {
    try {
        const { productId, amount, price } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        // TODO: In a real app, verify the IAP receipt with Apple/Google here

        const newBalance = await addInkDrops(
            req.user!._id.toString(),
            amount,
            'purchase'
        );

        res.json({
            success: true,
            message: 'Purchase recorded successfully',
            balance: newBalance
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route POST /api/currency/tip
 * @desc Send a tip to an author
 * @access Private
 */
router.post('/tip', protectRoute, async (req: Request, res: Response) => {
    try {
        const { recipientUserId, amount } = req.body;
        const senderId = req.user!._id;

        if (!recipientUserId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid recipient or amount' });
        }

        if (senderId.toString() === recipientUserId.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot tip yourself' });
        }

        // 1. Deduct from sender
        let senderBalance: number;
        try {
            senderBalance = await addInkDrops(
                senderId.toString(),
                -amount,
                'admin_grant' // We'll use a specific type or just handle it here
            );

            // Overwrite the transaction source to 'tip_sent'
            const sender = await User.findById(senderId);
            if (sender && sender.inkDropTransactions.length > 0) {
                const lastTx = sender.inkDropTransactions[sender.inkDropTransactions.length - 1];
                lastTx.source = 'tip_sent' as any;
                (lastTx as any).recipientId = toObjectId(recipientUserId);
                await sender.save();
            }
        } catch (error: any) {
            if (error.message === 'INSUFFICIENT_INK_DROPS') {
                return res.status(400).json({ success: false, message: 'Insufficient Ink Drops' });
            }
            throw error;
        }

        // 2. Calculate service fee (25% as per monetization.ts)
        const SERVICE_FEE_PERCENT = 25;
        const serviceFee = Math.floor(amount * (SERVICE_FEE_PERCENT / 100));
        const authorReceived = amount - serviceFee;

        // 3. Add to recipient
        const recipientNewBalance = await addInkDrops(
            recipientUserId,
            authorReceived,
            'admin_grant' // Placeholder
        );

        // Overwrite the transaction source for recipient
        const recipient = await User.findById(toObjectId(recipientUserId));
        if (recipient && recipient.inkDropTransactions.length > 0) {
            const lastTx = recipient.inkDropTransactions[recipient.inkDropTransactions.length - 1];
            lastTx.source = 'tip_received' as any;
            (lastTx as any).senderId = senderId;
            await recipient.save();
        }

        // Get the transaction object to return to frontend
        const senderUpdated = await User.findById(senderId);
        const transaction = senderUpdated?.inkDropTransactions[senderUpdated.inkDropTransactions.length - 1];

        res.json({
            success: true,
            senderBalance,
            serviceFee,
            authorReceived,
            transaction
        });
    } catch (error: any) {
        console.error('Tip error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
