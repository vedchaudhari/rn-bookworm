// backend/src/models/DailyChallenge.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ChallengeType = 'read_posts' | 'like_posts' | 'comment' | 'recommend_book';
export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface IDailyChallengeDocument extends Document {
    userId: mongoose.Types.ObjectId;

    // Challenge definition
    challengeType: ChallengeType;
    targetCount: number;
    currentProgress: number;

    // Reward
    rewardInkDrops: number;
    rewardBadge: string | null;

    // Status
    status: ChallengeStatus;
    completedAt: Date | null;

    // Time constraints
    challengeDate: string; // YYYY-MM-DD (UTC)
    expiresAt: Date;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    updateProgress(increment?: number): Promise<boolean>;
    isExpired(): boolean;
}

const DailyChallengeSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    challengeType: {
        type: String,
        enum: ['read_posts', 'like_posts', 'comment', 'recommend_book'],
        required: true
    },
    targetCount: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    currentProgress: {
        type: Number,
        default: 0,
        min: 0
    },

    rewardInkDrops: {
        type: Number,
        required: true,
        min: 0
    },
    rewardBadge: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ['active', 'completed', 'expired'],
        default: 'active',
        index: true
    },
    completedAt: {
        type: Date,
        default: null
    },

    challengeDate: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true // For TTL and cleanup queries
    }
}, {
    timestamps: true
});

// Compound index for unique daily challenge per user
DailyChallengeSchema.index({ userId: 1, challengeDate: 1 }, { unique: true });

// Index for querying active challenges
DailyChallengeSchema.index({ userId: 1, status: 1 });

// Index for cleanup expired challenges
DailyChallengeSchema.index({ status: 1, expiresAt: 1 });

// Methods
DailyChallengeSchema.methods.updateProgress = async function (increment: number = 1): Promise<boolean> {
    if (this.status !== 'active') {
        return false;
    }

    this.currentProgress = Math.min(this.currentProgress + increment, this.targetCount);

    // Check if completed
    if (this.currentProgress >= this.targetCount && this.status === 'active') {
        this.status = 'completed';
        this.completedAt = new Date();
        return true; // Challenge completed
    }

    await this.save();
    return false;
};

DailyChallengeSchema.methods.isExpired = function (): boolean {
    return new Date() > this.expiresAt;
};

const DailyChallenge: Model<IDailyChallengeDocument> = mongoose.model<IDailyChallengeDocument>(
    'DailyChallenge',
    DailyChallengeSchema
);

export default DailyChallenge;
