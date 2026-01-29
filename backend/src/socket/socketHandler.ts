import { Server, Socket } from "socket.io";
import { redis, CACHE_KEYS } from "../lib/redis";
import User from "../models/User";

// Extend Socket interface to include userId
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

const disconnectTimers = new Map<string, NodeJS.Timeout>();

let ioInstance: Server | null = null;
export const getIO = () => ioInstance;

export const cleanupSocketTimers = () => {
    disconnectTimers.forEach(timer => clearTimeout(timer));
    disconnectTimers.clear();
};

/**
 * Prunes 'zombie' sockets from Redis that are no longer locally connected.
 * This ensures accurate online/offline status even if devices don't disconnect cleanly.
 */
const cleanupUserSockets = async (userId: string, io: Server) => {
    try {
        const socketIds = await redis.smembers(CACHE_KEYS.USER_SOCKETS(userId));
        if (!socketIds || socketIds.length === 0) return 0;

        const deadSockets: string[] = [];
        const liveSockets: string[] = [];

        for (const sid of socketIds) {
            // If the socket is not in our local server's connected sockets, it's a zombie
            if (!io.sockets.sockets.has(sid)) {
                deadSockets.push(sid);
            } else {
                liveSockets.push(sid);
            }
        }

        if (deadSockets.length > 0) {
            console.log(`[Socket] Pruning ${deadSockets.length} zombie sockets for user ${userId}`);
            await Promise.all([
                ...deadSockets.map(sid => redis.srem(CACHE_KEYS.USER_SOCKETS(userId), sid)),
                ...deadSockets.map(sid => redis.del(CACHE_KEYS.SOCKET_TO_USER(sid)))
            ]);
        }

        // If no live sockets remain, ensure user is marked offline
        if (liveSockets.length === 0) {
            await redis.srem(CACHE_KEYS.ONLINE_USERS, userId);
            io.emit("user_status", { userId, status: "offline", lastActive: new Date() });
            console.log(`[Socket] User ${userId} marked offline after zombie pruning`);
        }

        return liveSockets.length;
    } catch (error) {
        console.error(`[Socket] Error cleaning up sockets for user ${userId}:`, error);
        return 0;
    }
};

