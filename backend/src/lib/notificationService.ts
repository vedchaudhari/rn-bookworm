import mongoose from "mongoose";
import Notification, { NotificationType, INotificationDocument } from "../models/Notification";
import { getIO } from "../socket/socketHandler";
import { sendPushNotification, NOTIF_TEMPLATES } from "./pushService";

interface CreateNotificationParams {
    user: mongoose.Types.ObjectId | string;
    type: NotificationType;
    data: any;
}

// Create a notification
export const createNotification = async ({ user, type, data }: CreateNotificationParams): Promise<INotificationDocument | null> => {
    try {
        const notification = new Notification({
            user,
            type,
            data,
        });
        await notification.save();

        // Emit socket notification for real-time in-app Toast
        try {
            const io = getIO();
            if (io) {
                // Determine message for the toast
                let message = "You have a new notification";
                switch (type) {
                    case "LIKE":
                        message = `${data.likedByUsername} liked your book "${data.bookTitle}"`;
                        break;
                    case "COMMENT":
                        message = `${data.commentedByUsername} commented on "${data.bookTitle}"`;
                        break;
                    case "FOLLOW":
                        message = `${data.followedByUsername} started following you`;
                        break;
                    case "FOLLOW_ACCEPTED":
                        message = `${data.acceptedByUsername} accepted your follow request`;
                        break;
                    case "ACHIEVEMENT":
                        message = `Achievement Unlocked: ${data.achievementName}`;
                        break;
                }

                io.to(user.toString()).emit("notification", {
                    ...notification.toObject(),
                    message // Add message field for easy consumption by Toast
                });
            }
        } catch (socketErr) {
            console.error('[Socket] Error emitting notification:', socketErr);
        }

        /*
        // Send Push Notification
        // [DISABLED] - Commented out to remove push functionality
        try {
            let template;
            switch (type) {
                case "LIKE":
                    template = NOTIF_TEMPLATES.LIKE(data.likedByUsername, data.bookTitle);
                    break;
                case "COMMENT":
                    template = NOTIF_TEMPLATES.COMMENT(data.commentedByUsername, data.bookTitle);
                    break;
                case "FOLLOW":
                case "FOLLOW_ACCEPTED":
                    template = NOTIF_TEMPLATES.FOLLOW(data.followedByUsername || data.acceptedByUsername);
                    break;
                case "ACHIEVEMENT":
                    template = NOTIF_TEMPLATES.ACHIEVEMENT(data.achievementName || "New Milestone");
                    break;
            }

            if (template) {
                // Send push notification asynchronously
                sendPushNotification(user.toString(), template).catch(e => console.error('[Push] Async send failed:', e));
            }
        } catch (pushErr) {
            console.error('[Push] Error triggering push from notification:', pushErr);
        }
        */



        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
};

// Create multiple notifications
export const createBulkNotifications = async (notifications: CreateNotificationParams[]): Promise<void> => {
    try {
        await Notification.insertMany(notifications);
    } catch (error) {
        console.error("Error creating bulk notifications:", error);
    }
};

// Delete old read notifications (cleanup job)
export const cleanupOldNotifications = async (daysOld = 30): Promise<number> => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await Notification.deleteMany({
            read: true,
            createdAt: { $lt: cutoffDate },
        });

        console.log(`Cleaned up ${result.deletedCount} old notifications`);
        return result.deletedCount;
    } catch (error) {
        console.error("Error cleaning up notifications:", error);
        return 0;
    }
};
