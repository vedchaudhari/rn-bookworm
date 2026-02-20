import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import Like from "../models/Like";
import Comment from "../models/Comment";
import Follow, { IFollowDocument } from "../models/Follow";
import User, { IUserDocument } from "../models/User";
import Book from "../models/Book";
// @ts-ignore
import { createNotification } from "../lib/notificationService";
import { enrichBooksWithInteractions } from "../lib/bookInteractionService";
import { redis, CACHE_KEYS } from "../lib/redis";
import { getSignedUrlForFile } from "../lib/s3";
import { signBookUrls } from "./bookRoutes";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../utils/AppError";

const router = express.Router();

/**
 * Helper to invalidate profile caches
 */
const invalidateProfileCache = async (userIds: string[]) => {
    await Promise.all(userIds.map(id => redis.del(CACHE_KEYS.USER_PROFILE(id))));
};

// ============= LIKES =============

// Toggle like on a book
router.post("/like/:bookId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bookId } = req.params;
    const userId = req.user!._id;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) throw new AppError("Book not found", 404);

    // Check if already liked
    const existingLike = await Like.findOne({ user: userId, book: bookId });

    if (existingLike) {
        // Unlike
        await existingLike.deleteOne();
        res.json({ message: "Book unliked", liked: false });
    } else {
        // Like
        const newLike = new Like({ user: userId, book: bookId });
        await newLike.save();

        // Create notification for book owner (if not liking own book)
        if (book.user && userId && book.user.toString() !== userId.toString()) {
            await createNotification({
                user: book.user,
                type: "LIKE",
                data: {
                    bookId: book._id,
                    bookTitle: book.title,
                    likedBy: userId,
                    likedByUsername: req.user!.username,
                },
            });
        }

        res.json({ message: "Book liked", liked: true });
    }
}));

// Get users who liked a book
router.get("/likes/:bookId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bookId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const likes = await Like.find({ book: bookId })
        .populate("user", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Filter out null users (in case user was deleted)
    const validLikes = await Promise.all(
        likes
            .filter(like => like.user != null)
            .map(async (like) => {
                const userObj = (like.user as any).toObject ? (like.user as any).toObject() : like.user;
                if (userObj && typeof userObj === 'object') {
                    (userObj as any).profileImage = await getSignedUrlForFile((userObj as any).profileImage);
                }
                return userObj;
            })
    );

    const totalLikes = await Like.countDocuments({ book: bookId });

    res.json({
        likes: validLikes,
        currentPage: page,
        totalLikes,
        totalPages: Math.ceil(totalLikes / limit),
    });
}));

// Check if user liked a book
router.get("/like-status/:bookId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bookId } = req.params;
    const userId = req.user!._id;

    const like = await Like.findOne({ user: userId, book: bookId });
    res.json({ liked: !!like });
}));

// ============= COMMENTS =============

interface CommentBody {
    text: string;
}

// Add comment to a book
router.post("/comment/:bookId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bookId } = req.params;
    const { text } = req.body as CommentBody;
    const userId = req.user!._id;

    if (!text || text.trim().length === 0) {
        throw new AppError("Comment text is required", 400);
    }

    if (text.length > 500) {
        throw new AppError("Comment is too long (max 500 characters)", 400);
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) throw new AppError("Book not found", 404);

    const newComment = new Comment({
        user: userId,
        book: bookId,
        text: text.trim(),
    });

    await newComment.save();
    await newComment.populate("user", "username profileImage");

    // Create notification for book owner (if not commenting on own book)
    if (book.user.toString() !== userId.toString()) {
        await createNotification({
            user: book.user,
            type: "COMMENT",
            data: {
                bookId: book._id,
                bookTitle: book.title,
                commentedBy: userId,
                commentedByUsername: req.user!.username,
                commentText: text.trim(),
            },
        });
    }

    const commentObj = newComment.toObject();
    if (commentObj.user && typeof commentObj.user === 'object') {
        (commentObj.user as any).profileImage = await getSignedUrlForFile((commentObj.user as any).profileImage);
    }

    res.status(201).json(commentObj);
}));

