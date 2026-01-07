import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
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
    },
    { timestamps: true }
);

// Compound index to prevent duplicate likes and optimize queries
likeSchema.index({ user: 1, book: 1 }, { unique: true });
likeSchema.index({ book: 1 }); // For counting likes per book
likeSchema.index({ user: 1 }); // For getting user's likes

const Like = mongoose.model("Like", likeSchema);

export default Like;
