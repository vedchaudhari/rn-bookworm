// backend/src/models/BookshelfItem.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * READING STATUS TYPES
 * - want_to_read: Book is on wishlist/TBR
 * - currently_reading: Actively reading
 * - completed: Finished reading
 * - paused: Started but temporarily stopped
 * - dropped: Started but won't finish
 */
export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'completed' | 'paused' | 'dropped';

/**
 * PRIORITY LEVELS
 * - low: Read eventually
 * - medium: Normal priority
 * - high: Want to read soon
 * - urgent: Top priority, read ASAP
 */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * BOOKSHELF ITEM DOCUMENT
 * Represents a single book on a user's bookshelf with reading progress and metadata
 */
export interface IBookshelfItemMethods {
    updateProgress(currentPage: number): Promise<void>;
    calculateEstimatedTime(): number;
    isOverdue(): boolean;
    markCompleted(rating?: number, review?: string): Promise<void>;
}

export interface IBookshelfItemModel extends Model<IBookshelfItemDocument, {}, IBookshelfItemMethods> {
    // Add statics if needed in future
}

export interface IBookshelfItemDocument extends Document, IBookshelfItemMethods {
    // Relations
    userId: mongoose.Types.ObjectId;
    bookId: mongoose.Types.ObjectId;

    // Reading Status & Progress
    status: ReadingStatus;
    progress: number; // 0-100 percentage
    currentPage: number;
    totalPages: number;
    startedReadingAt: Date | null;
    completedAt: Date | null;
    lastReadAt: Date | null;

    // Chapter reading tracking (for ebooks)
    currentChapter: number;           // Which chapter they're currently on
    lastReadChapter: number;          // Last chapter they accessed
    completedChapters: number[];      // Array of completed chapter numbers
    chapterBookmarks: Map<number, number>; // chapter -> paragraph position

    // User Interaction
    rating: number | null; // 1-5 stars, null if not rated
    review: string | null;
    isFavorite: boolean;
    priority: Priority;
    tags: string[]; // Custom user tags: ["summer-reading", "book-club", etc]

    // Reading Analytics (calculated fields)
    estimatedReadingTime: number; // Minutes, based on total pages and avg reading speed
    actualReadingTime: number; // Minutes, tracked from ReadingSession aggregation
    readingSpeed: number; // Pages per hour, calculated from sessions

    // Recommendations & Social
    recommendedByUserId: mongoose.Types.ObjectId | null; // Who recommended this book
    isPrivate: boolean; // Hide from followers if true
    notes: number; // Count of associated BookNote documents

    // Monetization Tracking
    purchasedViaApp: boolean; // If user bought book via affiliate link
    affiliateRevenue: number; // Revenue earned if user purchased (in USD cents)

    // Reminders & Goals
    targetCompletionDate: Date | null; // User-set deadline
    reminderEnabled: boolean;
    reminderFrequency: 'daily' | 'weekly' | 'biweekly' | null;

    createdAt: Date;
    updatedAt: Date;
}

