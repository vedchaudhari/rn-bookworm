import express, { Request, Response } from "express";
import Book, { IBookDocument } from "../models/Book";
import Follow from "../models/Follow";
import protectRoute from "../middleware/auth.middleware";
import Like from "../models/Like";
import Comment from "../models/Comment";
import { enrichBooksWithInteractions } from "../lib/bookInteractionService";
import { getSignedUrlForFile, deleteFileFromS3 } from "../lib/s3";
import { checkBookAccess } from "../middleware/access.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";

const router = express.Router();

interface CreateBookBody {
    title: string;
    caption: string;
    rating: number;
    image: string;
    genre?: string;
    author?: string;
    tags?: string[];
    visibility?: 'public' | 'private';
}

// Helper to sign S3 URLs for books
export const signBookUrls = async (books: any[]) => {
    return Promise.all(books.map(async book => {
        const bookObj = typeof book.toObject === 'function' ? book.toObject() : book;

        if (bookObj.image && bookObj.image.includes('amazonaws.com')) {
            bookObj.image = await getSignedUrlForFile(bookObj.image);
        }

        // Sign PDF URL if it exists
        if (bookObj.pdfUrl && bookObj.pdfUrl.includes('amazonaws.com')) {
            bookObj.pdfUrl = await getSignedUrlForFile(bookObj.pdfUrl);
        }

        // Sign user profile image if populated
        if (bookObj.user && typeof bookObj.user === 'object' && bookObj.user.profileImage) {
            bookObj.user.profileImage = await getSignedUrlForFile(bookObj.user.profileImage);
        }

        return bookObj;
    }));
};

router.post("/", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { title, caption, rating, image, genre, author, tags, visibility } = req.body as CreateBookBody;

    if (!image || !title || !caption || !rating) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    // save to the database
    const newBook = new Book({
        title,
        caption,
        rating,
        image, // Image is already an S3 URL from frontend
        user: req.user!._id,
        genre: genre || "General",
        author: author || "",
        tags: tags || [],
        visibility: visibility || "public",
    });

    await newBook.save();

    // Check achievements after creating book
    // @ts-ignore
    const { checkAchievements } = await import("../lib/achievementService");
    const bookCount = await Book.countDocuments({ user: req.user!._id });

    if (bookCount === 1) await checkAchievements(req.user!._id, "FIRST_POST");
    if (bookCount === 5) await checkAchievements(req.user!._id, "BOOK_LOVER_5");
    if (bookCount === 10) await checkAchievements(req.user!._id, "BOOK_LOVER_10");
    if (bookCount === 25) await checkAchievements(req.user!._id, "BOOK_LOVER_25");
    if (bookCount === 50) await checkAchievements(req.user!._id, "BOOK_LOVER_50");

    // Clear Global Feed Cache
    try {
        const keys = await redis.keys('feed:global:*');
        if (keys.length > 0) await redis.del(...keys);
    } catch (e) { console.error('Redis invalidation error:', e); }

    const [signedBook] = await signBookUrls([newBook]);
    res.status(201).json(signedBook);
}));

// pagination => infinite loading
router.get("/", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const genre = (req.query.genre as string) || 'All';
    const skip = (page - 1) * limit;

    const cacheKey = CACHE_KEYS.FEED_GLOBAL(page, limit, genre);

    try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(cached);
    } catch (e) { console.error('Redis error:', e); }

    const query: any = {};
    if (genre !== 'All') {
        query.genre = genre;
    }

    const [books, totalBooks] = await Promise.all([
        Book.find(query)
            .sort({ createdAt: -1 }) // desc
            .skip(skip)
            .limit(limit)
            .populate("user", "username profileImage level"),
        Book.countDocuments(query)
    ]);

    const booksWithCounts = await enrichBooksWithInteractions(books, req.user!._id);
    const booksWithSignedUrls = await signBookUrls(booksWithCounts);

    const responseData = {
        books: booksWithSignedUrls,
        currentPage: page,
        totalBooks,
        totalPages: Math.ceil(totalBooks / limit),
    };

    try {
        await redis.set(cacheKey, responseData, { ex: TTL.FEED });
    } catch (e) { console.error('Redis set error:', e); }

    res.send(responseData);
}));

