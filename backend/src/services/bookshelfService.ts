// backend/src/services/bookshelfService.ts
import BookshelfItem, { IBookshelfItemDocument, ReadingStatus, Priority } from '../models/BookshelfItem';
import Book from '../models/Book';
import { toObjectId } from '../lib/objectId';
import mongoose from 'mongoose';

/**
 * BOOKSHELF SERVICE
 * 
 * Responsibilities:
 * - Add/remove books to/from user's bookshelf
 * - Update reading status and progress
 * - Manage favorites, ratings, reviews
 * - Handle privacy settings
 * - Track affiliate purchases
 * - Manage reading goals and reminders
 * 
 * Edge Cases Handled:
 * - Duplicate book prevention (unique index)
 * - Progress auto-calculation and validation
 * - Status workflow validation
 * - Privacy filtering for social queries
 * - Soft delete (status change instead of hard delete)
 */

export interface AddBookToShelfParams {
    userId: string;
    bookId: string;
    status?: ReadingStatus;
    priority?: Priority;
    isPrivate?: boolean;
    recommendedByUserId?: string | null;
    targetCompletionDate?: Date | null;
}

export interface UpdateProgressParams {
    currentPage: number;
    totalPages?: number;
}

export interface UpdateStatusParams {
    status: ReadingStatus;
    rating?: number;
    review?: string;
}

export interface BookshelfFilters {
    status?: ReadingStatus | ReadingStatus[];
    isFavorite?: boolean;
    tags?: string[];
    priority?: Priority;
    sortBy?: 'lastReadAt' | 'createdAt' | 'completedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export class BookshelfService {
    /**
     * Internal: Cleanup orphaned bookshelf items for a user
     * Removes items where the associated book no longer exists
     */
    static async cleanupOrphanedItems(userId: string): Promise<void> {
        try {
            const items = await BookshelfItem.find({ userId: toObjectId(userId) }).select('bookId');
            if (items.length === 0) return;

            const bookIds = items.map(i => i.bookId);
            const existingBooks = await Book.find({ _id: { $in: bookIds } }).select('_id');
            const existingBookIds = new Set(existingBooks.map(b => b._id.toString()));

            const orphanedIds = items
                .filter(i => !existingBookIds.has(i.bookId.toString()))
                .map(i => i._id);

            if (orphanedIds.length > 0) {
                await BookshelfItem.deleteMany({ _id: { $in: orphanedIds } });
                console.log(`[Cleanup] Permanently removed ${orphanedIds.length} orphaned items for user ${userId}`);
            }
        } catch (err) {
            console.error("[Cleanup] Error cleaning up orphaned items:", err);
        }
    }

    /**
     * Add a book to user's bookshelf
     * Prevents duplicates via unique index
     */
    static async addBookToShelf(params: AddBookToShelfParams): Promise<IBookshelfItemDocument> {
        const {
            userId,
            bookId,
            status = 'want_to_read',
            priority = 'medium',
            isPrivate = false,
            recommendedByUserId = null,
            targetCompletionDate = null
        } = params;

        // Validate book exists
        const book = await Book.findById(toObjectId(bookId));
        if (!book) {
            throw new Error('BOOK_NOT_FOUND');
        }

        // Check if already on shelf (will throw duplicate key error if exists)
        const existing = await BookshelfItem.findOne({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId)
        });

        if (existing) {
            throw new Error('BOOK_ALREADY_ON_SHELF');
        }

