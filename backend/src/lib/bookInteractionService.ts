import { toObjectId } from "./objectId";
import mongoose from "mongoose";
import Book, { IBookDocument } from "../models/Book";
import Like from "../models/Like";
import Comment from "../models/Comment";
import BookshelfItem from "../models/BookshelfItem";

/**
 * Enriches a list of books with their interaction counts (likes, comments) and the current user's like status.
 * Optimized to use aggregation/batch queries to avoid N+1 query problem.
 * 
 * @param books The array of book documents (mongoose documents or plain objects)
 * @param userId The current user's ID (to check isLiked and isBookmarked)
 * @returns Array of books with `likeCount`, `commentCount`, `isLiked`, and `isBookmarked` properties
 */
export const enrichBooksWithInteractions = async (
    books: IBookDocument[] | any[],
    userId: string | mongoose.Types.ObjectId
) => {
    if (books.length === 0) return [];

    const bookIds = books.map((b) => b._id);

    // 1. Get Like Counts in batch
    const likeCounts = await Like.aggregate([
        { $match: { book: { $in: bookIds } } },
        { $group: { _id: "$book", count: { $sum: 1 } } },
    ]);
    const likeCountMap = new Map(likeCounts.map((item) => [item._id.toString(), item.count]));

    // 2. Get Comment Counts in batch
    const commentCounts = await Comment.aggregate([
        { $match: { book: { $in: bookIds } } },
        { $group: { _id: "$book", count: { $sum: 1 } } },
    ]);
    const commentCountMap = new Map(commentCounts.map((item) => [item._id.toString(), item.count]));

    // 3. Get User's Like Status in batch
    let likedBookIds = new Set<string>();
    let bookmarkedBookIds = new Set<string>();

    if (userId) {
        const userObjId = toObjectId(userId);

        const userLikes = await Like.find({
            user: userObjId,
            book: { $in: bookIds },
        }).select("book");
        likedBookIds = new Set(userLikes.map((like) => like.book.toString()));

        // 4. Get User's Bookshelf Status in batch
        const bookshelfItems = await BookshelfItem.find({
            userId: userObjId,
            bookId: { $in: bookIds },
        }).select("bookId");

        bookmarkedBookIds = new Set(bookshelfItems.map((item) => item.bookId.toString()));

        // Paranoid logging in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[InteractionService] Enriching ${books.length} books for user ${userId}`);
            console.log(`[InteractionService] Found ${bookmarkedBookIds.size} bookmarks on shelf`);
            if (bookmarkedBookIds.size > 0) {
                console.log(`[InteractionService] Bookmarked IDs: ${Array.from(bookmarkedBookIds).join(', ')}`);
            }
        }
    }

    // 5. Merge data
    return books.map((book) => {
        const bookObj = book.toObject ? book.toObject() : book;
        const bookIdVal = (bookObj._id || bookObj.id).toString();

        const isBookmarked = bookmarkedBookIds.has(bookIdVal);

        return {
            ...bookObj,
            likeCount: likeCountMap.get(bookIdVal) || 0,
            commentCount: commentCountMap.get(bookIdVal) || 0,
            isLiked: likedBookIds.has(bookIdVal),
            isBookmarked: isBookmarked,
        };
    });
};
