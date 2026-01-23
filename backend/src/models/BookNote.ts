// backend/src/models/BookNote.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * NOTE TYPE
 * - highlight: Simple text highlight 
 * - note: Highlight with user's personal note/comment
 * - bookmark: Page bookmark without highlight
 * - question: Highlight with a question/discussion point
 */
export type NoteType = 'highlight' | 'note' | 'bookmark' | 'question';

/**
 * VISIBILITY
 * - private: Only visible to user
 * - followers: Visible to user's followers
 * - public: Visible to everyone
 */
export type Visibility = 'private' | 'followers' | 'public';

/**
 * BOOK NOTE DOCUMENT
 * Represents highlights, annotations, and bookmarks users make while reading
 */
export interface IBookNoteMethods {
    toggleSpotlight(): Promise<void>;
    addLike(): Promise<void>;
    removeLike(): Promise<void>;
    updateContent(userNote?: string | null, highlightedText?: string | null): Promise<void>;
    updateVisibility(visibility: Visibility): Promise<void>;
    getSummary(): any;
}

export interface IBookNoteModel extends Model<IBookNoteDocument, {}, IBookNoteMethods> {
    getNotesByPage(bookshelfItemId: mongoose.Types.ObjectId): Promise<any[]>;
    getPopularHighlights(bookId: mongoose.Types.ObjectId, limit?: number): Promise<IBookNoteDocument[]>;
    searchNotes(userId: mongoose.Types.ObjectId, searchQuery: string, limit?: number): Promise<IBookNoteDocument[]>;
}

export interface IBookNoteDocument extends Document, IBookNoteMethods {
    // Relations
    userId: mongoose.Types.ObjectId;
    bookId: mongoose.Types.ObjectId;
    bookshelfItemId: mongoose.Types.ObjectId;

    // Note Content
    type: NoteType;
    highlightedText: string | null; // The actual text highlighted from the book
    userNote: string | null; // User's personal note/comment
    pageNumber: number;
    chapterName: string | null; // Optional chapter reference
    position: {
        start: number; // Character position start (for precise highlighting)
        end: number; // Character position end
    } | null;

    // Color Coding (for organization)
    color: string; // Hex color code (e.g., "#FFD700" for yellow highlight)

    // Social & Discovery
    visibility: Visibility;
    likes: number;
    replies: number; // Count of replies/comments on this note
    isSpotlight: boolean; // Featured/pinned note

    // Sharing & Collections
    tags: string[]; // Custom tags for organization
    collectionIds: mongoose.Types.ObjectId[]; // User's note collections/folders
    sharedWithBookClubId: mongoose.Types.ObjectId | null; // If shared with a book club

    // Reading Context
    readingSessionId: mongoose.Types.ObjectId | null; // Session when note was created
    createdAtProgress: number; // Book progress % when note was created (0-100)

    // Engagement Tracking
    lastEditedAt: Date | null;
    editCount: number;

    // AI & Smart Features
    aiSummary: string | null; // AI-generated summary of the note
    aiTags: string[]; // Auto-generated tags based on content
    sentiment: 'positive' | 'neutral' | 'negative' | null; // Sentiment analysis

    // Monetization (Premium Feature)
    isPremiumFeature: boolean; // If this note uses premium-only features

    createdAt: Date;
    updatedAt: Date;
}

const BookNoteSchema: Schema = new Schema({
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
        index: true
    },

    // Note Content
    type: {
        type: String,
        enum: ['highlight', 'note', 'bookmark', 'question'],
        default: 'highlight',
        required: true,
        index: true
    },
    highlightedText: {
        type: String,
        default: null,
        maxlength: 2000 // Limit highlighted text length
    },
    userNote: {
        type: String,
        default: null,
        maxlength: 5000 // User's note can be longer
    },
    pageNumber: {
        type: Number,
        required: true,
        min: 1,
        index: true // For sorting notes by page
    },
    chapterName: {
        type: String,
        default: null,
        maxlength: 200
    },
    position: {
        type: {
            start: { type: Number, required: true },
            end: { type: Number, required: true }
        },
        default: null,
        _id: false
    },

    // Color Coding
    color: {
        type: String,
        default: '#FFD700', // Default: yellow
        match: /^#[0-9A-F]{6}$/i // Validate hex color
    },

    // Social & Discovery
    visibility: {
        type: String,
        enum: ['private', 'followers', 'public'],
        default: 'private',
        required: true,
        index: true // For filtering public notes
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    replies: {
        type: Number,
        default: 0,
        min: 0
    },
    isSpotlight: {
        type: Boolean,
        default: false,
        index: true // For featured notes
    },

    // Sharing & Collections
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (tags: string[]) {
                return tags.length <= 10; // Max 10 tags per note
            },
            message: 'Maximum 10 tags allowed per note'
        }
    },
    collectionIds: {
        type: [Schema.Types.ObjectId],
        default: [],
        ref: 'NoteCollection' // Future feature: User-created note collections
    },
    sharedWithBookClubId: {
        type: Schema.Types.ObjectId,
        ref: 'BookClub', // Future feature: Book clubs
        default: null
    },

    // Reading Context
    readingSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'ReadingSession',
        default: null
    },
    createdAtProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Engagement Tracking
    lastEditedAt: {
        type: Date,
        default: null
    },
    editCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // AI & Smart Features
    aiSummary: {
        type: String,
        default: null,
        maxlength: 500
    },
    aiTags: {
        type: [String],
        default: []
    },
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative', null],
        default: null
    },

    // Monetization
    isPremiumFeature: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Compound index: Get all notes for a user's specific book
