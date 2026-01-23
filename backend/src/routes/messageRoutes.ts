import express, { Request, Response } from "express";
import mongoose from "mongoose";
import protectRoute from "../middleware/auth.middleware";
import Message, { IMessageDocument } from "../models/Message";
import User, { IUserDocument } from "../models/User";
import { Server } from "socket.io";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";

const router = express.Router();

interface SendMessageBody {
    text?: string;
    image?: string;
}

// Send a message
router.post("/send/:receiverId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { receiverId } = req.params;
        const { text, image } = req.body as SendMessageBody;
        const senderId = req.user!._id;

        // Validate receiverId format
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID" });
        }

        // Sanitize and validate text
        const trimmedText = text ? text.trim() : '';

        if (!trimmedText && !image) {
            return res.status(400).json({ message: "Message text or image is required" });
        }

        if (trimmedText && trimmedText.length > 1000) {
            return res.status(400).json({ message: "Message is too long (max 1000 characters)" });
        }

        // Validate image size (base64)
        if (image) {
            const imageSizeBytes = Buffer.from(image.split(',')[1] || image, 'base64').length;
            const maxImageSize = 5 * 1024 * 1024; // 5MB
            if (imageSizeBytes > maxImageSize) {
                return res.status(400).json({ message: "Image too large (max 5MB)" });
            }
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate conversation ID
        const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
        const conversationId = Message.getConversationId(senderId, receiverObjectId);

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverObjectId,
            text: trimmedText,
            image,
            conversationId,
        });

        await newMessage.save();
        await newMessage.populate("sender", "username profileImage");
        await newMessage.populate("receiver", "username profileImage");

        // Emit real-time message via WebSocket
        const io: Server = req.app.get("io");

        // 1. Get all active sockets for the receiver from Redis
        const receiverSockets = await redis.smembers(CACHE_KEYS.USER_SOCKETS(receiverId.toString()));

        if (receiverSockets && receiverSockets.length > 0) {
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("new_message", newMessage);
            });
        }

        // Invalidate Redis caches
        await Promise.all([
            redis.del(CACHE_KEYS.CONVERSATIONS(senderId.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(receiverId.toString())),
            redis.del(CACHE_KEYS.MESSAGES(conversationId, senderId.toString())),
            redis.del(CACHE_KEYS.MESSAGES(conversationId, receiverId.toString()))
        ]);

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get conversation with a user
router.get("/conversation/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = new mongoose.Types.ObjectId(req.user!._id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const conversationId = Message.getConversationId(currentUserId.toString(), userId);

        // 1. Try Cache First for messages (only for page 1)
        if (page === 1) {
            const cachedMessages = await redis.get(CACHE_KEYS.MESSAGES(conversationId, currentUserId.toString()));
            if (cachedMessages) {
                return res.json(cachedMessages);
            }
        }

        const messages = await Message.find({
            conversationId,
            deletedFor: { $ne: currentUserId }, // Exclude messages deleted by this user
        })
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

        const responseData = {
            messages: messages, // Returns newest first (Descending)
            currentPage: page,
            totalMessages,
            totalPages: Math.ceil(totalMessages / limit),
        };

        // 2. Cache if it's page 1
        if (page === 1) {
            await redis.set(CACHE_KEYS.MESSAGES(conversationId, currentUserId.toString()), responseData, { ex: TTL.MESSAGES });
        }

        res.json(responseData);
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all conversations (list of users you've chatted with)
router.get("/conversations", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user!._id);

        // 1. Try Cache First
        const cachedConversations = await redis.get(CACHE_KEYS.CONVERSATIONS(userId.toString()));
        if (cachedConversations) {
            return res.json({ conversations: cachedConversations });
        }

        // Get all unique conversations
        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }],
                    conversationId: { $exists: true, $ne: null }
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
                $match: {
                    "lastMessage.deletedFor": { $ne: userId }
                }
            },
            {
                $sort: { "lastMessage.createdAt": -1 },
            },
        ]);

        // Populate user details and get unread count
        const conversations = await Promise.all(
            messages.map(async (conv) => {
                try {
                    const msg = conv.lastMessage;
                    // Robust check: the other user is the one who isn't the current user
                    // In self-chats, otherUserId will naturally be the same as userId
                    const otherUserId = msg.sender.toString() === userId.toString() ? msg.receiver : msg.sender;

                    const otherUser = await User.findById(otherUserId).select("username profileImage level");

                    if (!otherUser && otherUserId.toString() !== userId.toString()) {
                        return null; // Skip if user no longer exists
                    }

                    const unreadCount = await Message.countDocuments({
                        conversationId: conv._id,
                        receiver: userId,
                        read: false,
                        deletedFor: { $ne: userId },
                    });

                    return {
                        conversationId: conv._id,
                        otherUser: otherUser || { _id: userId, username: "Unknown User", profileImage: "" },
                        lastMessage: {
                            text: msg.text || (msg.image ? "Sent an image" : ""),
                            createdAt: msg.createdAt,
                            senderId: msg.sender,
                        },
                        unreadCount,
                    };
                } catch (err) {
                    console.error("Error processing conversation entry:", err);
                    return null;
                }
            })
        );

        // Filter out any null entries from deleted users
        const validConversations = conversations.filter(c => c !== null);

        console.log(`[Messages] Found ${validConversations.length} conversations for user ${userId}`);

        // 2. Cache result
        await redis.set(CACHE_KEYS.CONVERSATIONS(userId.toString()), validConversations, { ex: TTL.CONVERSATIONS });

        res.json({ conversations: validConversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get unread message count
router.get("/unread-count", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user!._id);
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
router.put("/mark-read/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!._id;

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

// Edit a message
router.patch("/edit/:messageId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const userId = req.user!._id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Message text is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Only sender can edit
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        if (message.isDeleted) {
            return res.status(400).json({ message: "Cannot edit a deleted message" });
        }

        message.text = text.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        // Invalidate message threads for both
        await Promise.all([
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.sender.toString())),
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.receiver.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.sender.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.receiver.toString()))
        ]);

        // Socket update
        const io: Server = req.app.get("io");
        io.to(message.conversationId).emit("message_edited", {
            messageId: message._id,
            text: message.text,
            editedAt: message.editedAt,
        });

        res.json(message);
    } catch (error) {
        console.error("Error editing message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete message for me
router.delete("/delete-me/:messageId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const userId = req.user!._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Verify participation
        if (message.sender.toString() !== userId.toString() && message.receiver.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
            await message.save();
        }

        // Invalidate caches
        await Promise.all([
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, userId.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(userId.toString()))
        ]);

        res.json({ message: "Message deleted for you" });
    } catch (error) {
        console.error("Error deleting message for me:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete message for everyone
router.delete("/delete-everyone/:messageId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const userId = req.user!._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Only sender can delete for everyone
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages for everyone" });
        }

        message.text = "This message was deleted";
        message.image = undefined;
        message.isDeleted = true;
        await message.save();

        // Invalidate message threads for both
        await Promise.all([
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.sender.toString())),
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.receiver.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.sender.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.receiver.toString()))
        ]);

        // Socket update
        const io: Server = req.app.get("io");
        io.to(message.conversationId).emit("message_deleted", {
            messageId: message._id,
            conversationId: message.conversationId
        });

        res.json(message);
    } catch (error) {
        console.error("Error deleting message for everyone:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Clear chat history (locally)
router.delete("/clear/:otherUserId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { otherUserId } = req.params;
        const userId = req.user!._id;
        const conversationId = Message.getConversationId(userId, otherUserId);

        // Add userId to deletedFor for all messages in this conversation
        await Message.updateMany(
            {
                conversationId,
                deletedFor: { $ne: userId }
            },
            {
                $push: { deletedFor: userId }
            }
        );

        // Invalidate caches
        await Promise.all([
            redis.del(CACHE_KEYS.MESSAGES(conversationId, userId.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(userId.toString()))
        ]);

        res.json({ message: "Chat history cleared" });
    } catch (error) {
        console.error("Error clearing chat history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
