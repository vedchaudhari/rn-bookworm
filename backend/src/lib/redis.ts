import { Redis } from '@upstash/redis'
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
    console.warn('[Redis] Warning: REDIS_URL or REDIS_TOKEN not found in environment variables.');
}

/**
 * Upstash Redis Client
 * HTTP-based client, perfect for serverless and high-performance apps.
 */
export const redis = new Redis({
    url: process.env.REDIS_URL || '',
    token: process.env.REDIS_TOKEN || '',
});

// Cache Key Helpers
export const CACHE_KEYS = {
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    CONVERSATIONS: (userId: string) => `user:conversations:${userId}`,
    MESSAGES: (conversationId: string, userId: string) => `conversation:messages:${conversationId}:${userId}`,
    ONLINE_USERS: 'online_users',
    USER_SOCKETS: (userId: string) => `user:sockets:${userId}`,
    SOCKET_TO_USER: (socketId: string) => `socket:user:${socketId}`,
};

// Default TTLs (Time To Live)
export const TTL = {
    PROFILE: 3600, // 1 hour
    CONVERSATIONS: 1800, // 30 minutes
    MESSAGES: 600, // 10 minutes
};

/**
 * Check if Redis is healthy (optional ping)
 */
export const checkRedis = async () => {
    try {
        await redis.ping();
        console.log('[Redis] Connected to Upstash successfully.');
        return true;
    } catch (error) {
        console.error('[Redis] Connection failed:', error);
        return false;
    }
}
