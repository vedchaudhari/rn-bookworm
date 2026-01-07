import mongoose from "mongoose";

const readingGoalSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        targetBooks: {
            type: Number,
            required: true,
            min: 1,
        },
        currentBooks: {
            type: Number,
            default: 0,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "completed", "failed"],
            default: "active",
        },
        period: {
            type: String,
            enum: ["weekly", "monthly", "yearly", "custom"],
            default: "monthly",
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
readingGoalSchema.index({ user: 1, status: 1 });
readingGoalSchema.index({ user: 1, endDate: 1 });

// Virtual for progress percentage
readingGoalSchema.virtual("progressPercentage").get(function () {
    return Math.min(Math.round((this.currentBooks / this.targetBooks) * 100), 100);
});

const ReadingGoal = mongoose.model("ReadingGoal", readingGoalSchema);

export default ReadingGoal;
