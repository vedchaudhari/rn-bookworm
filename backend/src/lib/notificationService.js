import Notification from "../models/Notification.js";

// Create a notification
export const createNotification = async ({ user, type, data }) => {
    try {
        const notification = new Notification({
            user,
            type,
            data,
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
};

// Create multiple notifications
export const createBulkNotifications = async (notifications) => {
    try {
        await Notification.insertMany(notifications);
    } catch (error) {
        console.error("Error creating bulk notifications:", error);
    }
};

// Delete old read notifications (cleanup job)
export const cleanupOldNotifications = async (daysOld = 30) => {
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
