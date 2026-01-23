import mongoose, { Document, Schema, Model } from "mongoose";

export type AchievementType =
    | "FIRST_POST"
    | "BOOK_LOVER_5"
    | "BOOK_LOVER_10"
    | "BOOK_LOVER_25"
    | "BOOK_LOVER_50"
    | "SOCIAL_BUTTERFLY_10"
    | "SOCIAL_BUTTERFLY_25"
    | "STREAK_3"
    | "STREAK_7"
    | "STREAK_30"
    | "POPULAR_POST_10"
    | "POPULAR_POST_50"
    | "COMMENTER_10"
    | "COMMENTER_50"
    | "EXPLORER"
    | "TRENDSETTER";

export interface IAchievement {
    user: mongoose.Types.ObjectId;
    type: AchievementType;
    progress: number;
    unlocked: boolean;
    unlockedAt?: Date;
}

export interface IAchievementDocument extends IAchievement, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const achievementSchema = new Schema<IAchievementDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                "FIRST_POST",
                "BOOK_LOVER_5",
                "BOOK_LOVER_10",
                "BOOK_LOVER_25",
                "BOOK_LOVER_50",
                "SOCIAL_BUTTERFLY_10",
                "SOCIAL_BUTTERFLY_25",
                "STREAK_3",
                "STREAK_7",
                "STREAK_30",
                "POPULAR_POST_10",
                "POPULAR_POST_50",
                "COMMENTER_10",
                "COMMENTER_50",
                "EXPLORER",
                "TRENDSETTER",
            ],
        },
        progress: {
            type: Number,
            default: 0,
        },
        unlocked: {
            type: Boolean,
            default: false,
        },
        unlockedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// Compound index to prevent duplicate achievements
achievementSchema.index({ user: 1, type: 1 }, { unique: true });
achievementSchema.index({ user: 1, unlocked: 1 }); // For getting user's unlocked achievements

const Achievement = mongoose.model<IAchievementDocument>("Achievement", achievementSchema);

export default Achievement;

export interface AchievementDefinition {
    name: string;
    description: string;
    points: number;
    target: number;
}

// Achievement definitions for reference
export const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, AchievementDefinition> = {
    FIRST_POST: { name: "First Steps", description: "Share your first book recommendation", points: 10, target: 1 },
    BOOK_LOVER_5: { name: "Book Lover", description: "Share 5 book recommendations", points: 25, target: 5 },
    BOOK_LOVER_10: { name: "Bookworm", description: "Share 10 book recommendations", points: 50, target: 10 },
    BOOK_LOVER_25: { name: "Book Enthusiast", description: "Share 25 book recommendations", points: 100, target: 25 },
    BOOK_LOVER_50: { name: "Book Master", description: "Share 50 book recommendations", points: 250, target: 50 },
    SOCIAL_BUTTERFLY_10: { name: "Social Butterfly", description: "Receive 10 likes on your posts", points: 30, target: 10 },
    SOCIAL_BUTTERFLY_25: { name: "Community Favorite", description: "Receive 25 likes on your posts", points: 75, target: 25 },
    STREAK_3: { name: "Getting Started", description: "Maintain a 3-day streak", points: 15, target: 3 },
    STREAK_7: { name: "Week Warrior", description: "Maintain a 7-day streak", points: 50, target: 7 },
    STREAK_30: { name: "Dedication Master", description: "Maintain a 30-day streak", points: 200, target: 30 },
    POPULAR_POST_10: { name: "Rising Star", description: "Get 10 likes on a single post", points: 40, target: 10 },
    POPULAR_POST_50: { name: "Viral Hit", description: "Get 50 likes on a single post", points: 150, target: 50 },
    COMMENTER_10: { name: "Conversationalist", description: "Leave 10 comments", points: 20, target: 10 },
    COMMENTER_50: { name: "Discussion Leader", description: "Leave 50 comments", points: 75, target: 50 },
    EXPLORER: { name: "Explorer", description: "Like books from 10 different users", points: 30, target: 10 },
    TRENDSETTER: { name: "Trendsetter", description: "Have a post featured in trending", points: 100, target: 1 },
};
