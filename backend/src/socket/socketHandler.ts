import { Server, Socket } from "socket.io";
import { redis, CACHE_KEYS } from "../lib/redis";
import User from "../models/User";

// Extend Socket interface to include userId
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

const disconnectTimers = new Map<string, NodeJS.Timeout>();

export const cleanupSocketTimers = () => {
    disconnectTimers.forEach(timer => clearTimeout(timer));
    disconnectTimers.clear();
};

export const setupSocketIO = (io: Server) => {
    io.on("connection", (socket: AuthenticatedSocket) => {
        // ... (existing connection logic) ...

        socket.on("authenticate", async (userId: string) => {
            // ...
            // Clear any pending disconnect timer for this user if they reconnect quickly
            if (disconnectTimers.has(userId)) {
                clearTimeout(disconnectTimers.get(userId));
                disconnectTimers.delete(userId);
            }
            // ... (rest of auth logic)
        });

        // ... (typing logic) ...

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
