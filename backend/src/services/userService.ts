import User, { IUserDocument } from "../models/User";
import Follow from "../models/Follow";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";
import { AppError } from "../utils/AppError";
import { deleteFileFromS3 } from "../lib/s3";
import mongoose from "mongoose";

export class UserService {
    /**
     * Get user by ID with Read-Through Caching
     */
    static async getUserById(userId: string): Promise<IUserDocument | null> {
        try {
            // 1. Try Cache
            const cachedUser = await redis.get(CACHE_KEYS.USER_PROFILE(userId));
            if (cachedUser) {
                // Hydrate the plain object back to a Mongoose document if needed, 
                // but usually producing a lean object is better for performance.
                // However, auth middleware expects a document for methods like comparePassword (though usually not called on cached profile).
                // For safety in middleware, we hydrate it.
                // NOTE: Cached user excludes password usually.
                return User.hydrate(cachedUser) as IUserDocument;
            }
        } catch (error) {
            console.error(`[Cache] Redis error for user ${userId}:`, error);
            // Fallback to DB on error
        }

        // 2. DB Fetch
        const user = await User.findById(userId);
        if (!user) return null;

        // 3. Cache Set (Background)
        try {
            await redis.set(CACHE_KEYS.USER_PROFILE(userId), user.toObject(), { ex: TTL.PROFILE });
        } catch (error) {
            console.error(`[Cache] Failed to set cache for user ${userId}:`, error);
        }

        return user;
    }

    /**
     * Invalidate user caches
     */
    static async invalidateUser(userId: string) {
        try {
            await Promise.all([
                redis.del(CACHE_KEYS.USER_PROFILE(userId)),
                // Add other related keys here if needed
            ]);
        } catch (error) {
            console.error(`[Cache] Invalidation failed for user ${userId}:`, error);
        }
    }

    /**
     * Update User Profile
     */
    static async updateUser(userId: string, updateData: Partial<IUserDocument>): Promise<IUserDocument | null> {
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (user) {
            await this.invalidateUser(userId);
        }
        return user;
    }

    /**
     * Update Profile Image with S3 cleanup
     */
    static async updateProfileImage(userId: string, newImageUrl: string): Promise<IUserDocument | null> {
        const user = await User.findById(userId);
        if (!user) throw new AppError("User not found", 404);

        // Delete old image if it's an S3 URL
        if (user.profileImage &&
            user.profileImage.includes('amazonaws.com') &&
            user.profileImage !== newImageUrl) {
            try {
                await deleteFileFromS3(user.profileImage);
            } catch (err) {
                console.error('[S3] Failed to delete old image:', err);
            }
        }

        user.profileImage = newImageUrl;
        await user.save();

        await this.invalidateUser(userId);

        return user;
    }

    /**
     * Block User
     */
    static async blockUser(currentUserId: string, targetUserId: string) {
        // Validation
        if (currentUserId === targetUserId) throw new AppError("Cannot block yourself", 400);

        const user = await User.findById(currentUserId);
        if (!user) throw new AppError("User not found", 404);

        if (user.blockedUsers.some(id => id.toString() === targetUserId)) {
            throw new AppError("User is already blocked", 400);
        }

        // Add to blocked list
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { blockedUsers: targetUserId }
        });

        // Remove follow relationships
        await Promise.all([
            Follow.findOneAndDelete({ follower: currentUserId, following: targetUserId }),
            Follow.findOneAndDelete({ follower: targetUserId, following: currentUserId })
        ]);

        // Invalidate BOTH users
        await Promise.all([
            this.invalidateUser(currentUserId),
            this.invalidateUser(targetUserId)
        ]);

        return true;
    }

    /**
     * Unblock User
     */
    static async unblockUser(currentUserId: string, targetUserId: string) {
        const user = await User.findByIdAndUpdate(
            currentUserId,
            { $pull: { blockedUsers: targetUserId } },
            { new: true }
        );

        if (!user) throw new AppError("User not found", 404);

        // Invalidate BOTH users
        await Promise.all([
            this.invalidateUser(currentUserId),
            this.invalidateUser(targetUserId)
        ]);

        return true;
    }

    /**
     * Update Password
     */
    static async updatePassword(userId: string, newPassword: string) {
        const user = await User.findById(userId).select('+password');
        if (!user) throw new AppError("User not found", 404);

        user.password = newPassword;
        await user.save();

        await this.invalidateUser(userId);
    }
}
