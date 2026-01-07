import Achievement, { ACHIEVEMENT_DEFINITIONS } from "../models/Achievement.js";
import Book from "../models/Book.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Follow from "../models/Follow.js";
import User from "../models/User.js";
import { createNotification } from "./notificationService.js";

// Calculate user level based on points
export const calculateLevel = (points) => {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    return Math.floor(Math.sqrt(points / 100)) + 1;
};

// Award points to user and update level
export const awardPoints = async (userId, points) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const newPoints = user.points + points;
        const newLevel = calculateLevel(newPoints);
        const leveledUp = newLevel > user.level;

        user.points = newPoints;
        user.level = newLevel;
        await user.save();

        return { newPoints, newLevel, leveledUp };
    } catch (error) {
        console.error("Error awarding points:", error);
        return null;
    }
};

// Check and unlock achievements
export const checkAchievements = async (userId, achievementType) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        // Get or create achievement
        let achievement = await Achievement.findOne({ user: userId, type: achievementType });

        if (!achievement) {
            achievement = new Achievement({
                user: userId,
                type: achievementType,
                progress: 0,
                unlocked: false,
            });
        }

        if (achievement.unlocked) return null; // Already unlocked

        const definition = ACHIEVEMENT_DEFINITIONS[achievementType];
        if (!definition) return null;

        // Calculate progress based on achievement type
        let currentProgress = 0;

        switch (achievementType) {
            case "FIRST_POST":
            case "BOOK_LOVER_5":
            case "BOOK_LOVER_10":
            case "BOOK_LOVER_25":
            case "BOOK_LOVER_50":
                currentProgress = await Book.countDocuments({ user: userId });
                break;

            case "SOCIAL_BUTTERFLY_10":
            case "SOCIAL_BUTTERFLY_25":
                const userBooks = await Book.find({ user: userId }).select("_id");
                const bookIds = userBooks.map((b) => b._id);
                currentProgress = await Like.countDocuments({ book: { $in: bookIds } });
                break;

            case "STREAK_3":
            case "STREAK_7":
            case "STREAK_30":
                currentProgress = user.currentStreak;
                break;

            case "POPULAR_POST_10":
            case "POPULAR_POST_50":
                const books = await Book.find({ user: userId }).select("_id");
                const likeCounts = await Promise.all(
                    books.map(async (book) => {
                        return await Like.countDocuments({ book: book._id });
                    })
                );
                currentProgress = Math.max(...likeCounts, 0);
                break;

            case "COMMENTER_10":
            case "COMMENTER_50":
                currentProgress = await Comment.countDocuments({ user: userId });
                break;

            case "EXPLORER":
                const likes = await Like.find({ user: userId }).populate("book", "user");
                const uniqueUsers = new Set(likes.map((like) => like.book.user.toString()));
                currentProgress = uniqueUsers.size;
                break;

            default:
                currentProgress = 0;
        }

        achievement.progress = currentProgress;

        // Check if unlocked
        if (currentProgress >= definition.target && !achievement.unlocked) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            await achievement.save();

            // Award points
            await awardPoints(userId, definition.points);

            // Create notification
            await createNotification({
                user: userId,
                type: "ACHIEVEMENT",
                data: {
                    achievementType,
                    achievementName: definition.name,
                    achievementDescription: definition.description,
                    points: definition.points,
                },
            });

            return { unlocked: true, achievement, definition };
        }

        await achievement.save();
        return { unlocked: false, achievement, definition };
    } catch (error) {
        console.error("Error checking achievements:", error);
        return null;
    }
};

// Update user streak
export const updateStreak = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastActive = new Date(user.lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Same day, no change
            return { streak: user.currentStreak, updated: false };
        } else if (daysDiff === 1) {
            // Consecutive day, increment streak
            user.currentStreak += 1;
            user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
            user.lastActiveDate = new Date();
            await user.save();

            // Check streak achievements
            if (user.currentStreak === 3) await checkAchievements(userId, "STREAK_3");
            if (user.currentStreak === 7) await checkAchievements(userId, "STREAK_7");
            if (user.currentStreak === 30) await checkAchievements(userId, "STREAK_30");

            return { streak: user.currentStreak, updated: true };
        } else {
            // Streak broken
            user.currentStreak = 1;
            user.lastActiveDate = new Date();
            await user.save();
            return { streak: user.currentStreak, updated: true, broken: true };
        }
    } catch (error) {
        console.error("Error updating streak:", error);
        return null;
    }
};

// Get all achievement definitions
export const getAllAchievementDefinitions = () => {
    return ACHIEVEMENT_DEFINITIONS;
};
