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
import { signBookUrls } from "./bookRoutes";
import { asyncHandler } from "../middleware/asyncHandler";

import User from "../models/User";
import { getSignedUrlForFile } from "../lib/s3";

const router = express.Router();

// Search books and users
router.get("/search", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { q, genre, rating, page, limit, type } = req.query;

    const searchQuery = q && typeof q === 'string' ? q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    const currentPage = parseInt(page as string) || 1;
    const currentLimit = parseInt(limit as string) || 10;

    const response: any = {
        books: [],
        users: [],
        currentPage,
        totalPages: 0
    };

    // Book Search
    if (!type || type === 'all' || type === 'books') {
        const filters: any = {};
        if (genre) filters.genre = genre;
        if (rating) filters.rating = rating;

        const result = await searchBooks(
            searchQuery,
            filters,
            currentPage,
            currentLimit
        );

        const booksWithInteractions = await enrichBooksWithInteractions(result.books, req.user!._id);
        const signedBooks = await signBookUrls(booksWithInteractions);

        response.books = signedBooks;
        response.totalBooks = result.totalBooks;
        response.totalPages = Math.max(response.totalPages, result.totalPages);
    }

    // User Search
    if (searchQuery && (!type || type === 'all' || type === 'users')) {
        const users = await User.find({
            username: { $regex: searchQuery, $options: 'i' },
            _id: { $ne: req.user!._id } // Don't search for self
        })
            .select('username profileImage bio level')
            .limit(currentLimit)
            .skip((currentPage - 1) * currentLimit);

        const totalUsers = await User.countDocuments({
            username: { $regex: searchQuery, $options: 'i' },
            _id: { $ne: req.user!._id }
        });

        const usersWithImages = await Promise.all(users.map(async (u) => {
            const userObj = u.toObject();
            userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
            return userObj;
        }));

        response.users = usersWithImages;
        response.totalUsers = totalUsers;
        response.totalPages = Math.max(response.totalPages, Math.ceil(totalUsers / currentLimit));
    }

    res.json(response);
}));

// Get trending books
router.get("/trending", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const trendingBooks: IBookDocument[] = await getTrendingBooks(limit);

    // Add interactions and sign URLs
    const booksWithInteractions = await enrichBooksWithInteractions(trendingBooks, req.user!._id);
    const signedBooks = await signBookUrls(booksWithInteractions);

    res.json({ books: signedBooks });
}));

// Get personalized recommendations
router.get("/recommended", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations: IBookDocument[] = await getRecommendations(userId, limit);

    // Add interactions and sign URLs
    const booksWithInteractions = await enrichBooksWithInteractions(recommendations, req.user!._id);
    const signedBooks = await signBookUrls(booksWithInteractions);

    res.json({ books: signedBooks });
}));

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
router.get("/by-genre/:genre", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { genre } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await getBooksByGenre(genre, page, limit);

    // Add interactions and sign URLs
    const booksWithInteractions = await enrichBooksWithInteractions(result.books, req.user!._id);
    const signedBooks = await signBookUrls(booksWithInteractions);

    res.json({
        ...result,
        books: signedBooks,
    });
}));

export default router;
