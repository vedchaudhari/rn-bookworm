import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Achievement from "../models/Achievement.js";
import ReadingGoal from "../models/ReadingGoal.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import {
    checkAchievements,
    getAllAchievementDefinitions,
    updateStreak,
} from "../lib/achievementService.js";
import { createNotification } from "../lib/notificationService.js";

const router = express.Router();

// ============= ACHIEVEMENTS =============

// Get user's achievements
router.get("/achievements", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;

        const achievements = await Achievement.find({ user: userId });
        const definitions = getAllAchievementDefinitions();

        // Create achievement objects with definitions
        const achievementsWithDetails = Object.keys(definitions).map((type) => {
            const userAchievement = achievements.find((a) => a.type === type);
            return {
                type,
                ...definitions[type],
                progress: userAchievement?.progress || 0,
                unlocked: userAchievement?.unlocked || false,
                unlockedAt: userAchievement?.unlockedAt || null,
            };
        });

        res.json({ achievements: achievementsWithDetails });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get leaderboard
router.get("/leaderboard", protectRoute, async (req, res) => {
    try {
        const period = req.query.period || "all"; // all, weekly, monthly
        const limit = parseInt(req.query.limit) || 50;

        let query = {};

        if (period === "weekly") {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            query.createdAt = { $gte: weekAgo };
        } else if (period === "monthly") {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query.createdAt = { $gte: monthAgo };
        }

        const users = await User.find(query)
            .select("username profileImage level points currentStreak")
            .sort({ points: -1 })
            .limit(limit);

        // Add rank
        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            userId: user._id,
            username: user.username,
            profileImage: user.profileImage,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
        }));

        // Find current user's rank
        const currentUserRank = leaderboard.findIndex(
            (entry) => entry.userId.toString() === req.user._id.toString()
        );

        res.json({
            leaderboard,
            currentUserRank: currentUserRank !== -1 ? currentUserRank + 1 : null,
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ============= READING GOALS =============

// Create reading goal
router.post("/goal", protectRoute, async (req, res) => {
    try {
        const { targetBooks, period, endDate } = req.body;
        const userId = req.user._id;

        if (!targetBooks || targetBooks < 1) {
            return res.status(400).json({ message: "Target books must be at least 1" });
        }

        // Check if user already has an active goal
        const existingGoal = await ReadingGoal.findOne({
            user: userId,
            status: "active",
        });

        if (existingGoal) {
            return res.status(400).json({ message: "You already have an active reading goal" });
        }

        const newGoal = new ReadingGoal({
            user: userId,
            targetBooks,
            period: period || "monthly",
            endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        });

        await newGoal.save();
        res.status(201).json(newGoal);
    } catch (error) {
        console.error("Error creating reading goal:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user's reading goals
router.get("/goals", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        const status = req.query.status; // active, completed, failed, or all

        const query = { user: userId };
        if (status && status !== "all") {
            query.status = status;
        }

        const goals = await ReadingGoal.find(query).sort({ createdAt: -1 });

        res.json({ goals });
    } catch (error) {
        console.error("Error fetching reading goals:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update reading goal progress
router.put("/goal/:goalId", protectRoute, async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.user._id;

        const goal = await ReadingGoal.findOne({ _id: goalId, user: userId });
        if (!goal) return res.status(404).json({ message: "Goal not found" });

        if (goal.status !== "active") {
            return res.status(400).json({ message: "Cannot update inactive goal" });
        }

        // Increment current books
        goal.currentBooks += 1;

        // Check if goal completed
        if (goal.currentBooks >= goal.targetBooks) {
            goal.status = "completed";

            // Create notification
            await createNotification({
                user: userId,
                type: "GOAL_COMPLETED",
                data: {
                    goalId: goal._id,
                    targetBooks: goal.targetBooks,
                },
            });
        }

        await goal.save();
        res.json(goal);
    } catch (error) {
        console.error("Error updating reading goal:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ============= USER STATS =============

// Get user statistics
router.get("/stats", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select(
            "level points currentStreak longestStreak"
        );

        const totalBooks = await Book.countDocuments({ user: userId });

        const achievements = await Achievement.countDocuments({
            user: userId,
            unlocked: true,
        });

        const activeGoals = await ReadingGoal.countDocuments({
            user: userId,
            status: "active",
        });

        const completedGoals = await ReadingGoal.countDocuments({
            user: userId,
            status: "completed",
        });

        res.json({
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            totalBooks,
            unlockedAchievements: achievements,
            activeGoals,
            completedGoals,
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update user streak (called when user opens app)
router.post("/update-streak", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await updateStreak(userId);

        if (!result) {
            return res.status(500).json({ message: "Failed to update streak" });
        }

        res.json(result);
    } catch (error) {
        console.error("Error updating streak:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
