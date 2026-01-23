// backend/src/models/ReadingSession.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * SESSION SOURCE
 * Tracks where the reading session originated
 * - manual: User manually tracked time
 * - auto: Auto-detected via app activity
 * - imported: Imported from external source (Kindle, Goodreads, etc)
 */
export type SessionSource = 'manual' | 'auto' | 'imported';

/**
 * READING SESSION DOCUMENT
 * Tracks individual reading sessions for analytics and gamification
 * Used to calculate reading speed, daily reading time, and streak validation
 */
export interface IReadingSessionMethods {
    calculateInkDrops(): number;
    isValidForStreak(): boolean;
    getStats(): any;
}

export interface IReadingSessionModel extends Model<IReadingSessionDocument, {}, IReadingSessionMethods> {
    getTotalReadingTime(userId: mongoose.Types.ObjectId, startDate: Date, endDate: Date): Promise<number>;
    getDailyStats(userId: mongoose.Types.ObjectId, days?: number): Promise<any[]>;
}

export interface IReadingSessionDocument extends Document, IReadingSessionMethods {
    // Relations
    userId: mongoose.Types.ObjectId;
    bookId: mongoose.Types.ObjectId;
    bookshelfItemId: mongoose.Types.ObjectId; // Link to BookshelfItem for fast lookup

    // Session Data
    startTime: Date;
    endTime: Date;
    duration: number; // In minutes (calculated)
    pagesRead: number; // Number of pages read during this session
    startPage: number; // Page number at start
    endPage: number; // Page number at end

    // Session Context
    source: SessionSource;
    deviceType: 'mobile' | 'tablet' | 'web' | 'unknown';
    location: string | null; // Optional: City/Country (GPS-based or manual)

    // Analytics & Gamification
    wordsRead: number; // Estimated based on pages (avg 250-300 words/page)
    readingSpeed: number; // Pages per hour during this session
    focusScore: number; // 0-100, based on session uninterrupted time

    // Streak Validation
    contributesToStreak: boolean; // True if session is valid for daily streak
    sessionDate: string; // YYYY-MM-DD (UTC) for daily aggregation

    // Monetization & Rewards
    inkDropsEarned: number; // Virtual currency earned for this session
    achievementsUnlocked: string[]; // Achievement IDs unlocked during session

    // Session Quality Metrics
    pauseCount: number; // Number of times session was paused
    averagePauseDuration: number; // Average pause length in minutes
    isCompleteSession: boolean; // False if session was interrupted/abandoned

    createdAt: Date;
    updatedAt: Date;
}

const ReadingSessionSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bookId: {
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
        index: true
    },
    bookshelfItemId: {
        type: Schema.Types.ObjectId,
        ref: 'BookshelfItem',
        required: true,
        index: true // For fast aggregation of reading time per book
    },

    // Session Data
    startTime: {
        type: Date,
        required: true,
        index: true // For time-range queries
    },
    endTime: {
        type: Date,
        required: true,
        index: true
    },
    duration: {
        type: Number,
        required: true,
        min: 0, // In minutes
        max: 1440 // Max 24 hours per session (sanity check)
    },
    pagesRead: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    startPage: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    endPage: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },

    // Session Context
    source: {
        type: String,
        enum: ['manual', 'auto', 'imported'],
        default: 'auto',
        required: true
    },
    deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'web', 'unknown'],
        default: 'unknown',
        required: true
    },
    location: {
        type: String,
        default: null,
        maxlength: 100
    },

    // Analytics & Gamification
    wordsRead: {
        type: Number,
        default: 0,
        min: 0
    },
    readingSpeed: {
        type: Number,
        default: 0,
        min: 0 // Pages per hour
    },
    focusScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },

    // Streak Validation
    contributesToStreak: {
        type: Boolean,
        default: true,
        index: true // For streak calculation queries
    },
    sessionDate: {
        type: String,
        required: true,
        index: true // YYYY-MM-DD format for daily aggregation
    },

    // Monetization & Rewards
    inkDropsEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    achievementsUnlocked: {
        type: [String],
        default: []
    },

    // Session Quality Metrics
    pauseCount: {
        type: Number,
        default: 0,
        min: 0
    },
    averagePauseDuration: {
        type: Number,
        default: 0,
        min: 0 // In minutes
    },
    isCompleteSession: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Compound index: Get all sessions for a user on a specific date
ReadingSessionSchema.index({ userId: 1, sessionDate: 1 });

// Compound index: Get all sessions for a specific book by user
ReadingSessionSchema.index({ userId: 1, bookshelfItemId: 1 });

// Compound index: Streak validation - sessions that contribute to streak
ReadingSessionSchema.index({ userId: 1, contributesToStreak: 1, sessionDate: -1 });

// Analytics: Get sessions within a time range
ReadingSessionSchema.index({ userId: 1, startTime: -1 });

// Analytics: Total reading time across all books
ReadingSessionSchema.index({ userId: 1, duration: -1 });

