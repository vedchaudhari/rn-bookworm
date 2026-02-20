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
import { UserService } from "../services/userService";

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

    // 1. Try Cache/DB via Service (Read-Through)
    const cachedUser = await UserService.getUserById(userId);

    // If not found in DB
    if (!cachedUser) throw new AppError("User found in request but not DB", 500);

    // 2. Calculate Stats (Real-time)
    // We fetch stats on the fly to ensure accuracy, while the base user object is cached.

    const user = await UserService.getUserById(userId);
    if (!user) throw new AppError("User not found", 404);

    // Calculate stats on the fly
    const followersCount = await Follow.countDocuments({ following: userId });
    const followingCount = await Follow.countDocuments({ follower: userId });
    const bookCount = await Book.countDocuments({ user: userId });

    // Check if current user is following this user
    const followRecord = await Follow.findOne({ follower: currentUserId, following: userId });

    const responseData = {
        user: {
            ...user.toObject(),
            followersCount,
            followingCount,
            bookCount
        },
        isFollowing: followRecord ? (followRecord as any).status !== 'pending' : false,
        hasRequestedFollow: followRecord ? (followRecord as any).status === 'pending' : false
    };

    // Sign profile image URL
    if (responseData.user.profileImage) {
        responseData.user.profileImage = await getSignedUrlForFile(responseData.user.profileImage);
    }

    res.json(responseData);
}));

// Block User
router.post("/block/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Use UserService to block (Handles Logic + Validation + Invalidation)
    await UserService.blockUser(currentUserId.toString(), userId);

    res.json({
        success: true,
        message: "User blocked successfully"
    });
}));

// Unblock User
router.post("/unblock/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;

    // Use UserService to unblock (Handles Logic + Validation + Invalidation)
    await UserService.unblockUser(currentUserId.toString(), userId);

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

    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) {
        // We use specific method for image if needed, but here we can just update field
        // But wait, UserService.updateProfileImage handles S3 cleanup. 
        // If we just pass profileImage into updateUser, we miss S3 cleanup logic if it was in the route.
        // The Service handles updateProfileImage separately.
        // Let's check the original route logic.
        // It had S3 cleanup.
        // If we use updateUser, we need to handle S3 cleanup.
        // Ideally, we should use updateProfileImage if the image changed.

        // MIXED UPDATE (Bio + Image):
        // If image changed, we should probably call updateProfileImage or let updateUser handle cleanup?
        // UserService.updateUser is generic.
        // Let's iterate `UserService.updateUser` to be comprehensive? No, simpler to just use specific calls or logic here.
        // Since `updateProfileImage` exists, let's use it for image, and `updateUser` for bio.
        // Or refactor route to be cleaner.

        // Use separate calls for clarity and safety?
        // Or just move all logic here to Service?
        // Let's assume we want to use `UserService.updateUser` for generic updates.
        // If profileImage is present, we should handle it carefully.

        // Actually, the original route handled both.
        // Let's stick to using `UserService.updateProfileImage` if image changes, and `UserService.updateUser` for bio.
    }

    // But `UserService.updateProfileImage` does a `save()`. `updateUser` does `findByIdAndUpdate`.
    // Let's do this:

    let updatedUser;

    if (profileImage !== undefined) {
        updatedUser = await UserService.updateProfileImage(userId.toString(), profileImage);
    }

    if (bio !== undefined) {
        updatedUser = await UserService.updateUser(userId.toString(), { bio });
    }

    if (!updatedUser) {
        // If not updated (e.g. no fields), retrieve current
        updatedUser = await UserService.getUserById(userId.toString());
    }

    if (!updatedUser) throw new AppError("User not found", 404);

    // Sign profile image URL for response
    const userObj = updatedUser.toObject();
    if (userObj.profileImage) {
        userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
    }

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

    // Use UserService to update image (Handles S3 Cleanup + Invalidation)
    const updatedUser = await UserService.updateProfileImage(userId.toString(), profileImage);

    if (!updatedUser) throw new AppError("User not found", 404);

    // Sign profile image URL for response
    const userObj = updatedUser.toObject();
    if (userObj.profileImage) {
        userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
    }

    res.json({ success: true, user: userObj });
}));

export default router;