// Get comments for a book
router.get("/comments/:bookId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { bookId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ book: bookId })
        .populate("user", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalComments = await Comment.countDocuments({ book: bookId });

    const commentsWithSignedImages = await Promise.all(
        comments.map(async (comment) => {
            const commentObj = comment.toObject();
            if (commentObj.user && typeof commentObj.user === 'object') {
                (commentObj.user as any).profileImage = await getSignedUrlForFile((commentObj.user as any).profileImage);
            }
            return commentObj;
        })
    );

    res.json({
        comments: commentsWithSignedImages,
        currentPage: page,
        totalComments,
        totalPages: Math.ceil(totalComments / limit),
    });
}));

// Delete own comment
router.delete("/comment/:commentId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const userId = req.user!._id;

    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);

    // Check if user owns the comment
    if (comment.user.toString() !== userId.toString()) {
        throw new AppError("Unauthorized to delete this comment", 403);
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted successfully" });
}));

// ============= FOLLOWS =============

// Toggle follow a user
router.post("/follow/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const followerId = req.user!._id;

    if (userId === followerId.toString()) {
        throw new AppError("You cannot follow yourself", 400);
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
        follower: followerId,
        following: userId,
    });

    if (existingFollow) {
        // Unfollow or Cancel Request
        await existingFollow.deleteOne();
        await invalidateProfileCache([followerId.toString(), userId]);

        // Invalidate feed caches
        try {
            const keys = await redis.keys(`feed:following:${followerId.toString()}:*`);
            if (keys && keys.length > 0) await redis.del(...keys);
        } catch (e) { console.error('Redis feed invalidation error:', e); }

        res.json({
            message: existingFollow.status === 'accepted' ? "User unfollowed" : "Follow request cancelled",
            following: false,
            status: 'none'
        });
    } else {
        // Follow
        const targetUser = await User.findById(userId);
        if (!targetUser) throw new AppError("User not found", 404);

        const status = targetUser.isPrivate ? 'pending' : 'accepted';
        const newFollow = new Follow({
            follower: followerId,
            following: userId,
            status
        });
        await newFollow.save();

        // Create notification
        await createNotification({
            user: userId,
            type: status === 'accepted' ? "FOLLOW" : "FOLLOW_REQUEST",
            data: {
                followedBy: followerId,
                followedByUsername: req.user!.username,
            },
        });

        await invalidateProfileCache([followerId.toString(), userId]);

        // Invalidate feed caches
        try {
            const keys = await redis.keys(`feed:following:${followerId.toString()}:*`);
            if (keys && keys.length > 0) await redis.del(...keys);
        } catch (e) { console.error('Redis feed invalidation error:', e); }

        res.json({
            message: status === 'accepted' ? "User followed" : "Follow request sent",
            following: status === 'accepted',
            status
        });
    }
}));

// Get user's followers
router.get("/followers/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get blocked users
    const currentUser = await import("../models/User").then(m => m.default.findById(currentUserId).select("blockedUsers"));
    const blockedIds = currentUser?.blockedUsers || [];

    const followers = await Follow.find({
        following: userId,
        follower: { $nin: blockedIds } // Filter out blocked users
    })
        .populate("follower", "username profileImage level bio")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Filter out null followers and add isFollowing status
    const validFollowers = await Promise.all(
        followers
            .filter(f => f.follower != null)
            .map(async (f) => {
                const isFollowing = await Follow.findOne({
                    follower: currentUserId,
                    following: (f.follower as unknown as IUserDocument)._id
                });
                const userObj = (f.follower as unknown as IUserDocument).toObject();
                userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
                return {
                    ...userObj,
                    isFollowing: !!isFollowing
                };
            })
    );

    const totalFollowers = await Follow.countDocuments({ following: userId });

    res.json({
        followers: validFollowers,
        currentPage: page,
        totalFollowers,
        totalPages: Math.ceil(totalFollowers / limit),
    });
}));

