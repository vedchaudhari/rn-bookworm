import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import {
    getRecommendations,
    getTrendingBooks,
    getBooksByGenre,
    searchBooks,
    getAllGenres,
} from "../lib/recommendationService.js";

const router = express.Router();

// Search books
router.get("/search", protectRoute, async (req, res) => {
    try {
        const { q, genre, rating, page, limit } = req.query;

        // Escape regex special characters
        const searchQuery = q ? q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";

        const filters = {};
        if (genre) filters.genre = genre;
        if (rating) filters.rating = rating;

        const result = await searchBooks(
            searchQuery,
            filters,
            parseInt(page) || 1,
            parseInt(limit) || 10
        );

        // Add like and comment counts
        const booksWithCounts = await Promise.all(
            result.books.map(async (book) => {
                const likeCount = await Like.countDocuments({ book: book._id });
                const commentCount = await Comment.countDocuments({ book: book._id });
                const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

                return {
                    ...book.toObject(),
                    likeCount,
                    commentCount,
                    isLiked: !!isLiked,
                };
            })
        );

        res.json({
            ...result,
            books: booksWithCounts,
        });
    } catch (error) {
        console.error("Error searching books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get trending books
router.get("/trending", protectRoute, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const trendingBooks = await getTrendingBooks(limit);

        // Add like and comment counts
        const booksWithCounts = await Promise.all(
            trendingBooks.map(async (book) => {
                const likeCount = await Like.countDocuments({ book: book._id });
                const commentCount = await Comment.countDocuments({ book: book._id });
                const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

                return {
                    ...book.toObject(),
                    likeCount,
                    commentCount,
                    isLiked: !!isLiked,
                };
            })
        );

        res.json({ books: booksWithCounts });
    } catch (error) {
        console.error("Error fetching trending books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get personalized recommendations
router.get("/recommended", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 10;

        const recommendations = await getRecommendations(userId, limit);

        // Add like and comment counts
        const booksWithCounts = await Promise.all(
            recommendations.map(async (book) => {
                const likeCount = await Like.countDocuments({ book: book._id });
                const commentCount = await Comment.countDocuments({ book: book._id });
                const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

                return {
                    ...book.toObject(),
                    likeCount,
                    commentCount,
                    isLiked: !!isLiked,
                };
            })
        );

        res.json({ books: booksWithCounts });
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all genres
router.get("/genres", protectRoute, async (req, res) => {
    try {
        const genres = await getAllGenres();
        res.json({ genres });
    } catch (error) {
        console.error("Error fetching genres:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get books by genre
router.get("/by-genre/:genre", protectRoute, async (req, res) => {
    try {
        const { genre } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await getBooksByGenre(genre, page, limit);

        // Add like and comment counts
        const booksWithCounts = await Promise.all(
            result.books.map(async (book) => {
                const likeCount = await Like.countDocuments({ book: book._id });
                const commentCount = await Comment.countDocuments({ book: book._id });
                const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

                return {
                    ...book.toObject(),
                    likeCount,
                    commentCount,
                    isLiked: !!isLiked,
                };
            })
        );

        res.json({
            ...result,
            books: booksWithCounts,
        });
    } catch (error) {
        console.error("Error fetching books by genre:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