export const setupSocketIO = (io: Server) => {
    ioInstance = io;
    io.on("connection", (socket: AuthenticatedSocket) => {
        socket.on("authenticate", async (userId: string) => {
            try {
                if (!userId) return;

                socket.userId = userId;
                // Join user's personal room for multi-device sync
                socket.join(userId);

                console.log(`[Socket] User ${userId} authenticated on socket ${socket.id}`);

                // Clear any pending disconnect timer for this user if they reconnect quickly
                if (disconnectTimers.has(userId)) {
                    clearTimeout(disconnectTimers.get(userId));
                    disconnectTimers.delete(userId);
                }

                // Update Redis presence
                await redis.sadd(CACHE_KEYS.USER_SOCKETS(userId), socket.id);
                await redis.set(CACHE_KEYS.SOCKET_TO_USER(socket.id), userId);
                await redis.sadd(CACHE_KEYS.ONLINE_USERS, userId);

                // Run cleanup to prune zombie sockets from previous crashed sessions
                await cleanupUserSockets(userId, io);

                // Send current online users to this client
                const onlineUsers = await redis.smembers(CACHE_KEYS.ONLINE_USERS);
                socket.emit("active_users", onlineUsers);

                // Broadcast online status to others
                io.emit("user_status", { userId, status: "online", lastActive: new Date() });

                // Catch-up: Find messages received by this user that are not yet marked delivered
                const Message = require("../models/Message").default;
                const undeliveredMessages = await Message.find({
                    receiver: userId,
                    $or: [
                        { deliveredAt: { $exists: false } },
                        { deliveredAt: null }
                    ]
                }).select("_id sender");

                if (undeliveredMessages.length > 0) {
                    console.log(`[Socket] Pushing ${undeliveredMessages.length} pending deliveries to user ${userId}`);
                    socket.emit("pending_delivery", undeliveredMessages.map((m: any) => ({
                        messageId: m._id,
                        senderId: m.sender
                    })));
                }

            } catch (error) {
                console.error("[Socket] Authentication error:", error);
            }
        });

        socket.on("typing_start", (data: { receiverId: string }) => {
            if (socket.userId && data.receiverId) {
                io.to(data.receiverId).emit("typing_start", {
                    senderId: socket.userId
                });
            }
        });

        socket.on("typing_stop", (data: { receiverId: string }) => {
            if (socket.userId && data.receiverId) {
                io.to(data.receiverId).emit("typing_stop", {
                    senderId: socket.userId
                });
            }
        });

        // WhatsApp-style: Message delivered acknowledgment
        socket.on("message_delivered", async (data: { messageId: string, senderId: string }) => {
            try {
                if (!socket.userId || !data.messageId) return;

                const Message = require("../models/Message").default;
                const message = await Message.findById(data.messageId);

                if (message && !message.deliveredAt) {
                    message.deliveredAt = new Date();
                    await message.save();

                    console.log(`[Socket] Message ${message._id} marked delivered for recipient ${socket.userId}`);

                    // Invalidate sender's conversation cache so they see the double tick next time they log in or fetch
                    const conversationId = Message.getConversationId(data.senderId, socket.userId);
                    await redis.del(CACHE_KEYS.MESSAGES(conversationId, data.senderId));
                    console.log(`[Socket] Invalidated cache for sender ${data.senderId}`);

                    // Notify original sender
                    io.to(data.senderId).emit("message_delivered", {
                        messageId: message._id,
                        deliveredAt: message.deliveredAt
                    });
                }
            } catch (error) {
                console.error("[Socket] Error handling message_delivered:", error);
            }
        });

        // WhatsApp-style: Message read acknowledgment
        socket.on("message_read", async (data: { conversationId: string, senderId: string }) => {
            try {
                if (!socket.userId || !data.conversationId) return;

                const Message = require("../models/Message").default;
                const now = new Date();

                // Update all unread messages in this conversation received by this user
                await Message.updateMany(
                    {
                        conversationId: data.conversationId,
                        receiver: socket.userId,
                        $or: [
                            { readAt: { $exists: false } },
                            { readAt: null }
                        ]
                    },
                    {
                        $set: {
                            readAt: now,
                            read: true,
                            deliveredAt: now // If it's read, it's definitely delivered
                        }
                    }
                );

                console.log(`[Socket] Marked all as read in ${data.conversationId} for ${socket.userId}`);

                // Invalidate sender's conversation cache
                await redis.del(CACHE_KEYS.MESSAGES(data.conversationId, data.senderId));
                console.log(`[Socket] Invalidated cache for sender ${data.senderId} after READ`);

                // Notify sender
                io.to(data.senderId).emit("message_read", {
                    conversationId: data.conversationId,
                    readerId: socket.userId,
                    readAt: now
                });
            } catch (error) {
                console.error("[Socket] Error handling message_read:", error);
            }
        });

        socket.on("disconnect", async () => {
            try {
                const userId = socket.userId || await redis.get<string>(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                if (userId) {
                    console.log(`[Redis] User ${userId} socket ${socket.id} disconnected`);

                    await redis.srem(CACHE_KEYS.USER_SOCKETS(userId), socket.id);
                    await redis.del(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                    // Verify remaining sockets are actually alive
                    const actualLiveCount = await cleanupUserSockets(userId, io);

                    if (actualLiveCount === 0) {
                        // Clear existing timer if any
                        if (disconnectTimers.has(userId)) {
                            clearTimeout(disconnectTimers.get(userId));
                        }

                        // Set new disconnect timer
                        const timer = setTimeout(async () => {
                            disconnectTimers.delete(userId); // Cleanup map entry
                            try {
                                const currentSockets = await redis.scard(CACHE_KEYS.USER_SOCKETS(userId));
                                if (currentSockets === 0) {
                                    await redis.srem(CACHE_KEYS.ONLINE_USERS, userId);
                                    io.emit("user_status", { userId, status: "offline", lastActive: new Date() });
                                    console.log(`[Redis] User ${userId} marked as offline`);
                                }
                            } catch (error) {
                                console.error(`[Redis] Error in disconnect grace period for user ${userId}:`, error);
                            }
                        }, 5000);

                        disconnectTimers.set(userId, timer);
                    }
                }
            } catch (error) {
                console.error(`[Redis] Error handling disconnect for socket ${socket.id}:`, error);
            }
        });
    });
};
