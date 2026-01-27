import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import Notification from "../models/Notification";
import { sendPushNotification } from "../lib/pushService";
import User from "../models/User";
import { asyncHandler } from "../middleware/asyncHandler";
import { createNotification } from "../lib/notificationService";

const router = express.Router();

// Get user notifications
router.get("/", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalNotifications = await Notification.countDocuments({ user: userId });
        const unreadCount = await Notification.countDocuments({ user: userId, read: false });

        res.json({
            notifications,
            currentPage: page,
            totalNotifications,
            totalPages: Math.ceil(totalNotifications / limit),
            unreadCount,
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get unread count
router.get("/unread-count", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;
        const unreadCount = await Notification.countDocuments({ user: userId, read: false });
        res.json({ unreadCount });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Mark notification as read
router.put("/:id/read", protectRoute, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const notification = await Notification.findOne({ _id: id, user: userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.read = true;
        await notification.save();

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Mark all notifications as read
router.put("/read-all", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;

        await Notification.updateMany(
            { user: userId, read: false },
            { $set: { read: true } }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete notification
router.delete("/:id", protectRoute, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const notification = await Notification.findOne({ _id: id, user: userId });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await notification.deleteOne();
        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

/*
// Register Push Token
// [DISABLED] - Push tokens are not being collected currently
router.post("/register-token", protectRoute, async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        const userId = req.user!._id;

        console.log(`[Token Register] Received token for user ${userId}: ${token?.substring(0, 20)}...`);

        if (!token) {
            console.warn(`[Token Register] Failed: No token provided in request for user ${userId}`);
            return res.status(400).json({ message: "Token is required" });
        }

        // 1. Remove this token from any other users (prevent duplicates)
        await User.updateMany(
            { expoPushToken: token, _id: { $ne: userId } },
            { $set: { expoPushToken: null } }
        );

        // 2. Update current user's token
        await User.findByIdAndUpdate(userId, { $set: { expoPushToken: token } });

        res.json({ success: true, message: "Push token registered successfully" });
    } catch (error) {
        console.error("Error registering push token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
*/

/*
// Test Push Notification
// [DISABLED]
router.post("/test", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;
        const username = req.user!.username;

        await sendPushNotification(userId.toString(), {
            title: "Test Notification 🔔",
            body: `Hey ${username}, your push notifications are working perfectly!`,
            data: { type: "TEST" }
        });

        res.json({ success: true, message: "Test notification sent" });
    } catch (error) {
        console.error("Error sending test notification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
*/

router.get("/test/:userId", asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    console.log(`[Test Notif] Manually triggering notification for user: ${userId}`);

    const notification = await createNotification({
        user: userId,
        type: "LIKE",
        data: {
            bookId: "test-book-id",
            bookTitle: "The Great Indian Novel",
            likedByUsername: "DevelopmentBot",
        },
    });

    if (notification) {
        console.log(`[Test Notif] Success: Notification created and queued for user ${userId}`);
        res.json({ message: "Test notification triggered!", notification });
    } else {
        console.error(`[Test Notif] Failed: Could not create notification for user ${userId}`);
        res.status(500).json({ message: "Failed to trigger notification" });
    }
}));

export default router;