router.get("/following", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const genre = (req.query.genre as string) || 'All';
    const skip = (page - 1) * limit;
    const userId = req.user!._id;

    const cacheKey = CACHE_KEYS.FEED_FOLLOWING(userId.toString(), page, limit, genre);

    try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(cached);
    } catch (e) { console.error('Redis error:', e); }

    // 1. Get the list of users followed by the current user
    const following = await Follow.find({ follower: userId }).select("following");
    const followingIds = following.map((f) => f.following);

    if (followingIds.length === 0) {
        const emptyResponse = {
            books: [],
            currentPage: page,
            totalBooks: 0,
            totalPages: 0,
        };
        return res.send(emptyResponse);
    }

    const query: any = { user: { $in: followingIds } };
    if (genre !== 'All') {
        query.genre = genre;
    }

    // 2. Find books created by those users
    const [books, totalBooks] = await Promise.all([
        Book.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("user", "username profileImage level"),
        Book.countDocuments(query)
    ]);

    // 3. Add like and comment counts
    const booksWithCounts = await enrichBooksWithInteractions(books, userId);
    const booksWithSignedUrls = await signBookUrls(booksWithCounts);

    const responseData = {
        books: booksWithSignedUrls,
        currentPage: page,
        totalBooks,
        totalPages: Math.ceil(totalBooks / limit),
    };

    try {
        await redis.set(cacheKey, responseData, { ex: TTL.FEED });
    } catch (e) { console.error('Redis set error:', e); }

    res.send(responseData);
}));

// get recommended books by the logged in user
router.get("/user", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const books = await Book.find({ user: req.user!._id }).sort({ createdAt: -1 });
    const booksWithSignedUrls = await signBookUrls(books);
    res.json(booksWithSignedUrls);
}));

// get books by a specific user (public profile)
router.get("/user/:userId", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const books = await Book.find({ user: userId }).sort({ createdAt: -1 });
    const booksWithSignedUrls = await signBookUrls(books);
    res.json(booksWithSignedUrls);
}));

router.delete("/:id", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if user is the creator of the book
    if (book.user.toString() !== req.user!._id.toString())
        return res.status(401).json({ message: "Unauthorized" });

    // delete PDF from S3 if it exists
    if (book.pdfUrl && book.pdfUrl.includes("amazonaws.com")) {
        await deleteFileFromS3(book.pdfUrl);
    }

    // delete image from S3 if it exists
    if (book.image && book.image.includes("amazonaws.com")) {
        await deleteFileFromS3(book.image);
    }

    await book.deleteOne();

    // Clear Global Feed Cache
    try {
        const keys = await redis.keys('feed:global:*');
        if (keys.length > 0) await redis.del(...keys);
    } catch (e) { console.error('Redis invalidation error:', e); }

    res.json({ message: "Book deleted successfully" });
}));

router.patch("/:id", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const { title, caption, rating, genre, author, tags, visibility } = req.body;
    const book = await Book.findById(req.params.id);

    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if user is the creator of the book
    if (book.user.toString() !== req.user!._id.toString())
        return res.status(401).json({ message: "Unauthorized" });

    // Update fields if provided
    if (title !== undefined) book.title = title;
    if (caption !== undefined) book.caption = caption;
    if (rating !== undefined) book.rating = rating;
    if (genre !== undefined) book.genre = genre;
    if (author !== undefined) book.author = author;
    if (tags !== undefined) book.tags = tags;
    if (visibility !== undefined) book.visibility = visibility;

    await book.save();
    res.json({ message: "Book updated successfully", book });
}));

export default router;
