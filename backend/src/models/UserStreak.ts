// backend/src/models/UserStreak.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMilestone {
    achieved: boolean;
    date: Date | null;
}



export interface IUserStreakMethods {
    isStreakActive(): boolean;
    hasCheckedInToday(): boolean;
}

export interface IUserStreakDocument extends Document, IUserStreakMethods {
    userId: mongoose.Types.ObjectId;

    // Current streak data
    currentStreak: number;
    currentStreakStartDate: Date;
    lastCheckInDate: Date;
    lastCheckInTimestamp: Date;

    // Historical data
    longestStreak: number;
    longestStreakStartDate: Date;
    longestStreakEndDate: Date | null;
    totalCheckIns: number;

    // Restoration
    streakRestoresUsed: number;
    canRestoreStreak: boolean;
    lastBreakDate: Date | null;

    // Milestones
    milestones: {
        day7: IMilestone;
        day30: IMilestone;
        day100: IMilestone;
        day365: IMilestone;
    };

    createdAt: Date;
    updatedAt: Date;
}

const MilestoneSchema = new Schema({
    achieved: { type: Boolean, default: false },
    date: { type: Date, default: null }
}, { _id: false });

const UserStreakSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    // Current streak data
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    currentStreakStartDate: {
        type: Date,
        default: Date.now
    },
    lastCheckInDate: {
        type: Date,
        default: Date.now
    },
    lastCheckInTimestamp: {
        type: Date,
        default: Date.now
    },

    // Historical data
    longestStreak: {
        type: Number,
        default: 1,
        min: 0
    },
    longestStreakStartDate: {
        type: Date,
        default: Date.now
    },
    longestStreakEndDate: {
        type: Date,
        default: null
    },
    totalCheckIns: {
        type: Number,
        default: 0,
        min: 0
    },

    // Restoration
    streakRestoresUsed: {
        type: Number,
        default: 0,
        min: 0
    },
    canRestoreStreak: {
        type: Boolean,
        default: false
    },
    lastBreakDate: {
        type: Date,
        default: null
    },

    // Milestones
    milestones: {
        day7: {
            type: MilestoneSchema,
            default: { achieved: false, date: null }
        },
        day30: {
            type: MilestoneSchema,
            default: { achieved: false, date: null }
        },
        day100: {
            type: MilestoneSchema,
            default: { achieved: false, date: null }
        },
        day365: {
            type: MilestoneSchema,
            default: { achieved: false, date: null }
        }
    }
}, {
    timestamps: true
});

// Indexes for performance
UserStreakSchema.index({ currentStreak: -1 }); // For leaderboard queries
UserStreakSchema.index({ lastCheckInDate: 1 }); // For cron jobs checking inactive users

// Methods
UserStreakSchema.methods.isStreakActive = function (): boolean {
    const now = new Date();
    const lastCheckInUTC = new Date(this.lastCheckInDate).setUTCHours(0, 0, 0, 0);
    const todayUTC = new Date(now).setUTCHours(0, 0, 0, 0);
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setDate(yesterdayUTC.getDate() - 1);

    // Streak is active if checked in today or yesterday
    return lastCheckInUTC === todayUTC || lastCheckInUTC === yesterdayUTC.getTime();
};

UserStreakSchema.methods.hasCheckedInToday = function (): boolean {
    const now = new Date();
    const lastCheckInUTC = new Date(this.lastCheckInDate).setUTCHours(0, 0, 0, 0);
    const todayUTC = new Date(now).setUTCHours(0, 0, 0, 0);

    return lastCheckInUTC === todayUTC;
};

const UserStreak = mongoose.model<IUserStreakDocument, Model<IUserStreakDocument, {}, IUserStreakMethods>>(
    'UserStreak',
    UserStreakSchema
);

export default UserStreak;
