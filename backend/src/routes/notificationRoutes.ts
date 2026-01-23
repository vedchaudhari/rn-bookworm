import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import Notification from "../models/Notification";

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

export default router;
