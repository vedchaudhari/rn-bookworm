import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Follow from "../models/Follow.js";
import Book from "../models/Book.js";
import { createNotification } from "../lib/notificationService.js";

const router = express.Router();

// ============= LIKES =============

// Toggle like on a book
router.post("/like/:bookId", protectRoute, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user._id;

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
            if (book.user.toString() !== userId.toString()) {
                await createNotification({
                    user: book.user,
                    type: "LIKE",
                    data: {
                        bookId: book._id,
                        bookTitle: book.title,
                        likedBy: userId,
                        likedByUsername: req.user.username,
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
router.get("/likes/:bookId", protectRoute, async (req, res) => {
    try {
        const { bookId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const likes = await Like.find({ book: bookId })
            .populate("user", "username profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out null users (in case user was deleted)
        const validLikes = likes
            .filter(like => like.user != null)
            .map((like) => like.user);

        const totalLikes = await Like.countDocuments({ book: bookId });

        res.json({
            likes: validLikes,
            currentPage: page,
            totalLikes,
            totalPages: Math.ceil(totalLikes / limit),
        });
    } catch (error) {
        console.error("Error fetching likes:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Check if user liked a book
router.get("/like-status/:bookId", protectRoute, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user._id;

        const like = await Like.findOne({ user: userId, book: bookId });
        res.json({ liked: !!like });
    } catch (error) {
        console.error("Error checking like status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ============= COMMENTS =============

// Add comment to a book
router.post("/comment/:bookId", protectRoute, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

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
                    commentedByUsername: req.user.username,
                    commentText: text.trim(),
                },
            });
        }

        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get comments for a book
router.get("/comments/:bookId", protectRoute, async (req, res) => {
    try {
        const { bookId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ book: bookId })
            .populate("user", "username profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalComments = await Comment.countDocuments({ book: bookId });

        res.json({
            comments,
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
router.delete("/comment/:commentId", protectRoute, async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

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
router.post("/follow/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const followerId = req.user._id;

        if (userId === followerId.toString()) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        // Check if already following
        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: userId,
        });

        if (existingFollow) {
            // Unfollow
            await existingFollow.deleteOne();
            return res.json({ message: "User unfollowed", following: false });
        } else {
            // Follow
            const newFollow = new Follow({
                follower: followerId,
                following: userId,
            });
            await newFollow.save();

            // Create notification
            await createNotification({
                user: userId,
                type: "FOLLOW",
                data: {
                    followedBy: followerId,
                    followedByUsername: req.user.username,
                },
            });

            return res.json({ message: "User followed", following: true });
        }
    } catch (error) {
        console.error("Error toggling follow:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user's followers
router.get("/followers/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const followers = await Follow.find({ following: userId })
            .populate("follower", "username profileImage level")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out null followers (in case user was deleted)
        const validFollowers = followers
            .filter(f => f.follower != null)
            .map((f) => f.follower);

        const totalFollowers = await Follow.countDocuments({ following: userId });

        res.json({
            followers: validFollowers,
            currentPage: page,
            totalFollowers,
            totalPages: Math.ceil(totalFollowers / limit),
        });
    } catch (error) {
        console.error("Error fetching followers:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get users being followed
router.get("/following/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const following = await Follow.find({ follower: userId })
            .populate("following", "username profileImage level")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out null following (in case user was deleted)
        const validFollowing = following
            .filter(f => f.following != null)
            .map((f) => f.following);

        const totalFollowing = await Follow.countDocuments({ follower: userId });

        res.json({
            following: validFollowing,
            currentPage: page,
            totalFollowing,
            totalPages: Math.ceil(totalFollowing / limit),
        });
    } catch (error) {
        console.error("Error fetching following:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Check if user is following another user
router.get("/follow-status/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const followerId = req.user._id;

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
router.get("/follow-counts/:userId", protectRoute, async (req, res) => {
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
router.get("/feed", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get users that current user follows
        const following = await Follow.find({ follower: userId }).select("following");
        const followingIds = following.map((f) => f.following);

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
        const booksWithCounts = await Promise.all(
            books.map(async (book) => {
                const likeCount = await Like.countDocuments({ book: book._id });
                const commentCount = await Comment.countDocuments({ book: book._id });
                const isLiked = await Like.findOne({ user: userId, book: book._id });

                return {
                    ...book.toObject(),
                    likeCount,
                    commentCount,
                    isLiked: !!isLiked,
                };
            })
        );

        const totalBooks = await Book.countDocuments({ user: { $in: followingIds } });

        res.json({
            books: booksWithCounts,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
        });
    } catch (error) {
        console.error("Error fetching feed:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
