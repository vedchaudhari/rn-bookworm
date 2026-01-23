import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFollow {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted';
}

export interface IFollowDocument extends IFollow, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const followSchema = new Schema<IFollowDocument>(
    {
        follower: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        following: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted'],
            default: 'accepted'
        },
    },
    { timestamps: true }
);

// Compound index to prevent duplicate follows and optimize queries
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1 }); // For counting followers
followSchema.index({ follower: 1 }); // For getting who user follows

// Prevent self-following
followSchema.pre("save", function (next) {
    if (this.follower.toString() === this.following.toString()) {
        const error = new Error("Users cannot follow themselves");
        return next(error);
    }
    next();
});

const Follow = mongoose.model<IFollowDocument>("Follow", followSchema);

export default Follow;
