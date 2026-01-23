import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBook {
    title: string;
    caption: string;
    image: string;
    rating: number;
    user: mongoose.Types.ObjectId;
    genre: string;
    author: string;
    tags: string[];
    totalPages: number;

    // eBook reading features
    hasContent: boolean;           // Is this a readable ebook?
    contentType: 'chapters' | 'external' | 'none' | 'pdf';
    totalChapters: number;
    publishStatus: 'draft' | 'published' | 'archived';
    language: string;
    isbn?: string;
    pdfUrl?: string | null;
    description?: string;          // Full book description
    visibility: 'public' | 'private';
}

export interface IBookDocument extends IBook, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const bookSchema = new Schema<IBookDocument>(
    {
        title: {
            type: String,
            required: true,
        },
        caption: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        genre: {
            type: String,
            default: "General",
        },
        author: {
            type: String,
            default: "",
        },
        tags: {
            type: [String],
            default: [],
        },
        totalPages: {
            type: Number,
            default: 0,
        },
        // eBook reading features
        hasContent: {
            type: Boolean,
            default: false,
            index: true
        },
        contentType: {
            type: String,
            enum: ['chapters', 'external', 'none', 'pdf'],
            default: 'none'
        },
        totalChapters: {
            type: Number,
            default: 0,
            min: 0
        },
        publishStatus: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true
        },
        language: {
            type: String,
            default: 'en'
        },
        isbn: {
            type: String,
            sparse: true
        },
        pdfUrl: {
            type: String,
            default: null
        },
        description: {
            type: String,
            maxlength: 2000
        },
        visibility: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
            index: true
        },
    },
    { timestamps: true }
);

const Book = mongoose.model<IBookDocument>("Book", bookSchema);

export default Book;
