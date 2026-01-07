import Book from "../models/Book.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Follow from "../models/Follow.js";
import User from "../models/User.js";

// Get personalized recommendations for a user
export const getRecommendations = async (userId, limit = 10) => {
    try {
        // Get user's liked books to understand preferences
        const userLikes = await Like.find({ user: userId }).populate("book");

        const likedBooks = userLikes
            .map(like => like.book)
            .filter(book => book && book.genre);

        if (likedBooks.length === 0) {
            return await getTrendingBooks(limit);
        }

        const likedGenres = likedBooks.map(book => book.genre);

        const genreCounts = {};
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
                (book) => !likedBookIds.includes(book._id.toString())
            );
            recommendations.push(...trendingFiltered);
        }

        return recommendations;
    } catch (error) {
        console.error("Error getting recommendations:", error);
        return [];
    }
};

// Get trending books (most liked/commented in last 7 days)
export const getTrendingBooks = async (limit = 10) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get recent books
        const recentBooks = await Book.find({
            createdAt: { $gte: sevenDaysAgo },
        }).select("_id");

        const bookIds = recentBooks.map((book) => book._id);

        // Calculate engagement score for each book
        const bookScores = await Promise.all(
            bookIds.map(async (bookId) => {
                const likeCount = await Like.countDocuments({ book: bookId });
                const commentCount = await Comment.countDocuments({ book: bookId });

                // Engagement score: likes * 1 + comments * 2
                const score = likeCount + commentCount * 2;

                return { bookId, score };
            })
        );

        // Sort by score and get top books
        const topBookIds = bookScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.bookId);

        const trendingBooks = await Book.find({ _id: { $in: topBookIds } })
            .populate("user", "username profileImage level");

        // Sort by original score order
        const sortedBooks = topBookIds.map((id) =>
            trendingBooks.find((book) => book._id.toString() === id.toString())
        );

        return sortedBooks.filter(Boolean);
    } catch (error) {
        console.error("Error getting trending books:", error);
        return [];
    }
};

// Get books by genre
export const getBooksByGenre = async (genre, page = 1, limit = 10) => {
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

// Search books
export const searchBooks = async (query, filters = {}, page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery = {};

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
            searchQuery.rating = { $gte: parseInt(filters.rating) };
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
export const getAllGenres = async () => {
    try {
        const genres = await Book.distinct("genre");
        return genres.filter(Boolean).sort();
    } catch (error) {
        console.error("Error getting genres:", error);
        return [];
    }
};
