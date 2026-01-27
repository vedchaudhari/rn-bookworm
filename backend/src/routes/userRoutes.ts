import express, { Request, Response } from "express";
import User, { IUserDocument } from "../models/User";
import Follow from "../models/Follow";
import Book from "../models/Book";
import protectRoute from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../utils/AppError";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";
import { z } from 'zod';
import { deleteFileFromS3, getPresignedPutUrl, getSignedUrlForFile } from '../lib/s3';

const router = express.Router();

// Profile Image Validation Schema
const profileImageSchema = z.object({
    profileImage: z.string()
        .url('Invalid URL format')
        .regex(
            /^https:\/\/.*\.amazonaws\.com\/.*profiles\/.*\.(jpg|jpeg|png|webp)$/i,
            'Profile image must be a valid S3 URL with an image extension'
        )
});

// Get suggested users to follow
router.get("/suggested", protectRoute, asyncHandler(async (req: Request, res: Response) => {
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

    const usersWithSignedImages = await Promise.all(
        suggestedUsers.map(async (user) => {
            const userObj = user.toObject();
            userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
            return userObj;
        })
    );

    res.json({ users: usersWithSignedImages });
}));

// Search users
router.get("/search", protectRoute, asyncHandler(async (req: Request, res: Response) => {
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

    const usersWithSignedImages = await Promise.all(
        usersWithFollowStatus.map(async (user) => {
            return {
                ...user,
                profileImage: await getSignedUrlForFile(user.profileImage)
            };
        })
    );

    res.json({ users: usersWithSignedImages });
}));

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

        const data = await getPresignedPutUrl(
            fileName as string,
            contentType as string,
            req.user!._id.toString(), // Add path isolation
            'profiles' // Use 'profiles' folder
        );

        res.json(data);
    } catch (error) {
        console.error("Error generating presigned URL for profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get User Profile
router.get("/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Validate userId format
    if (!userId || userId === 'undefined' || userId === 'null') {
        throw new AppError("Invalid user ID", 400);
    }

    // 1. Try Cache First
    const cachedUser: any = await redis.get(CACHE_KEYS.USER_PROFILE(userId));
    if (cachedUser) {
        // Robust signing for both nested and flat cache formats
        if (cachedUser.user && cachedUser.user.profileImage) {
            cachedUser.user.profileImage = await getSignedUrlForFile(cachedUser.user.profileImage);
        } else if (cachedUser.profileImage) {
            cachedUser.profileImage = await getSignedUrlForFile(cachedUser.profileImage);
        }
        res.json(cachedUser);
        return;
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

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

    // Sign profile image URL
    responseData.user.profileImage = await getSignedUrlForFile(responseData.user.profileImage);

    res.json(responseData);
}));

// Block User
router.post("/block/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Validate userId
    if (!userId || userId === currentUserId.toString()) {
        throw new AppError(userId === currentUserId.toString() ? "You cannot block yourself" : "Invalid user ID", 400);
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) throw new AppError("User not found", 404);

    // Check if already blocked
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const isAlreadyBlocked = currentUser?.blockedUsers.some(id => id.toString() === userId);

    if (isAlreadyBlocked) throw new AppError("User is already blocked", 400);

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
}));

// Unblock User
router.post("/unblock/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Validate userId
    if (!userId) throw new AppError("Invalid user ID", 400);

    // Remove from blocked list
    const result = await User.findByIdAndUpdate(
        currentUserId,
        { $pull: { blockedUsers: userId } },
        { new: true }
    );

    if (!result) throw new AppError("User not found", 404);

    // Invalidate caches
    await Promise.all([
        redis.del(CACHE_KEYS.USER_PROFILE(currentUserId.toString())),
        redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()))
    ]);

    res.json({
        success: true,
        message: "User unblocked successfully"
    });
}));

// Report User/Post/Comment
router.post("/report", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { reportedEntityId, entityType, reason, details } = req.body;
    const reporterId = req.user!._id;

    // Validate required fields
    if (!reportedEntityId || !entityType || !reason) {
        throw new AppError("Missing required fields: reportedEntityId, entityType, reason", 400);
    }

    // Validate entityType
    const validEntityTypes = ['post', 'user', 'comment'];
    if (!validEntityTypes.includes(entityType)) {
        throw new AppError("Invalid entityType. Must be: post, user, or comment", 400);
    }

    // Validate reason
    const validReasons = ['spam', 'harassment', 'inappropriate_content', 'misinformation', 'copyright', 'other'];
    if (!validReasons.includes(reason)) {
        throw new AppError("Invalid reason", 400);
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
}));

// Update Profile
router.put("/profile", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bio, username, profileImage } = req.body;
    const userId = req.user!._id;

    const updatedUser = await User.findById(userId).select("-password");
    if (!updatedUser) throw new AppError("User not found", 404);

    // S3 Cleanup
    if (updatedUser.profileImage &&
        updatedUser.profileImage.includes('amazonaws.com') &&
        updatedUser.profileImage !== profileImage) {
        try {
            await deleteFileFromS3(updatedUser.profileImage);
            console.log(`[S3] Deleted old profile image for user ${userId} during generic profile update`);
        } catch (err) {
            console.error('[S3] Generic update cleanup failed:', err);
        }
    }

    if (bio !== undefined) updatedUser.bio = bio;
    if (username !== undefined) updatedUser.username = username;
    if (profileImage !== undefined) updatedUser.profileImage = profileImage;
    await updatedUser.save();

    // Invalidate Redis cache
    await redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()));

    // Sign profile image URL for response
    const userObj = updatedUser.toObject();
    userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);

    res.json({ success: true, user: userObj });
}));

// Update Profile Image with S3 cleanup
router.put("/update-profile-image", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const parsed = profileImageSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
    }

    const { profileImage } = parsed.data;
    const userId = req.user!._id;

    // Get current user with existing profile image
    const user = await User.findById(userId).select('profileImage');
    if (!user) throw new AppError("User not found", 404);

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

    if (!updatedUser) throw new AppError("User not found", 404);

    // Invalidate Redis cache
    await redis.del(CACHE_KEYS.USER_PROFILE(userId.toString()));

    // Sign profile image URL for response
    const userObj = updatedUser.toObject();
    userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);

    res.json({ success: true, user: userObj });
}));

export default router;
