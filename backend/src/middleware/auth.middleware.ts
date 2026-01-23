import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import User, { IUserDocument } from "../models/User";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";

// Extend the Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: IUserDocument;
        }
    }
}

interface DecodedToken extends JwtPayload {
    userId: string;
}

const protectRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader) {
            return res.status(401).json({ message: "No authentication token, access denied" });
        }

        // Defensive: Remove 'Bearer ' (case insensitive) and trim whitespace
        // Also removes quotes if present
        const token = authHeader
            .replace(/^Bearer\s+/i, "")
            .replace(/^["'](.*)["']$/, '$1')
            .trim();

        if (!token) {
            return res.status(401).json({ message: "Token is empty" });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            // Internal error, pass to global handler
            return next(new Error("Internal Server Error: JWT_SECRET missing"));
        }

        try {
            const decoded = jwt.verify(token, secret) as DecodedToken;
            const userId = decoded.userId;

            // 1. Try fetching user from Redis cache first
            const cachedUser = await redis.get(CACHE_KEYS.USER_PROFILE(userId));

            if (cachedUser) {
                try {
                    const userObj = cachedUser as any;

                    // Ensure _id is a real ObjectId
                    if (userObj._id && typeof userObj._id === 'string') {
                        userObj._id = new mongoose.Types.ObjectId(userObj._id);
                    }

                    // Hydrate to ensure it has Mongoose methods if needed
                    const hydratedUser = User.hydrate(userObj);

                    // Refresh TTL on cache hit
                    await redis.expire(CACHE_KEYS.USER_PROFILE(userId), TTL.PROFILE);

                    req.user = hydratedUser;
                    return next();

                } catch (cacheError) {
                    console.error(`[Auth] Cache hydration error for user ${userId}:`, cacheError);
                    // Fallback to DB
                }
            }

            // 2. Cache miss - find user in MongoDB
            const user = await User.findById(userId).select("-password");

            if (!user) {
                console.warn(`User found in token but not DB: ${userId}`);
                return res.status(401).json({ message: "Token is not valid" });
            }

            // 3. Store in Redis for subsequent requests
            try {
                await redis.set(CACHE_KEYS.USER_PROFILE(userId), user.toObject(), { ex: TTL.PROFILE });
            } catch (redisError) {
                console.error(`[Auth] Failed to cache user ${userId}:`, redisError);
            }

            req.user = user;
            next();

        } catch (jwtError: any) {
            console.error(`JWT Verification Failed: ${jwtError.message}`);
            return res.status(401).json({ message: "Token is not valid" });
        }

    } catch (error: any) {
        next(error);
    }
};

export default protectRoute;
