import { Server, Socket } from "socket.io";
import { redis, CACHE_KEYS } from "../lib/redis";
import User from "../models/User";

// Extend Socket interface to include userId
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

export const setupSocketIO = (io: Server) => {
    io.on("connection", (socket: AuthenticatedSocket) => {
        console.log("Socket connected:", socket.id);

        // User authentication
        socket.on("authenticate", async (userId: string) => {
            console.log(`[Redis] Authenticating user ${userId} on socket ${socket.id}`);
            socket.userId = userId;

            try {
                // 1. Add to global online users set
                await redis.sadd(CACHE_KEYS.ONLINE_USERS, userId);

                // 2. Map socket to user for cleanup
                await redis.set(CACHE_KEYS.SOCKET_TO_USER(socket.id), userId, { ex: 86400 });

                // 3. Add to user's set of active sockets
                await redis.sadd(CACHE_KEYS.USER_SOCKETS(userId), socket.id);

                // Update last active in DB (still needed for permanence)
                // Use await or safely catch to prevent unhandled rejections impacting the socket loop
                await User.findByIdAndUpdate(userId, { lastActiveDate: new Date() }).catch(err =>
                    console.error(`[DB] Error updating lastActive for ${userId}:`, err)
                );

                // Broadcast online status
                io.emit("user_status", { userId, status: "online", lastActive: new Date() });

                // Send active users list
                const activeUsers = await redis.smembers(CACHE_KEYS.ONLINE_USERS);
                socket.emit("active_users", activeUsers);
            } catch (error) {
                console.error(`[Socket] Error during authentication for ${userId}:`, error);
                socket.emit("error", { message: "Authentication failed" });
            }
        });

        // Typing indicators
        socket.on("typing_start", async ({ receiverId }: { receiverId: string }) => {
            if (!socket.userId) return;

            try {
                // Get all active sockets for the receiver
                const receiverSockets = await redis.smembers(CACHE_KEYS.USER_SOCKETS(receiverId));
                if (receiverSockets && receiverSockets.length > 0) {
                    receiverSockets.forEach(sId => {
                        io.to(sId).emit("typing_start", { senderId: socket.userId });
                    });
                }
            } catch (error) {
                console.error(`[Socket] Error in typing_start:`, error);
            }
        });

        socket.on("typing_stop", async ({ receiverId }: { receiverId: string }) => {
            if (!socket.userId) return;

            try {
                const receiverSockets = await redis.smembers(CACHE_KEYS.USER_SOCKETS(receiverId));
                if (receiverSockets && receiverSockets.length > 0) {
                    receiverSockets.forEach(sId => {
                        io.to(sId).emit("typing_stop", { senderId: socket.userId });
                    });
                }
            } catch (error) {
                console.error(`[Socket] Error in typing_stop:`, error);
            }
        });

        socket.on("disconnect", async () => {
            try {
                const userId = socket.userId || await redis.get<string>(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                if (userId) {
                    console.log(`[Redis] User ${userId} socket ${socket.id} disconnected`);

                    // 1. Remove this socket from user's set
                    await redis.srem(CACHE_KEYS.USER_SOCKETS(userId), socket.id);
                    await redis.del(CACHE_KEYS.SOCKET_TO_USER(socket.id));

                    // 2. Check if user has any other active sockets
                    const remainingSockets = await redis.scard(CACHE_KEYS.USER_SOCKETS(userId));

                    if (remainingSockets === 0) {
                        // Wait for a small grace period before marking offline
                        // (handles page refreshes/network blips)
                        setTimeout(async () => {
                            try {
                                // Re-check after grace period to handle reconnections
                                const currentSockets = await redis.scard(CACHE_KEYS.USER_SOCKETS(userId));
                                if (currentSockets === 0) {
                                    await redis.srem(CACHE_KEYS.ONLINE_USERS, userId);
                                    io.emit("user_status", { userId, status: "offline", lastActive: new Date() });
                                    console.log(`[Redis] User ${userId} marked as offline`);
                                } else {
                                    console.log(`[Redis] User ${userId} reconnected during grace period`);
                                }
                            } catch (error) {
                                console.error(`[Redis] Error in disconnect grace period for user ${userId}:`, error);
                            }
                        }, 5000);
                    }
                }
            } catch (error) {
                console.error(`[Redis] Error handling disconnect for socket ${socket.id}:`, error);
            }
        });
    });
};
