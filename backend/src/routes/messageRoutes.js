import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

// Send a message
router.post("/send/:receiverId", protectRoute, async (req, res) => {
    try {
        const { receiverId } = req.params;
        const { text, image } = req.body;
        const senderId = req.user._id;

        if ((!text || text.trim().length === 0) && !image) {
            return res.status(400).json({ message: "Message text or image is required" });
        }

        if (text && text.length > 1000) {
            return res.status(400).json({ message: "Message is too long (max 1000 characters)" });
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate conversation ID
        const conversationId = Message.getConversationId(senderId, receiverId);

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            text: text ? text.trim() : "",
            image,
            conversationId,
        });

        await newMessage.save();
        await newMessage.populate("sender", "username profileImage");
        await newMessage.populate("receiver", "username profileImage");

        // Emit real-time message via WebSocket
        const io = req.app.get("io");
        const connectedUsers = req.app.get("connectedUsers");
        const receiverSockets = connectedUsers.get(receiverId.toString());

        if (receiverSockets && receiverSockets.size > 0) {
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("new_message", newMessage);
            });
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get conversation with a user
router.get("/conversation/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const conversationId = Message.getConversationId(currentUserId, userId);

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "username profileImage")
            .populate("receiver", "username profileImage");

        const totalMessages = await Message.countDocuments({ conversationId });

        // Mark messages as read
        await Message.updateMany(
            {
                conversationId,
                receiver: currentUserId,
                read: false,
            },
            { $set: { read: true } }
        );

        res.json({
            messages: messages, // Returns newest first (Descending)
            currentPage: page,
            totalMessages,
            totalPages: Math.ceil(totalMessages / limit),
        });
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all conversations (list of users you've chatted with)
router.get("/conversations", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all unique conversations
        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }],
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: "$conversationId",
                    lastMessage: { $first: "$$ROOT" },
                },
            },
            {
                $sort: { "lastMessage.createdAt": -1 },
            },
        ]);

        // Populate user details and get unread count
        const conversations = await Promise.all(
            messages.map(async (conv) => {
                const msg = conv.lastMessage;
                const otherUserId = msg.sender.toString() === userId.toString() ? msg.receiver : msg.sender;

                const otherUser = await User.findById(otherUserId).select("username profileImage level");

                const unreadCount = await Message.countDocuments({
                    conversationId: conv._id,
                    receiver: userId,
                    read: false,
                });

                return {
                    conversationId: conv._id,
                    otherUser,
                    lastMessage: {
                        text: msg.text,
                        createdAt: msg.createdAt,
                        senderId: msg.sender,
                    },
                    unreadCount,
                };
            })
        );

        res.json({ conversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get unread message count
router.get("/unread-count", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        const unreadCount = await Message.countDocuments({
            receiver: userId,
            read: false,
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Mark conversation as read
router.put("/mark-read/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        const conversationId = Message.getConversationId(currentUserId, userId);

        await Message.updateMany(
            {
                conversationId,
                receiver: currentUserId,
                read: false,
            },
            { $set: { read: true } }
        );

        res.json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
