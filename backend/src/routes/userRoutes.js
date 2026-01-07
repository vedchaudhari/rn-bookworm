import express from "express";
import User from "../models/User.js";
import Follow from "../models/Follow.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

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

// Update Profile Image
router.put("/update-profile-image", protectRoute, async (req, res) => {
    try {
        const { profileImage } = req.body;
        const userId = req.user._id;

        if (!profileImage) {
            return res.status(400).json({ message: "Profile image is required" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage },
            { new: true }
        ).select("-password");

        res.json({ message: "Profile image updated", user });
    } catch (error) {
        console.error("Error updating profile image:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