// Query optimization: Get recent sessions for dashboard
ReadingSessionSchema.index({ userId: 1, createdAt: -1 });

// Performance: Book-level analytics (total time spent per book)
ReadingSessionSchema.index({ bookshelfItemId: 1, duration: -1 });

// Leaderboard: Top readers by total duration
ReadingSessionSchema.index({ duration: -1, sessionDate: -1 });

// ==================== PRE-SAVE HOOKS ====================

ReadingSessionSchema.pre('save', function (next) {
    const session = this as unknown as IReadingSessionDocument;
    // Auto-calculate duration if not set
    if (!session.duration && session.startTime && session.endTime) {
        const durationMs = session.endTime.getTime() - session.startTime.getTime();
        session.duration = Math.round(durationMs / 1000 / 60); // Convert to minutes
    }

    // Auto-calculate pages read if not set
    if (session.pagesRead === 0 && session.endPage && session.startPage) {
        session.pagesRead = Math.max(0, session.endPage - session.startPage);
    }

    // Auto-calculate words read (assuming 275 words/page average)
    if (!session.wordsRead && session.pagesRead) {
        session.wordsRead = session.pagesRead * 275;
    }

    // Auto-calculate reading speed (pages per hour)
    if (session.duration > 0 && session.pagesRead > 0) {
        session.readingSpeed = Math.round((session.pagesRead / session.duration) * 60);
    }

    // Set session date in YYYY-MM-DD format (UTC)
    if (!session.sessionDate && session.startTime) {
        const date = new Date(session.startTime);
        session.sessionDate = date.toISOString().split('T')[0];
    }

    // Validate session contributes to streak (minimum 5 minutes reading)
    if (session.duration < 5) {
        session.contributesToStreak = false;
    }

    // Calculate focus score based on pause metrics
    if (session.pauseCount > 0) {
        const pausePenalty = Math.min(session.pauseCount * 5, 30); // Max 30% penalty
        const durationPenalty = Math.min(session.averagePauseDuration * 2, 20); // Max 20% penalty
        session.focusScore = Math.max(0, 100 - pausePenalty - durationPenalty);
    }

    next();
});

// ==================== METHODS ====================

/**
 * Calculate Ink Drops earned for this session (for gamification)
 * Formula: Base (10) + Duration Bonus (1 per 5 min) + Speed Bonus + Focus Bonus
 */
ReadingSessionSchema.methods.calculateInkDrops = function (): number {
    const baseReward = 10;
    const durationBonus = Math.floor(this.duration / 5); // 1 drop per 5 minutes
    const speedBonus = this.readingSpeed > 30 ? 5 : 0; // Bonus for fast readers
    const focusBonus = this.focusScore >= 90 ? 5 : 0; // Bonus for focused reading

    return baseReward + durationBonus + speedBonus + focusBonus;
};

/**
 * Check if session is valid for daily reading streak
 */
ReadingSessionSchema.methods.isValidForStreak = function (): boolean {
    return this.contributesToStreak && this.duration >= 5 && this.isCompleteSession;
};

/**
 * Get reading statistics summary for this session
 */
ReadingSessionSchema.methods.getStats = function () {
    return {
        duration: this.duration,
        pagesRead: this.pagesRead,
        wordsRead: this.wordsRead,
        readingSpeed: this.readingSpeed,
        focusScore: this.focusScore,
        isValidForStreak: this.isValidForStreak()
    };
};

// ==================== STATIC METHODS ====================

/**
 * Aggregate total reading time for a user within a date range
 */
ReadingSessionSchema.statics.getTotalReadingTime = async function (
    userId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const result = await this.aggregate([
        {
            $match: {
                userId: userId,
                startTime: { $gte: startDate, $lte: endDate },
                isCompleteSession: true
            }
        },
        {
            $group: {
                _id: null,
                totalMinutes: { $sum: '$duration' }
            }
        }
    ]);

    return result.length > 0 ? result[0].totalMinutes : 0;
};

/**
 * Get daily reading stats for a user (last 30 days)
 */
ReadingSessionSchema.statics.getDailyStats = async function (
    userId: mongoose.Types.ObjectId,
    days: number = 30
): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.aggregate([
        {
            $match: {
                userId: userId,
                startTime: { $gte: startDate },
                isCompleteSession: true
            }
        },
        {
            $group: {
                _id: '$sessionDate',
                totalMinutes: { $sum: '$duration' },
                totalPages: { $sum: '$pagesRead' },
                totalWords: { $sum: '$wordsRead' },
                sessionCount: { $sum: 1 },
                avgFocusScore: { $avg: '$focusScore' }
            }
        },
        { $sort: { _id: -1 } }
    ]);
};

const ReadingSession = mongoose.model<IReadingSessionDocument, IReadingSessionModel>(
    'ReadingSession',
    ReadingSessionSchema
);

export default ReadingSession;
