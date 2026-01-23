import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import Like from "../models/Like";
import Comment from "../models/Comment";
import {
    getRecommendations,
    getTrendingBooks,
    getBooksByGenre,
    searchBooks,
    getAllGenres,
} from "../lib/recommendationService";
import { enrichBooksWithInteractions } from "../lib/bookInteractionService";
import { IBookDocument } from "../models/Book";

const router = express.Router();

// Search books
router.get("/search", protectRoute, async (req: Request, res: Response) => {
    try {
        const { q, genre, rating, page, limit } = req.query;

        // Escape regex special characters
        const searchQuery = q && typeof q === 'string' ? q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";

        const filters: any = {};
        if (genre) filters.genre = genre;
        if (rating) filters.rating = rating;

        const result = await searchBooks(
            searchQuery,
            filters,
            parseInt(page as string) || 1,
            parseInt(limit as string) || 10
        );

        // Add like and comment counts
        const booksWithCounts = await enrichBooksWithInteractions(result.books, req.user!._id);

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
router.get("/trending", protectRoute, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const trendingBooks: IBookDocument[] = await getTrendingBooks(limit);

        // Add like and comment counts
        const booksWithCounts = await enrichBooksWithInteractions(trendingBooks, req.user!._id);

        res.json({ books: booksWithCounts });
    } catch (error) {
        console.error("Error fetching trending books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get personalized recommendations
router.get("/recommended", protectRoute, async (req: Request, res: Response) => {
    try {
        const userId = req.user!._id;
        const limit = parseInt(req.query.limit as string) || 10;

        const recommendations: IBookDocument[] = await getRecommendations(userId, limit);

        // Add like and comment counts
        const booksWithCounts = await enrichBooksWithInteractions(recommendations, req.user!._id);

        res.json({ books: booksWithCounts });
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all genres
router.get("/genres", protectRoute, async (req: Request, res: Response) => {
    try {
        const genres = await getAllGenres();
        res.json({ genres });
    } catch (error) {
        console.error("Error fetching genres:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get books by genre
router.get("/by-genre/:genre", protectRoute, async (req: Request, res: Response) => {
    try {
        const { genre } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await getBooksByGenre(genre, page, limit);

        // Add like and comment counts
        const booksWithCounts = await enrichBooksWithInteractions(result.books, req.user!._id);

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
