import express, { Request, Response } from "express";
import mongoose from "mongoose";
import protectRoute from "../middleware/auth.middleware";
import Message, { IMessageDocument } from "../models/Message";
import User, { IUserDocument } from "../models/User";
import { Server } from "socket.io";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";
import { getPresignedPutUrl, getSignedUrlForFile } from "../lib/s3";
import { sendPushNotification } from "../lib/pushService";

const router = express.Router();

interface SendMessageBody {
    text?: string;
    image?: string;
    video?: string;
    videoThumbnail?: string;
    fileSizeBytes?: number;
    book?: {
        _id: string;
        title: string;
        author?: string;
        image: string;
    };
}

// Helper to sign all media in a message
const signMessageMedia = async (msgObj: any) => {
    if (msgObj.sender && typeof msgObj.sender === 'object') {
        msgObj.sender.profileImage = await getSignedUrlForFile(msgObj.sender.profileImage);
    }
    if (msgObj.receiver && typeof msgObj.receiver === 'object') {
        msgObj.receiver.profileImage = await getSignedUrlForFile(msgObj.receiver.profileImage);
    }
    if (msgObj.image) {
        msgObj.image = await getSignedUrlForFile(msgObj.image);
    }
    if (msgObj.video) {
        msgObj.video = await getSignedUrlForFile(msgObj.video);
    }
    if (msgObj.videoThumbnail) {
        msgObj.videoThumbnail = await getSignedUrlForFile(msgObj.videoThumbnail);
    }
    return msgObj;
};

