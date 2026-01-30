import mongoose, { Document, Schema, Model } from "mongoose";

export type NotificationType =
    | "LIKE"
    | "COMMENT"
    | "FOLLOW"
    | "ACHIEVEMENT"
    | "GOAL_REMINDER"
    | "GOAL_COMPLETED"
    | "FOLLOW_REQUEST"
    | "FOLLOW_ACCEPTED"
    | "NEW_POST";

export interface INotification {
    user: mongoose.Types.ObjectId;
    type: NotificationType;
    data: any; // Mixed data  depending on type
    read: boolean;
}

export interface INotificationDocument extends INotification, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["LIKE", "COMMENT", "FOLLOW", "ACHIEVEMENT", "GOAL_REMINDER", "GOAL_COMPLETED", "FOLLOW_REQUEST", "FOLLOW_ACCEPTED", "NEW_POST"],
        },
        data: {
            type: Schema.Types.Mixed,
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

const Notification = mongoose.model<INotificationDocument>("Notification", notificationSchema);

export default Notification;