// Get users being followed
router.get("/following/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get blocked users
    const currentUser = await import("../models/User").then(m => m.default.findById(currentUserId).select("blockedUsers"));
    const blockedIds = currentUser?.blockedUsers || [];

    const following = await Follow.find({
        follower: userId,
        following: { $nin: blockedIds } // Filter out blocked users
    })
        .populate("following", "username profileImage level bio")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Filter out null following and add isFollowing status
    const validFollowing = await Promise.all(
        following
            .filter(f => f.following != null)
            .map(async (f) => {
                const isFollowing = await Follow.findOne({
                    follower: currentUserId,
                    following: (f.following as unknown as IUserDocument)._id
                });
                const userObj = (f.following as unknown as IUserDocument).toObject();
                userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
                return {
                    ...userObj,
                    isFollowing: !!isFollowing
                };
            })
    );

    const totalFollowing = await Follow.countDocuments({ follower: userId });

    res.json({
        following: validFollowing,
        currentPage: page,
        totalFollowing,
        totalPages: Math.ceil(totalFollowing / limit),
    });
}));

// Check if user is following another user
router.get("/follow-status/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const followerId = req.user!._id;

    const follow = await Follow.findOne({
        follower: followerId,
        following: userId,
    });

    res.json({ following: !!follow });
}));

// Get follower and following counts
router.get("/follow-counts/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const followersCount = await Follow.countDocuments({ following: userId });
    const followingCount = await Follow.countDocuments({ follower: userId });

    res.json({
        followersCount,
        followingCount,
    });
}));

// ============= FEED =============

// Get personalized feed (books from followed users)
router.get("/feed", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get users that current user follows
    const following = await Follow.find({ follower: userId }).select("following");
    let followingIds = following.map((f) => f.following);

    // Filter out blocked users
    const currentUser = await User.findById(userId).select("blockedUsers");
    const blockedUsers = currentUser?.blockedUsers.map(id => id.toString()) || [];

    followingIds = followingIds.filter(id => !blockedUsers.includes(id.toString()));

    if (followingIds.length === 0) {
        // Return explicit JSON to stop execution
        res.json({
            books: [],
            currentPage: page,
            totalBooks: 0,
            totalPages: 0,
        });
        return;
    }

    // Get books from followed users
    const books = await Book.find({ user: { $in: followingIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username profileImage level");

    // Get like and comment counts for each book
    const booksWithInteractions = await enrichBooksWithInteractions(books, userId);
    const booksWithSignedUrls = await signBookUrls(booksWithInteractions);

    const totalBooks = await Book.countDocuments({ user: { $in: followingIds } });

    res.json({
        books: booksWithSignedUrls,
        currentPage: page,
        totalBooks,
        totalPages: Math.ceil(totalBooks / limit),
    });
}));

// ============= FOLLOW REQUESTS =============

// Get pending follow requests (for private accounts)
router.get("/requests", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const requests = await Follow.find({
        following: userId,
        status: 'pending'
    }).populate("follower", "username profileImage level bio");

    const requestsWithSignedImages = await Promise.all(
        requests.map(async (reqObj) => {
            const reqJson = reqObj.toObject();
            if (reqJson.follower && typeof reqJson.follower === 'object') {
                (reqJson.follower as any).profileImage = await getSignedUrlForFile((reqJson.follower as any).profileImage);
            }
            return reqJson;
        })
    );

    res.json(requestsWithSignedImages);
}));

// Accept follow request
router.post("/requests/:requestId/accept", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const userId = req.user!._id;

    const follow = await Follow.findOne({
        _id: requestId,
        following: userId,
        status: 'pending'
    });

    if (!follow) throw new AppError("Follow request not found", 404);

    follow.status = 'accepted';
    await follow.save();

    // Notify the follower
    await createNotification({
        user: follow.follower,
        type: "FOLLOW_ACCEPTED",
        data: {
            acceptedBy: userId,
            acceptedByUsername: req.user!.username,
        },
    });

    await invalidateProfileCache([userId.toString(), follow.follower.toString()]);

    res.json({ message: "Follow request accepted", follow });
}));

// Reject follow request
router.post("/requests/:requestId/reject", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const userId = req.user!._id;

    const follow = await Follow.findOne({
        _id: requestId,
        following: userId,
        status: 'pending'
    });

    if (!follow) throw new AppError("Follow request not found", 404);

    await follow.deleteOne();
    await invalidateProfileCache([userId.toString(), follow.follower.toString()]);

    res.json({ message: "Follow request rejected" });
}));

export default router;
