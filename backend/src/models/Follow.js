import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        following: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

const Follow = mongoose.model("Follow", followSchema);

export default Follow;
