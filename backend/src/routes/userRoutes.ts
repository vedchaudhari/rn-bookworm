import express, { Request, Response } from "express";
import User, { IUserDocument } from "../models/User";
import Follow from "../models/Follow";
import Book from "../models/Book";
import protectRoute from "../middleware/auth.middleware";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";
import { z } from 'zod';
import { deleteFileFromS3, getPresignedPutUrl } from '../lib/s3';

const router = express.Router();

// Profile Image Validation Schema
const profileImageSchema = z.object({
    profileImage: z.string()
        .url('Invalid URL format')
        .regex(
            /^https:\/\/.*\.s3\..*\.amazonaws\.com\/profiles\/.*\.(jpg|jpeg|png|webp)$/i,
            'Profile image must be from S3 profiles folder with valid image extension'
        )
});

// Get suggested users to follow
router.get("/suggested", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;

        // Get users that are NOT the current user AND are not already followed AND not blocked
        const currentUser = await User.findById(userId).select("blockedUsers");
        const blockedByIds = currentUser?.blockedUsers || [];

        const followedUsers = await Follow.find({ follower: userId }).select("following");
        const followedIds = followedUsers.map(f => f.following);

        const suggestedUsers = await User.find({
            _id: { $nin: [...followedIds, userId, ...blockedByIds] }
        })
            .limit(10)
            .select("username profileImage level bio");

        res.json({ users: suggestedUsers });
    } catch (error) {
        console.error("Error fetching suggested users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Search users
router.get("/search", protectRoute, async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') return res.json({ users: [] });

        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Get blocked users
        const currentUser = await User.findById(req.user!._id).select("blockedUsers");
        const blockedIds = currentUser?.blockedUsers || [];

        const users = await User.find({
            username: { $regex: escaped, $options: "i" },
            _id: { $nin: [req.user!._id, ...blockedIds] } // exclude self and blocked users
        }).select("username profileImage level bio");

        // Add follow status
        const usersWithFollowStatus = await Promise.all(
            users.map(async (user) => {
                const isFollowing = await Follow.findOne({
                    follower: req.user!._id,
                    following: user._id
                });
                return {
                    ...user.toObject(),
                    isFollowing: !!isFollowing
                };
            })
        );

        res.json({ users: usersWithFollowStatus });
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get presigned URL for profile image upload
router.get("/presigned-url/profile-image", protectRoute, async (req: Request, res: Response) => {
    try {
        const { fileName, contentType } = req.query;

        if (!fileName || !contentType) {
            return res.status(400).json({
                message: "fileName and contentType are required"
            });
        }

        // Validate content type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(contentType as string)) {
            return res.status(400).json({
                message: "Invalid content type. Must be JPEG, PNG, or WebP"
            });
        }

        // Import at top if not already
        const { getPresignedPutUrl } = await import('../lib/s3');

        const data = await getPresignedPutUrl(
            fileName as string,
            contentType as string,
            'profiles' // Use 'profiles' folder
        );

        res.json(data);
    } catch (error) {
        console.error("Error generating presigned URL for profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get User Profile
router.get("/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!._id;

        // Validate userId format
        if (!userId || userId === 'undefined' || userId === 'null') {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // 1. Try Cache First
        const cachedUser = await redis.get(CACHE_KEYS.USER_PROFILE(userId));
        if (cachedUser) {
            // Stats might be stale if cached, so we decide whether to cache the whole response 
            // or just the profile. Re-fetching stats for fresh data but caching profile info.
            // For extreme speed, we cache the whole thing.
            return res.json(cachedUser);
        }

        const user = await User.findById(userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Calculate stats on the fly
        const followersCount = await Follow.countDocuments({ following: userId });
        const followingCount = await Follow.countDocuments({ follower: userId });
        const bookCount = await Book.countDocuments({ user: userId });

        // Check if current user is following this user
        const isFollowing = await Follow.findOne({ follower: currentUserId, following: userId });

        const responseData = {
            user: {
                ...user.toObject(),
                followersCount,
                followingCount,
                bookCount
            },
            isFollowing: !!isFollowing
        };

        // 2. Cache result
        await redis.set(CACHE_KEYS.USER_PROFILE(userId), responseData, { ex: TTL.PROFILE });

        res.json(responseData);
    } catch (error: any) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Block User
router.post("/block/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!._id;

        // Validate userId
        if (!userId || userId === currentUserId.toString()) {
            return res.status(400).json({
                success: false,
                message: userId === currentUserId.toString() ? "You cannot block yourself" : "Invalid user ID"
            });
        }

        // Check if user exists
        const userToBlock = await User.findById(userId);
        if (!userToBlock) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if already blocked
        const currentUser = await User.findById(currentUserId).select('blockedUsers');
        const isAlreadyBlocked = currentUser?.blockedUsers.some(id => id.toString() === userId);

        if (isAlreadyBlocked) {
            return res.status(400).json({
                success: false,
                message: "User is already blocked"
            });
        }

        // Add to blocked list
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { blockedUsers: userId }
        });

        // Invalidate caches
        await Promise.all([
            redis.del(CACHE_KEYS.USER_PROFILE(currentUserId.toString())),
            redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()))
        ]);

        // Remove follow relationships in both directions
        await Promise.all([
            Follow.findOneAndDelete({ follower: currentUserId, following: userId }),
            Follow.findOneAndDelete({ follower: userId, following: currentUserId })
        ]);

        res.json({
            success: true,
            message: "User blocked successfully"
        });
    } catch (error: any) {
        console.error("Error blocking user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Unblock User
router.post("/unblock/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user!._id;

        // Validate userId
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        // Remove from blocked list
        const result = await User.findByIdAndUpdate(
            currentUserId,
            { $pull: { blockedUsers: userId } },
            { new: true }
        );

        // Invalidate caches
        await Promise.all([
            redis.del(CACHE_KEYS.USER_PROFILE(currentUserId.toString())),
            redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()))
        ]);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User unblocked successfully"
        });
    } catch (error: any) {
        console.error("Error unblocking user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Report User/Post/Comment
router.post("/report", protectRoute, async (req: Request, res: Response) => {
    try {
        const { reportedEntityId, entityType, reason, details } = req.body;
        const reporterId = req.user!._id;

        // Validate required fields
        if (!reportedEntityId || !entityType || !reason) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: reportedEntityId, entityType, reason"
            });
        }

        // Validate entityType
        const validEntityTypes = ['post', 'user', 'comment'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid entityType. Must be: post, user, or comment"
            });
        }

        // Validate reason
        const validReasons = ['spam', 'harassment', 'inappropriate_content', 'misinformation', 'copyright', 'other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reason"
            });
        }

        // Create report
        const Report = (await import("../models/Report")).default;
        const report = await Report.create({
            reporterId,
            reportedEntityId,
            entityType,
            reason,
            details: details || '',
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: "Report submitted successfully. Thank you for helping keep our community safe.",
            report: {
                _id: report._id,
                status: report.status,
                createdAt: report.createdAt
            }
        });
    } catch (error: any) {
        console.error("Error submitting report:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

// Update Profile
router.put("/profile", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bio, username, profileImage } = req.body;
        const userId = req.user!._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { bio, username, profileImage } },
            { new: true }
        ).select("-password");

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        // Invalidate Redis cache
        await redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()));

        res.json({ success: true, user: updatedUser });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update Profile Image with S3 cleanup
router.put("/update-profile-image", protectRoute, async (req: Request, res: Response) => {
    try {
        // Validate input
        const parsed = profileImageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: parsed.error.errors[0].message
            });
        }

        const { profileImage } = parsed.data;
        const userId = req.user!._id;

        // Get current user with existing profile image
        const user = await User.findById(userId).select('profileImage');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete old profile image from S3 (if exists and is S3 URL)
        if (user.profileImage &&
            user.profileImage.includes('amazonaws.com') &&
            user.profileImage !== profileImage) {
            try {
                await deleteFileFromS3(user.profileImage);
                console.log(`[S3] Deleted old profile image for user ${userId}`);
            } catch (deleteError) {
                // Log but don't fail the update
                console.error('[S3] Failed to delete old profile image:', deleteError);
            }
        }

        // Update with new image
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { profileImage } },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Invalidate Redis cache
        await redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()));

        res.json({ success: true, user: updatedUser });
    } catch (error: any) {
        console.error("Error updating profile image:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

export default router;