        // Create bookshelf item
        const bookshelfItem = await BookshelfItem.create({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId),
            status,
            priority,
            isPrivate,
            recommendedByUserId: recommendedByUserId ? toObjectId(recommendedByUserId) : null,
            targetCompletionDate,
            totalPages: book.totalPages || 0,
            currentPage: 0,
            progress: 0
        });

        return await bookshelfItem.populate([
            { path: 'bookId', select: 'title author image genre totalPages' },
            { path: 'recommendedByUserId', select: 'username profileImage' }
        ]);
    }

    /**
     * Remove book by Book ID (flexible alternative to removal by BookshelfItem ID)
     * Useful for toggling bookmarks from feeds where we only have the bookId
     */
    static async removeBookByBookId(userId: string, bookId: string): Promise<void> {
        const item = await BookshelfItem.findOne({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId)
        });

        if (!item) {
            throw new Error('BOOK_NOT_FOUND_ON_SHELF');
        }

        await this.removeBook(userId, item.id, true); // Always hard delete for quick toggles
    }

    /**
     * Remove book from shelf
     * Soft delete by default (status -> dropped), hard delete optional
     */
    static async removeBook(
        userId: string,
        bookshelfItemId: string,
        hardDelete: boolean = false
    ): Promise<void> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        if (hardDelete) {
            await BookshelfItem.findByIdAndDelete(bookshelfItemId);
        } else {
            // Soft delete: change status to 'dropped'
            bookshelfItem.status = 'dropped';
            await bookshelfItem.save();
        }
    }

    /**
     * Update reading progress
     * Auto-updates status based on progress
     */
    static async updateProgress(
        userId: string,
        bookshelfItemId: string,
        params: UpdateProgressParams
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        const { currentPage, totalPages } = params;

        // Update total pages if provided
        if (totalPages !== undefined) {
            bookshelfItem.totalPages = totalPages;
        }

        // Use instance method to update progress (handles status auto-update)
        await bookshelfItem.updateProgress(currentPage);

        return bookshelfItem;
    }

    /**
     * Update reading status
     * Validates workflow and handles completion logic
     */
    static async updateStatus(
        userId: string,
        bookshelfItemId: string,
        params: UpdateStatusParams
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        const { status, rating, review } = params;

        // If marking as completed, use dedicated method
        if (status === 'completed') {
            await bookshelfItem.markCompleted(rating, review);
            return bookshelfItem;
        }

        // Update status
        bookshelfItem.status = status;

        // Update timestamps based on status
        if (status === 'currently_reading' && !bookshelfItem.startedReadingAt) {
            bookshelfItem.startedReadingAt = new Date();
        }

        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Update reading status by Book ID
     * Higher-level method that finds or adds the book to shelf first
     */
    static async updateStatusByBookId(
        userId: string,
        bookId: string,
        params: UpdateStatusParams
    ): Promise<IBookshelfItemDocument> {
        let bookshelfItem = await this.getBookshelfItemByBookId(userId, bookId);

        if (!bookshelfItem) {
            // If not on shelf, add it first with the requested status
            bookshelfItem = await this.addBookToShelf({
                userId,
                bookId,
                status: params.status
            });
        } else {
            // Update existing item
            bookshelfItem = await this.updateStatus(userId, bookshelfItem.id, params);
        }

        return bookshelfItem;
    }

    /**
     * Toggle favorite status
     */
    static async toggleFavorite(userId: string, bookshelfItemId: string): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        bookshelfItem.isFavorite = !bookshelfItem.isFavorite;
        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Update rating and review
     */
    static async updateRatingAndReview(
        userId: string,
        bookshelfItemId: string,
        rating?: number,
        review?: string
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                throw new Error('INVALID_RATING');
            }
            bookshelfItem.rating = rating;
        }

        if (review !== undefined) {
            bookshelfItem.review = review.substring(0, 2000);
        }

        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Update privacy setting
     */
    static async updatePrivacy(
        userId: string,
        bookshelfItemId: string,
        isPrivate: boolean
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        bookshelfItem.isPrivate = isPrivate;
        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Add or remove custom tags
     */
    static async updateTags(
        userId: string,
        bookshelfItemId: string,
        tags: string[]
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        // Validate max 20 tags
        if (tags.length > 20) {
            throw new Error('MAX_TAGS_EXCEEDED');
        }

        bookshelfItem.tags = tags;
        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Update priority level
     */
    static async updatePriority(
        userId: string,
        bookshelfItemId: string,
        priority: Priority
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        bookshelfItem.priority = priority;
        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Set or update reading goal (target completion date and reminders)
     */
    static async setReadingGoal(
        userId: string,
        bookshelfItemId: string,
        targetCompletionDate: Date | null,
        reminderEnabled: boolean = false,
        reminderFrequency: 'daily' | 'weekly' | 'biweekly' | null = null
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        bookshelfItem.targetCompletionDate = targetCompletionDate;
        bookshelfItem.reminderEnabled = reminderEnabled;
        bookshelfItem.reminderFrequency = reminderFrequency;

        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Track affiliate purchase
     * Called when user purchases book via app's affiliate link
     */
    static async trackAffiliatePurchase(
        userId: string,
        bookshelfItemId: string,
        revenueInCents: number
    ): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await this.getBookshelfItem(userId, bookshelfItemId);

        bookshelfItem.purchasedViaApp = true;
        bookshelfItem.affiliateRevenue = revenueInCents;

        await bookshelfItem.save();

        return bookshelfItem;
    }

    /**
     * Get user's bookshelf with filters
     * Supports pagination, sorting, and filtering
     */
    static async getBookshelf(userId: string, filters: BookshelfFilters = {}): Promise<{
        items: IBookshelfItemDocument[];
        total: number;
    }> {
        const {
            status,
            isFavorite,
            tags,
            priority,
            sortBy = 'lastReadAt',
            sortOrder = 'desc',
            limit = 20,
            offset = 0
        } = filters;

        // Perform proactive cleanup of orphans first
        await this.cleanupOrphanedItems(userId);

        // Build query
        const query: any = { userId: toObjectId(userId) };

        if (status) {
            query.status = Array.isArray(status) ? { $in: status } : status;
        }

        if (isFavorite !== undefined) {
            query.isFavorite = isFavorite;
        }

        if (tags && tags.length > 0) {
            query.tags = { $in: tags };
        }

        if (priority) {
            query.priority = priority;
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [items, total] = await Promise.all([
            BookshelfItem.find(query)
                .sort(sort)
                .skip(offset)
                .limit(limit)
                .populate('bookId', 'title author image genre')
                .populate('recommendedByUserId', 'username profileImage')
                .lean(),
            BookshelfItem.countDocuments(query)
        ]);

        return { items: items as unknown as IBookshelfItemDocument[], total };
    }

    /**
     * Get single bookshelf item by ID
     * Validates ownership
     */
    static async getBookshelfItem(userId: string, bookshelfItemId: string): Promise<IBookshelfItemDocument> {
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));

        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }

        // Verify ownership
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        return await bookshelfItem.populate([
            { path: 'bookId', select: 'title author image genre totalPages' },
            { path: 'recommendedByUserId', select: 'username profileImage' }
        ]);
    }

    /**
     * Get bookshelf item by book ID
     * Returns null if not on shelf
     */
    static async getBookshelfItemByBookId(
        userId: string,
        bookId: string
    ): Promise<IBookshelfItemDocument | null> {
        const bookshelfItem = await BookshelfItem.findOne({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId)
        });

        return bookshelfItem;
    }

    /**
     * Get user's favorites
     */
    static async getFavorites(userId: string, limit: number = 20): Promise<IBookshelfItemDocument[]> {
        await this.cleanupOrphanedItems(userId);
        return await BookshelfItem.find({
            userId: toObjectId(userId),
            isFavorite: true
        })
            .sort({ lastReadAt: -1 })
            .limit(limit)
            .populate('bookId', 'title author image')
            .lean() as unknown as IBookshelfItemDocument[];
    }

    /**
     * Get currently reading books
     */
    static async getCurrentlyReading(userId: string): Promise<IBookshelfItemDocument[]> {
        await this.cleanupOrphanedItems(userId);
        return await BookshelfItem.find({
            userId: toObjectId(userId),
            status: 'currently_reading'
        })
            .sort({ lastReadAt: -1 })
            .populate('bookId', 'title author image totalPages')
            .lean() as unknown as IBookshelfItemDocument[];
    }

    /**
     * Get recently completed books
     */
    static async getRecentlyCompleted(userId: string, limit: number = 10): Promise<IBookshelfItemDocument[]> {
        await this.cleanupOrphanedItems(userId);
        return await BookshelfItem.find({
            userId: toObjectId(userId),
            status: 'completed'
        })
            .sort({ completedAt: -1 })
            .limit(limit)
            .populate('bookId', 'title author image')
            .lean() as unknown as IBookshelfItemDocument[];
    }

    /**
     * Get books with overdue reading goals
     * Used for reminder notifications
     */
    static async getOverdueGoals(userId: string): Promise<IBookshelfItemDocument[]> {
        await this.cleanupOrphanedItems(userId);
        const now = new Date();

        return await BookshelfItem.find({
            userId: toObjectId(userId),
            reminderEnabled: true,
            targetCompletionDate: { $lt: now },
            status: { $in: ['want_to_read', 'currently_reading', 'paused'] }
        })
            .populate('bookId', 'title author image')
            .lean() as unknown as IBookshelfItemDocument[];
    }

    /**
     * Get bookshelf statistics
     */
    static async getBookshelfStats(userId: string): Promise<{
        totalBooks: number;
        currentlyReading: number;
        completed: number;
        wantToRead: number;
        totalPagesRead: number;
        totalReadingTime: number;
        averageRating: number;
    }> {
        // Perform proactive cleanup of orphans first
        await this.cleanupOrphanedItems(userId);

        const stats = await BookshelfItem.aggregate([
            {
                $match: { userId: toObjectId(userId) }
            },
            {
                $group: {
                    _id: null,
                    totalBooks: { $sum: 1 },
                    currentlyReading: {
                        $sum: { $cond: [{ $eq: ['$status', 'currently_reading'] }, 1, 0] }
                    },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    wantToRead: {
                        $sum: { $cond: [{ $eq: ['$status', 'want_to_read'] }, 1, 0] }
                    },
                    totalReadingTime: { $sum: '$actualReadingTime' },
                    totalPagesRead: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPages', '$currentPage'] }
                    },
                    averageRating: { $avg: '$rating' }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                totalBooks: 0,
                currentlyReading: 0,
                completed: 0,
                wantToRead: 0,
                totalPagesRead: 0,
                totalReadingTime: 0,
                averageRating: 0
            };
        }

        return stats[0];
    }

    /**
     * Discover public bookshelves (social feature)
     * Get books other users are reading (excluding private)
     */
    static async discoverPublicBooks(
        currentUserId: string,
        status: ReadingStatus = 'currently_reading',
        limit: number = 20
    ): Promise<IBookshelfItemDocument[]> {
        // Get current user's blocked list
        const currentUser = await import('../models/User').then(m => m.default.findById(currentUserId).select('blockedUsers'));
        const blockedUsers = currentUser?.blockedUsers || [];

        return await BookshelfItem.find({
            isPrivate: false,
            status,
            userId: { $nin: blockedUsers } // Filter out blocked users
        })
            .sort({ lastReadAt: -1 })
            .limit(limit)
            .populate('userId', 'username profileImage')
            .populate('bookId', 'title author image genre')
            .lean() as unknown as IBookshelfItemDocument[];
    }

    /**
     * Get affiliate revenue stats (for admin/analytics)
     */
    static async getAffiliateStats(userId: string): Promise<{
        totalPurchases: number;
        totalRevenue: number;
    }> {
        const stats = await BookshelfItem.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    purchasedViaApp: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalPurchases: { $sum: 1 },
                    totalRevenue: { $sum: '$affiliateRevenue' }
                }
            }
        ]);

        if (stats.length === 0) {
            return { totalPurchases: 0, totalRevenue: 0 };
        }

        return stats[0];
    }
}

export default BookshelfService;
