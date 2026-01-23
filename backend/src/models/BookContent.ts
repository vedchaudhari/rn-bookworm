import mongoose, { Document, Schema, Model } from "mongoose";

export interface IChapter {
    title: string;
    content: string;
    order: number;
}

export interface IBookContent {
    book: mongoose.Types.ObjectId;
    content: string;
    chapters: IChapter[];
    totalPages: number;
    readCount: number;
}

export interface IBookContentDocument extends IBookContent, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const bookContentSchema = new Schema<IBookContentDocument>(
    {
        book: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
            unique: true,
        },
        content: {
            type: String,
            default: "",
        },
        chapters: [
            {
                title: String,
                content: String,
                order: Number,
            },
        ],
        totalPages: {
            type: Number,
            default: 0,
        },
        readCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Index for efficient queries
// bookContentSchema.index({ book: 1 }); // Removed redundant index (unique: true already creates one)

const BookContent = mongoose.model<IBookContentDocument>("BookContent", bookContentSchema);

export default BookContent;
