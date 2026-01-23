import mongoose from "mongoose";
import Book, { IBookDocument } from "../models/Book";
import Like from "../models/Like";
import Comment from "../models/Comment";
// import Follow from "../models/Follow";
// import User from "../models/User";

interface PaginatedBooks {
    books: IBookDocument[];
    currentPage: number;
    totalBooks: number;
    totalPages: number;
}

// Get trending books (most liked/commented in last 7 days)
export const getTrendingBooks = async (limit = 10): Promise<IBookDocument[]> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Use aggregation to calculate scores efficiently
        const topBooksWithScore = await Book.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "book",
                    as: "likes"
                }
            },
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "book",
                    as: "comments"
                }
            },
            {
                $project: {
                    _id: 1,
                    score: {
                        $add: [
                            { $size: "$likes" },
                            { $multiply: [{ $size: "$comments" }, 2] }
                        ]
                    }
                }
            },
            { $sort: { score: -1 } },
            { $limit: limit }
        ]);

        const topBookIds = topBooksWithScore.map((b) => b._id);

        if (topBookIds.length === 0) return [];

        const trendingBooks = await Book.find({ _id: { $in: topBookIds } })
            .populate("user", "username profileImage level");

        // Sort by original score order
        const sortedBooks = topBookIds.map((id: any) =>
            trendingBooks.find((book) => book._id.toString() === id.toString())
        ).filter((book: any) => book !== undefined) as IBookDocument[];

        return sortedBooks;
    } catch (error) {
        console.error("Error getting trending books:", error);
        return [];
    }
};

// Get personalized recommendations for a user
export const getRecommendations = async (userId: string | mongoose.Types.ObjectId, limit = 10): Promise<IBookDocument[]> => {
    try {
        // Get user's liked books to understand preferences
        const userLikes = await Like.find({ user: userId }).populate("book");

        const likedBooks = userLikes
            .map(like => like.book as unknown as IBookDocument) // cast populated field
            .filter(book => book && book.genre);

        if (likedBooks.length === 0) {
            return await getTrendingBooks(limit);
        }

        const likedGenres = likedBooks.map(book => book.genre);

        const genreCounts: Record<string, number> = {};
        likedGenres.forEach((genre) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });

        // Get most liked genre
        const topGenre = Object.keys(genreCounts).sort(
            (a, b) => genreCounts[b] - genreCounts[a]
        )[0];

        // Find books in the same genre that user hasn't liked
        const likedBookIds = likedBooks.map((book) => book._id);

        const recommendations = await Book.find({
            genre: topGenre,
            _id: { $nin: likedBookIds },
            user: { $ne: userId }, // Don't recommend own books
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("user", "username profileImage level");

        // If not enough recommendations, fill with trending
        if (recommendations.length < limit) {
            const trending = await getTrendingBooks(limit - recommendations.length);
            const trendingFiltered = trending.filter(
                (book) => !likedBookIds.some(id => id.toString() === book._id.toString())
            );
            recommendations.push(...(trendingFiltered as any));
        }

        return recommendations;
    } catch (error) {
        console.error("Error getting recommendations:", error);
        return [];
    }
};

// Get books by genre
export const getBooksByGenre = async (genre: string, page = 1, limit = 10): Promise<PaginatedBooks> => {
    try {
        const skip = (page - 1) * limit;

        const books = await Book.find({ genre })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("user", "username profileImage level");

        const totalBooks = await Book.countDocuments({ genre });

        return {
            books,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
        };
    } catch (error) {
        console.error("Error getting books by genre:", error);
        return { books: [], currentPage: 1, totalBooks: 0, totalPages: 0 };
    }
};

interface SearchFilters {
    genre?: string;
    rating?: string | number;
}

// Search books
export const searchBooks = async (query: string, filters: SearchFilters = {}, page = 1, limit = 10): Promise<PaginatedBooks> => {
    try {
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery: any = {};

        if (query) {
            searchQuery.$or = [
                { title: { $regex: query, $options: "i" } },
                { author: { $regex: query, $options: "i" } },
                { caption: { $regex: query, $options: "i" } },
                { tags: { $in: [new RegExp(query, "i")] } },
            ];
        }

        if (filters.genre) {
            searchQuery.genre = filters.genre;
        }

        if (filters.rating) {
            searchQuery.rating = { $gte: parseInt(filters.rating.toString()) };
        }

        const books = await Book.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("user", "username profileImage level");

        const totalBooks = await Book.countDocuments(searchQuery);

        return {
            books,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
        };
    } catch (error) {
        console.error("Error searching books:", error);
        return { books: [], currentPage: 1, totalBooks: 0, totalPages: 0 };
    }
};

// Get all unique genres
export const getAllGenres = async (): Promise<string[]> => {
    try {
        const genres = await Book.distinct("genre");
        return genres.filter(Boolean).sort();
    } catch (error) {
        console.error("Error getting genres:", error);
        return [];
    }
};
