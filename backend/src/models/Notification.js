import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["LIKE", "COMMENT", "FOLLOW", "ACHIEVEMENT", "GOAL_REMINDER", "GOAL_COMPLETED"],
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 }); // Get unread notifications
notificationSchema.index({ user: 1, createdAt: -1 }); // Get all notifications sorted by date

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
