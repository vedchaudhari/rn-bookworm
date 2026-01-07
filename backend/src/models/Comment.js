import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        book: {
            type: mongoose.Schema.Types.ObjectId,
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

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
