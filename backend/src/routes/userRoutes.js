import express from "express";
import User from "../models/User.js";
import Follow from "../models/Follow.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Get suggested users to follow
router.get("/suggested", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get users that are NOT the current user AND are not already followed
        const followedUsers = await Follow.find({ follower: userId }).select("following");
        const followedIds = followedUsers.map(f => f.following);

        const suggestedUsers = await User.find({
            _id: { $nin: [...followedIds, userId] }
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
router.get("/search", protectRoute, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [] });

        const users = await User.find({
            username: { $regex: q, $options: "i" },
            _id: { $ne: req.user._id } // exclude self
        }).select("username profileImage level bio");

        // Add follow status
        const usersWithFollowStatus = await Promise.all(
            users.map(async (user) => {
                const isFollowing = await Follow.findOne({
                    follower: req.user._id,
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

// Get User Profile
router.get("/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        const user = await User.findById(userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Calculate stats on the fly
        const followersCount = await Follow.countDocuments({ following: userId });
        const followingCount = await Follow.countDocuments({ follower: userId });
        const bookCount = await Book.countDocuments({ user: userId });

        // Check if current user is following this user
        const isFollowing = await Follow.findOne({ follower: currentUserId, following: userId });

        res.json({
            user: {
                ...user.toObject(),
                followersCount,
                followingCount,
                bookCount
            },
            isFollowing: !!isFollowing
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
