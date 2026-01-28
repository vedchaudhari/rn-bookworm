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

                // Send current online users to this client
                const onlineUsers = await redis.smembers(CACHE_KEYS.ONLINE_USERS);
                socket.emit("active_users", onlineUsers);

                // Broadcast online status to others
                io.emit("user_status", { userId, status: "online", lastActive: new Date() });

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

        socket.on("disconnect", async () => {
            try {
                const userId = socket.userId || await redis.get<string>(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                if (userId) {
                    console.log(`[Redis] User ${userId} socket ${socket.id} disconnected`);

                    await redis.srem(CACHE_KEYS.USER_SOCKETS(userId), socket.id);
                    await redis.del(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                    const remainingSockets = await redis.scard(CACHE_KEYS.USER_SOCKETS(userId));

                    if (remainingSockets === 0) {
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