const BookshelfItemSchema: Schema = new Schema({
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

    // Reading Status & Progress
    status: {
        type: String,
        enum: ['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped'],
        default: 'want_to_read',
        required: true,
        index: true // For filtering by status
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        required: true
    },
    currentPage: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    totalPages: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    startedReadingAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null,
        index: true // For querying recently completed books
    },
    lastReadAt: {
        type: Date,
        default: null,
        index: true // For sorting by recent activity
    },

    // Chapter reading tracking (for ebooks)
    currentChapter: {
        type: Number,
        default: 0,
        min: 0
    },
    lastReadChapter: {
        type: Number,
        default: 0,
        min: 0
    },
    completedChapters: {
        type: [Number],
        default: []
    },
    chapterBookmarks: {
        type: Map,
        of: Number,
        default: new Map()
    },

    // User Interaction
    rating: {
        type: Number,
        default: null,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        default: null,
        maxlength: 2000 // Character limit for reviews
    },
    isFavorite: {
        type: Boolean,
        default: false,
        index: true // For filtering favorites
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (tags: string[]) {
                return tags.length <= 20; // Max 20 tags per book
            },
            message: 'Maximum 20 tags allowed per book'
        }
    },

    // Reading Analytics
    estimatedReadingTime: {
        type: Number,
        default: 0,
        min: 0 // In minutes
    },
    actualReadingTime: {
        type: Number,
        default: 0,
        min: 0 // In minutes, aggregated from ReadingSession
    },
    readingSpeed: {
        type: Number,
        default: 0,
        min: 0 // Pages per hour
    },

    // Recommendations & Social
    recommendedByUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isPrivate: {
        type: Boolean,
        default: false,
        index: true // For privacy filtering
    },
    notes: {
        type: Number,
        default: 0,
        min: 0
    },

    // Monetization Tracking
    purchasedViaApp: {
        type: Boolean,
        default: false
    },
    affiliateRevenue: {
        type: Number,
        default: 0,
        min: 0 // In cents (e.g., 499 = $4.99)
    },

    // Reminders & Goals
    targetCompletionDate: {
        type: Date,
        default: null
    },
    reminderEnabled: {
        type: Boolean,
        default: false
    },
    reminderFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', null],
        default: null
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Compound index: Ensure one book per user's bookshelf (unique constraint)
BookshelfItemSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Query optimization: Get all books by status for a user
BookshelfItemSchema.index({ userId: 1, status: 1 });

// Query optimization: Get user's favorites
BookshelfItemSchema.index({ userId: 1, isFavorite: 1 });

// Query optimization: Get recently read books (sorted by lastReadAt desc)
BookshelfItemSchema.index({ userId: 1, lastReadAt: -1 });

// Query optimization: Get completed books sorted by completion date
BookshelfItemSchema.index({ userId: 1, completedAt: -1 });

// Query optimization: Find books with reminders due (for cron jobs)
BookshelfItemSchema.index({ reminderEnabled: 1, targetCompletionDate: 1 });

// Query optimization: Social discovery - public bookshelves
BookshelfItemSchema.index({ isPrivate: 1, status: 1 });

// Analytics: Track affiliate revenue by user
BookshelfItemSchema.index({ userId: 1, purchasedViaApp: 1 });

// ==================== METHODS ====================

/**
 * Update reading progress and calculate completion percentage
 */
BookshelfItemSchema.methods.updateProgress = async function (currentPage: number): Promise<void> {
    this.currentPage = Math.min(currentPage, this.totalPages);
    this.progress = this.totalPages > 0
        ? Math.round((this.currentPage / this.totalPages) * 100)
        : 0;
    this.lastReadAt = new Date();

    // Auto-update status based on progress
    if (this.progress === 100 && this.status !== 'completed') {
        this.status = 'completed';
        this.completedAt = new Date();
    } else if (this.progress > 0 && this.status === 'want_to_read') {
        this.status = 'currently_reading';
        this.startedReadingAt = this.startedReadingAt || new Date();
    }

    await this.save();
};

/**
 * Calculate estimated reading time based on average reading speed (250 words/min = ~1 page/min)
 */
BookshelfItemSchema.methods.calculateEstimatedTime = function (): number {
    const avgPagesPerHour = 60; // Industry standard
    const remainingPages = this.totalPages - this.currentPage;
    return Math.ceil((remainingPages / avgPagesPerHour) * 60); // Return in minutes
};

/**
 * Check if reading goal/reminder is overdue
 */
BookshelfItemSchema.methods.isOverdue = function (): boolean {
    if (!this.targetCompletionDate || this.status === 'completed') {
        return false;
    }
    return new Date() > this.targetCompletionDate;
};

/**
 * Mark book as completed
 */
BookshelfItemSchema.methods.markCompleted = async function (rating?: number, review?: string): Promise<void> {
    this.status = 'completed';
    this.completedAt = new Date();
    this.progress = 100;
    this.currentPage = this.totalPages;
    this.lastReadAt = new Date();

    if (rating) {
        this.rating = Math.min(Math.max(rating, 1), 5);
    }
    if (review) {
        this.review = review.substring(0, 2000);
    }

    await this.save();
};

const BookshelfItem = mongoose.model<IBookshelfItemDocument, IBookshelfItemModel>(
    'BookshelfItem',
    BookshelfItemSchema
);

export default BookshelfItem;
