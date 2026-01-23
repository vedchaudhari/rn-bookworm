import mongoose, { Document, Schema, Model } from "mongoose";

export interface ILike {
    user: mongoose.Types.ObjectId;
    book: mongoose.Types.ObjectId;
}

export interface ILikeDocument extends ILike, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const likeSchema = new Schema<ILikeDocument>(
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
    },
    { timestamps: true }
);

// Compound index to prevent duplicate likes and optimize queries
likeSchema.index({ user: 1, book: 1 }, { unique: true });
likeSchema.index({ book: 1 }); // For counting likes per book
likeSchema.index({ user: 1 }); // For getting user's likes

const Like = mongoose.model<ILikeDocument>("Like", likeSchema);

export default Like;
