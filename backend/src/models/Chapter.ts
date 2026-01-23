import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter {
    bookId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    chapterNumber: number;
    title: string;
    content: string;              // Markdown format
    wordCount: number;
    readingTimeEstimate: number;  // in minutes
    isPremium: boolean;           // for future monetization
    isPublished: boolean;
    publishedAt?: Date;
}

export interface IChapterDocument extends IChapter, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const chapterSchema = new Schema<IChapterDocument>(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
            index: true
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        chapterNumber: {
            type: Number,
            required: true,
            min: 1
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        content: {
            type: String,
            required: true
        },
        wordCount: {
            type: Number,
            default: 0,
            min: 0
        },
        readingTimeEstimate: {
            type: Number,
            default: 0,
            min: 0
        },
        isPremium: {
            type: Boolean,
            default: false
        },
        isPublished: {
            type: Boolean,
            default: false,
            index: true
        },
        publishedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

// Compound index: one chapter number per book
chapterSchema.index({ bookId: 1, chapterNumber: 1 }, { unique: true });

// Index for querying published chapters
chapterSchema.index({ bookId: 1, isPublished: 1, chapterNumber: 1 });

// Method to calculate word count and reading time
chapterSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        // Calculate word count
        const words = this.content.trim().split(/\s+/).length;
        this.wordCount = words;

        // Estimate reading time (average 200 words per minute)
        this.readingTimeEstimate = Math.ceil(words / 200);
    }

    // Set published date if publishing
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    next();
});

const Chapter = mongoose.model<IChapterDocument>('Chapter', chapterSchema);

export default Chapter;
