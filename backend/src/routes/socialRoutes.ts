import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import Like, { ILikeDocument } from "../models/Like";
import Comment, { ICommentDocument } from "../models/Comment";
import Follow, { IFollowDocument } from "../models/Follow";
import User, { IUserDocument } from "../models/User";
import Book, { IBookDocument } from "../models/Book";
// @ts-ignore
import { createNotification } from "../lib/notificationService";
import { enrichBooksWithInteractions } from "../lib/bookInteractionService";
import { redis, CACHE_KEYS } from "../lib/redis";
import { getSignedUrlForFile } from "../lib/s3";
import { signBookUrls } from "./bookRoutes";
import { asyncHandler } from "../middleware/asyncHandler";

const router = express.Router();

/**
 * Helper to invalidate profile caches
 */
const invalidateProfileCache = async (userIds: string[]) => {
    await Promise.all(userIds.map(id => redis.del(CACHE_KEYS.USER_PROFILE(id))));
};

// ============= LIKES =============

// Toggle like on a book
router.post("/like/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const userId = req.user!._id;

        // Check if book exists
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });

        // Check if already liked
        const existingLike = await Like.findOne({ user: userId, book: bookId });

        if (existingLike) {
            // Unlike
            await existingLike.deleteOne();
            return res.json({ message: "Book unliked", liked: false });
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

            return res.json({ message: "Book liked", liked: true });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get users who liked a book
router.get("/likes/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
        console.error("Error fetching likes:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Check if user liked a book
router.get("/like-status/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const userId = req.user!._id;

        const like = await Like.findOne({ user: userId, book: bookId });
        res.json({ liked: !!like });
    } catch (error) {
        console.error("Error checking like status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ============= COMMENTS =============

interface CommentBody {
    text: string;
}

// Add comment to a book
router.post("/comment/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { text } = req.body as CommentBody;
        const userId = req.user!._id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        if (text.length > 500) {
            return res.status(400).json({ message: "Comment is too long (max 500 characters)" });
        }

        // Check if book exists
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });

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
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get comments for a book
router.get("/comments/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete own comment
router.delete("/comment/:commentId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = req.user!._id;

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Check if user owns the comment
        if (comment.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        await comment.deleteOne();
        res.json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ============= FOLLOWS =============

// Toggle follow a user
router.post("/follow/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const followerId = req.user!._id;

        if (userId === followerId.toString()) {
            return res.status(400).json({ message: "You cannot follow yourself" });
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

            return res.json({
                message: existingFollow.status === 'accepted' ? "User unfollowed" : "Follow request cancelled",
                following: false,
                status: 'none'
            });
        } else {
            // Follow
            const targetUser = await User.findById(userId);
            if (!targetUser) return res.status(404).json({ message: "User not found" });

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

            return res.json({
                message: status === 'accepted' ? "User followed" : "Follow request sent",
                following: status === 'accepted',
                status
            });
        }
    } catch (error) {
        console.error("Error toggling follow:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user's followers
router.get("/followers/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
        console.error("Error fetching followers:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get users being followed
router.get("/following/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
        console.error("Error fetching following:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Check if user is following another user
router.get("/follow-status/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const followerId = req.user!._id;

        const follow = await Follow.findOne({
            follower: followerId,
            following: userId,
        });

        res.json({ following: !!follow });
    } catch (error) {
        console.error("Error checking follow status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get follower and following counts
router.get("/follow-counts/:userId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const followersCount = await Follow.countDocuments({ following: userId });
        const followingCount = await Follow.countDocuments({ follower: userId });

        res.json({
            followersCount,
            followingCount,
        });
    } catch (error) {
        console.error("Error fetching follow counts:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

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
        return res.json({
            books: [],
            currentPage: page,
            totalBooks: 0,
            totalPages: 0,
        });
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
router.get("/requests", protectRoute, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error("Error fetching follow requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Accept follow request
router.post("/requests/:requestId/accept", protectRoute, async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const userId = req.user!._id;

        const follow = await Follow.findOne({
            _id: requestId,
            following: userId,
            status: 'pending'
        });

        if (!follow) return res.status(404).json({ message: "Follow request not found" });

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
    } catch (error) {
        console.error("Error accepting follow request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Reject follow request
router.post("/requests/:requestId/reject", protectRoute, async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const userId = req.user!._id;

        const follow = await Follow.findOne({
            _id: requestId,
            following: userId,
            status: 'pending'
        });

        if (!follow) return res.status(404).json({ message: "Follow request not found" });

        await follow.deleteOne();
        await invalidateProfileCache([userId.toString(), follow.follower.toString()]);

        res.json({ message: "Follow request rejected" });
    } catch (error) {
        console.error("Error rejecting follow request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