BookNoteSchema.index({ userId: 1, bookshelfItemId: 1 });

// Compound index: Get notes sorted by page number
BookNoteSchema.index({ bookshelfItemId: 1, pageNumber: 1 });

// Compound index: Get user's notes by type
BookNoteSchema.index({ userId: 1, type: 1 });

// Query optimization: Get public/shared notes for discovery feed
BookNoteSchema.index({ visibility: 1, likes: -1 });

// Query optimization: Get spotlight/featured notes
BookNoteSchema.index({ isSpotlight: 1, createdAt: -1 });

// Query optimization: Get notes by tag (for search/filtering)
BookNoteSchema.index({ userId: 1, tags: 1 });

// Analytics: Most popular highlights for a book
BookNoteSchema.index({ bookId: 1, likes: -1 });

// Social discovery: Recent public notes
BookNoteSchema.index({ visibility: 1, createdAt: -1 });

// Performance: Book club shared notes
BookNoteSchema.index({ sharedWithBookClubId: 1, createdAt: -1 });

// ==================== PRE-SAVE HOOKS ====================

BookNoteSchema.pre('save', function (next) {
    const note = this as unknown as IBookNoteDocument;
    // Track edit history
    if (note.isModified('userNote') || note.isModified('highlightedText')) {
        note.lastEditedAt = new Date();
        note.editCount += 1;
    }

    // Validate position if present
    if (note.position && note.position.start >= note.position.end) {
        return next(new Error('Invalid position: start must be less than end'));
    }

    next();
});

// ==================== METHODS ====================

/**
 * Toggle spotlight/featured status
 */
BookNoteSchema.methods.toggleSpotlight = async function (): Promise<void> {
    this.isSpotlight = !this.isSpotlight;
    await this.save();
};

/**
 * Increment like count
 */
BookNoteSchema.methods.addLike = async function (): Promise<void> {
    this.likes += 1;
    await this.save();
};

/**
 * Decrement like count
 */
BookNoteSchema.methods.removeLike = async function (): Promise<void> {
    this.likes = Math.max(0, this.likes - 1);
    await this.save();
};

/**
 * Update note content and track edit
 */
BookNoteSchema.methods.updateContent = async function (
    userNote?: string | null,
    highlightedText?: string | null
): Promise<void> {
    if (userNote !== undefined) {
        this.userNote = userNote ? userNote.substring(0, 5000) : null;
    }
    if (highlightedText !== undefined) {
        this.highlightedText = highlightedText ? highlightedText.substring(0, 2000) : null;
    }
    // Pre-save hook will handle lastEditedAt and editCount
    await this.save();
};

/**
 * Change visibility setting
 */
BookNoteSchema.methods.updateVisibility = async function (visibility: Visibility): Promise<void> {
    this.visibility = visibility;
    await this.save();
};

/**
 * Get note summary for display
 */
BookNoteSchema.methods.getSummary = function () {
    return {
        id: this._id,
        type: this.type,
        pageNumber: this.pageNumber,
        preview: this.highlightedText?.substring(0, 100) || this.userNote?.substring(0, 100) || '',
        hasNote: !!this.userNote,
        likes: this.likes,
        isSpotlight: this.isSpotlight,
        color: this.color
    };
};

// ==================== STATIC METHODS ====================

/**
 * Get all notes for a book, grouped by page
 */
BookNoteSchema.statics.getNotesByPage = async function (
    bookshelfItemId: mongoose.Types.ObjectId
): Promise<any[]> {
    return await this.aggregate([
        { $match: { bookshelfItemId } },
        { $sort: { pageNumber: 1, createdAt: 1 } },
        {
            $group: {
                _id: '$pageNumber',
                notes: { $push: '$$ROOT' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

/**
 * Get most popular highlights for a book (public notes sorted by likes)
 */
BookNoteSchema.statics.getPopularHighlights = async function (
    bookId: mongoose.Types.ObjectId,
    limit: number = 10
): Promise<IBookNoteDocument[]> {
    return await this.find({
        bookId,
        visibility: { $in: ['public', 'followers'] },
        type: { $in: ['highlight', 'note'] }
    })
        .sort({ likes: -1, createdAt: -1 })
        .limit(limit)
        .populate('userId', 'username profileImage')
        .exec();
};

/**
 * Search notes by content (user's notes only)
 */
BookNoteSchema.statics.searchNotes = async function (
    userId: mongoose.Types.ObjectId,
    searchQuery: string,
    limit: number = 20
): Promise<IBookNoteDocument[]> {
    return await this.find({
        userId,
        $or: [
            { highlightedText: { $regex: searchQuery, $options: 'i' } },
            { userNote: { $regex: searchQuery, $options: 'i' } },
            { tags: { $regex: searchQuery, $options: 'i' } }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
};

const BookNote = mongoose.model<IBookNoteDocument, IBookNoteModel>(
    'BookNote',
    BookNoteSchema
);

export default BookNote;