// Get presigned URL for chat media upload (images and videos)
router.get("/presigned-url", protectRoute, async (req: Request, res: Response) => {
    try {
        const { fileName, contentType, fileSize } = req.query;

        if (!fileName || !contentType) {
            return res.status(400).json({ message: "fileName and contentType are required" });
        }

        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
        const isImage = validImageTypes.includes(contentType as string);
        const isVideo = validVideoTypes.includes(contentType as string);

        if (!isImage && !isVideo) {
            return res.status(400).json({
                message: "Invalid file type. Supported: JPEG, PNG, WebP, MP4, MOV"
            });
        }

        // Validate file size
        const maxImageSize = 5 * 1024 * 1024; // 5MB
        const maxVideoSize = 10 * 1024 * 1024; // 10MB
        const maxSize = isVideo ? maxVideoSize : maxImageSize;

        if (fileSize && parseInt(fileSize as string) > maxSize) {
            return res.status(400).json({
                message: `File too large. Max size: ${maxSize / 1024 / 1024}MB`
            });
        }

        // Determine folder based on type
        const folder = isVideo ? 'videos' : 'chat';

        const data = await getPresignedPutUrl(
            fileName as string,
            contentType as string,
            req.user!._id.toString(),
            folder
        );
        res.json(data);
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Send a message
router.post("/send/:receiverId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { receiverId } = req.params;
        const { text, image, video, videoThumbnail, fileSizeBytes, book } = req.body as SendMessageBody;
        const senderId = req.user!._id;

        // Validate receiverId format
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID" });
        }

        // Sanitize and validate text
        const trimmedText = text ? text.trim() : '';

        if (!trimmedText && !image && !video && !book) {
            return res.status(400).json({ message: "Message content is required" });
        }

        if (trimmedText && trimmedText.length > 1000) {
            return res.status(400).json({ message: "Message is too long (max 1000 characters)" });
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate conversation ID
        const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

        if (!senderId || !receiverObjectId) {
            console.error(`[Message] Missing senderId (${senderId}) or receiverId (${receiverObjectId}) in /send`);
            return res.status(500).json({ message: "Internal server error: Missing user identifier" });
        }

        const conversationId = Message.getConversationId(senderId, receiverObjectId);

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverObjectId,
            text: trimmedText,
            image,
            video,
            videoThumbnail,
            fileSizeBytes,
            conversationId,
            book,
        });

        await newMessage.save();
        await newMessage.populate("sender", "username profileImage");
        await newMessage.populate("receiver", "username profileImage");

        // Sign the media URLs if they exist before emitting and returning
        await signMessageMedia(newMessage);

        // Emit real-time message via WebSocket
        const io: Server = req.app.get("io");

        // 1. Emit to both sender and receiver rooms for instant sync across all devices
        io.to(senderId.toString()).to(receiverId.toString()).emit("new_message", newMessage);

        // 2. Send push notification to receiver
        const sender = newMessage.sender as any;
        sendPushNotification(receiverId.toString(), {
            title: `New Message from ${sender?.username || 'Bookworm'}`,
            body: trimmedText || (newMessage.image ? "📷 Sent an image" : newMessage.video ? "🎥 Sent a video" : "Sent a message"),
            data: {
                type: "MESSAGE",
                senderId: senderId.toString(),
                senderName: sender?.username,
                profileImage: sender?.profileImage
            }
        }).catch(err => console.error('[Push] Message push failed:', err));

        // Invalidate Redis caches
        await Promise.all([
            redis.del(CACHE_KEYS.CONVERSATIONS(senderId.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(receiverId.toString())),
            redis.del(CACHE_KEYS.MESSAGES(conversationId, senderId.toString())),
            redis.del(CACHE_KEYS.MESSAGES(conversationId, receiverId.toString()))
        ]);

        const messageObj = newMessage.toObject();
        await signMessageMedia(messageObj);

        res.status(201).json(messageObj);
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
            const cachedData = await redis.get<any>(CACHE_KEYS.MESSAGES(conversationId, currentUserId.toString()));
            if (cachedData && cachedData.messages) {
                // Re-sign media as signatures expire
                cachedData.messages = await Promise.all(cachedData.messages.map(signMessageMedia));
                return res.json(cachedData);
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

        // Mark messages as read with timestamps
        await Message.updateMany(
            {
                conversationId,
                receiver: currentUserId,
                read: false,
            },
            {
                $set: {
                    read: true,
                    readAt: new Date(),
                    deliveredAt: new Date() // If read, it's delivered
                }
            }
        );

        // Invalidate conversation list cache to clear unread highlights/count
        await redis.del(CACHE_KEYS.CONVERSATIONS(currentUserId.toString()));

        const messagesWithSignedImages = await Promise.all(
            messages.map(async (msg) => {
                const msgObj = msg.toObject();
                return await signMessageMedia(msgObj);
            })
        );

        const responseData = {
            messages: messagesWithSignedImages, // Returns newest first (Descending)
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
        const cachedConversations: any = await redis.get(CACHE_KEYS.CONVERSATIONS(userId.toString()));
        if (cachedConversations) {
            // Re-sign images from cache as signatures expire
            const signedConvs = await Promise.all(
                cachedConversations.map(async (conv: any) => {
                    if (conv.otherUser) {
                        conv.otherUser.profileImage = await getSignedUrlForFile(conv.otherUser.profileImage);
                    }
                    return conv;
                })
            );
            return res.json({ conversations: signedConvs });
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

                    const signedOtherUser = {
                        ...(otherUser ? (otherUser.toObject ? otherUser.toObject() : otherUser) : { _id: userId, username: "Unknown User", profileImage: "" })
                    };
                    signedOtherUser.profileImage = await getSignedUrlForFile(signedOtherUser.profileImage);

                    return {
                        conversationId: conv._id,
                        otherUser: signedOtherUser,
                        lastMessage: {
                            text: msg.text || (msg.image ? "Sent an image" : msg.video ? "Sent a video" : ""),
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
        const currentUserId = req.user?._id;

        if (!currentUserId || !userId) {
            console.error(`[Message] Missing currentUserId (${currentUserId}) or userId (${userId}) in /mark-read`);
            return res.status(400).json({ message: "Invalid user identifiers" });
        }

        const conversationId = Message.getConversationId(currentUserId, userId);

        await Message.updateMany(
            {
                conversationId,
                receiver: currentUserId,
                read: false,
            },
            {
                $set: {
                    read: true,
                    readAt: new Date(),
                    deliveredAt: new Date() // If it's read, it's definitely delivered
                }
            }
        );

        // Invalidate conversation list cache to clear unread highlights/count
        await redis.del(CACHE_KEYS.CONVERSATIONS(currentUserId.toString()));
        await redis.del(CACHE_KEYS.MESSAGES(conversationId, currentUserId.toString()));

        // Emit read receipt via socket to all of sender's devices
        const io: Server = req.app.get("io");
        io.to(userId).emit("messages_read", {
            conversationId,
            readerId: currentUserId
        });

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

        // Socket update - Emit to both participants for full sync
        const io: Server = req.app.get("io");
        io.to(message.sender.toString()).to(message.receiver.toString()).emit("message_edited", {
            messageId: message._id,
            text: message.text,
            editedAt: message.editedAt,
            conversationId: message.conversationId
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
        const { deleteFileFromS3 } = require("../lib/s3");

        // Purge media from S3 before overwriting metadata
        if (message.image) await deleteFileFromS3(message.image);
        if (message.video) await deleteFileFromS3(message.video);
        if (message.videoThumbnail) await deleteFileFromS3(message.videoThumbnail);

        message.text = "This message was deleted";
        message.image = undefined;
        message.video = undefined;
        message.videoThumbnail = undefined;
        message.isDeleted = true;
        await message.save();

        // Invalidate message threads for both
        await Promise.all([
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.sender.toString())),
            redis.del(CACHE_KEYS.MESSAGES(message.conversationId, message.receiver.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.sender.toString())),
            redis.del(CACHE_KEYS.CONVERSATIONS(message.receiver.toString()))
        ]);

        // Socket update - Emit to both participants for full sync
        const io: Server = req.app.get("io");
        io.to(message.sender.toString()).to(message.receiver.toString()).emit("message_deleted", {
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
