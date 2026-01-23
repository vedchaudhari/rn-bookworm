import mongoose, { Document, Schema, Model } from "mongoose";

export interface IComment {
    user: mongoose.Types.ObjectId;
    book: mongoose.Types.ObjectId;
    text: string;
}

export interface ICommentDocument extends IComment, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema = new Schema<ICommentDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        book: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },
        text: {
            type: String,
            required: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
commentSchema.index({ book: 1, createdAt: -1 }); // Get comments for a book, sorted by date
commentSchema.index({ user: 1 }); // Get user's comments

const Comment = mongoose.model<ICommentDocument>("Comment", commentSchema);

export default Comment;
