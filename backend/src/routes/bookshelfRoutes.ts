// backend/src/routes/bookshelfRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import BookshelfService from '../services/bookshelfService';
import { z } from 'zod';

import { runDataCleanup } from '../utils/dbCleanup';
import { signBookUrls } from './bookRoutes';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * BOOKSHELF ROUTES
 * 
 * Endpoints:
 * - GET    /api/bookshelf              - Get user's bookshelf with filters
 * - POST   /api/bookshelf/maintenance/cleanup - Run database cleanup script
 * - POST   /api/bookshelf              - Add book to shelf
 * - GET    /api/bookshelf/stats        - Get bookshelf statistics
 * - GET    /api/bookshelf/favorites    - Get favorite books
 * - GET    /api/bookshelf/reading      - Get currently reading books
 * - GET    /api/bookshelf/completed    - Get completed books
 * - GET    /api/bookshelf/overdue      - Get overdue reading goals
 * - GET    /api/bookshelf/public       - Discover public bookshelves
 * - GET    /api/bookshelf/:id          - Get single bookshelf item
 * - PATCH  /api/bookshelf/:id/status   - Update reading status
 * - PATCH  /api/bookshelf/:id/progress - Update reading progress
 * - PATCH  /api/bookshelf/:id/favorite - Toggle favorite status
 * - PATCH  /api/bookshelf/:id/rating   - Update rating and review
 * - PATCH  /api/bookshelf/:id/privacy  - Update privacy setting
 * - PATCH  /api/bookshelf/:id/tags     - Update tags
 * - PATCH  /api/bookshelf/:id/priority - Update priority
 * - PATCH  /api/bookshelf/:id/goal     - Set reading goal
 * - DELETE /api/bookshelf/:id          - Remove book from shelf
 */

// ==================== VALIDATION SCHEMAS ====================

const addBookSchema = z.object({
    bookId: z.string().min(1, 'Book ID is required'),
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    isPrivate: z.boolean().optional(),
    recommendedByUserId: z.string().optional().nullable(),
    targetCompletionDate: z.string().datetime().optional().nullable()
});

const updateStatusSchema = z.object({
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped']),
    rating: z.number().min(1).max(5).optional(),
    review: z.string().max(2000).optional()
});

const updateProgressSchema = z.object({
    currentPage: z.number().min(0),
    totalPages: z.number().min(0).optional()
});

const updateRatingSchema = z.object({
    rating: z.number().min(1).max(5).optional(),
    review: z.string().max(2000).optional()
});

const updatePrivacySchema = z.object({
    isPrivate: z.boolean()
});

const updateTagsSchema = z.object({
    tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed')
});

const updatePrioritySchema = z.object({
    priority: z.enum(['low', 'medium', 'high', 'urgent'])
});

const setReadingGoalSchema = z.object({
    targetCompletionDate: z.string().datetime().nullable(),
    reminderEnabled: z.boolean().optional(),
    reminderFrequency: z.enum(['daily', 'weekly', 'biweekly']).nullable().optional()
});

const bookshelfFiltersSchema = z.object({
    status: z.string().optional(), // Can be comma-separated for multiple
    isFavorite: z.string().optional(),
    tags: z.string().optional(), // Comma-separated
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    sortBy: z.enum(['lastReadAt', 'createdAt', 'completedAt', 'priority']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
});

const publicBookshelfSchema = z.object({
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped']).optional(),
    limit: z.string().optional()
});

// ==================== HELPER FUNCTIONS ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    return schema.parse(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function signBookshelfItems(items: any | any[]) {
    const isArray = Array.isArray(items);
    const itemArray = isArray ? items : [items];

    const signedItems = await Promise.all(itemArray.map(async item => {
        const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;
        if (itemObj.bookId && typeof itemObj.bookId === 'object') {
            const [signedBook] = await signBookUrls([itemObj.bookId]);
            itemObj.bookId = signedBook;
        }
        return itemObj;
    }));

    return isArray ? signedItems : signedItems[0];
}

function handleError(error: any, res: Response): void {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
        });
        return;
    }

    const errorMessage = error.message || 'Unknown error';

    switch (errorMessage) {
        case 'BOOK_NOT_FOUND':
            res.status(404).json({ error: 'BOOK_NOT_FOUND', message: 'Book not found' });
            break;
        case 'BOOK_ALREADY_ON_SHELF':
            res.status(409).json({ error: 'BOOK_ALREADY_ON_SHELF', message: 'Book is already on your shelf' });
            break;
        case 'BOOKSHELF_ITEM_NOT_FOUND':
            res.status(404).json({ error: 'BOOKSHELF_ITEM_NOT_FOUND', message: 'Bookshelf item not found' });
            break;
        case 'UNAUTHORIZED':
            res.status(403).json({ error: 'UNAUTHORIZED', message: 'You do not have permission to access this resource' });
            break;
        case 'INVALID_RATING':
            res.status(400).json({ error: 'INVALID_RATING', message: 'Rating must be between 1 and 5' });
            break;
        case 'MAX_TAGS_EXCEEDED':
            res.status(400).json({ error: 'MAX_TAGS_EXCEEDED', message: 'Maximum 20 tags allowed per book' });
            break;
        default:
            console.error('Bookshelf route error:', error);
            res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An error occurred while processing your request' });
    }
}

// ==================== ROUTES ====================

/**
 * POST /api/bookshelf/maintenance/cleanup
 * INTERNAL: Clean up duplicate records in database
 */
router.post('/maintenance/cleanup', authenticateToken, async (req: Request, res: Response) => {
    try {
        const results = await runDataCleanup();
        res.json(results);
    } catch (error: any) {
        handleError(error, res);
    }
});

/**
 * GET /api/bookshelf
 * Get user's bookshelf with filters, sorting, and pagination
 */
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const queryParams = validateSchema(bookshelfFiltersSchema, req.query);

    // Parse filters
    const filters: any = {};
    if (queryParams.status) {
        const statuses = queryParams.status.split(',');
        filters.status = statuses.length > 1 ? statuses : statuses[0];
    }
    if (queryParams.isFavorite !== undefined) filters.isFavorite = queryParams.isFavorite === 'true';
    if (queryParams.tags) filters.tags = queryParams.tags.split(',');
    if (queryParams.priority) filters.priority = queryParams.priority;
    if (queryParams.sortBy) filters.sortBy = queryParams.sortBy;
    if (queryParams.sortOrder) filters.sortOrder = queryParams.sortOrder;
    if (queryParams.limit) filters.limit = Math.min(parseInt(queryParams.limit), 100);
    if (queryParams.offset) filters.offset = parseInt(queryParams.offset);

    const result = await BookshelfService.getBookshelf(userId, filters);
    const signedItems = await signBookshelfItems(result.items);

    res.json({
        success: true,
        data: signedItems,
        pagination: {
            total: result.total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore: (filters.offset || 0) + signedItems.length < result.total
        }
    });
}));

/**
 * POST /api/bookshelf
 * Add a book to user's bookshelf
 */
router.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const body = validateSchema(addBookSchema, req.body);

    const bookshelfItem = await BookshelfService.addBookToShelf({
        userId,
        bookId: body.bookId,
        status: body.status,
        priority: body.priority,
        isPrivate: body.isPrivate,
        recommendedByUserId: body.recommendedByUserId,
        targetCompletionDate: body.targetCompletionDate ? new Date(body.targetCompletionDate) : null
    });

    const signedItem = await signBookshelfItems(bookshelfItem);

    res.status(201).json({
        success: true,
        data: signedItem
    });
}));

/**
 * GET /api/bookshelf/stats
 * Get user's bookshelf statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const stats = await BookshelfService.getBookshelfStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/bookshelf/favorites
 * Get user's favorite books
 */
router.get('/favorites', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const favorites = await BookshelfService.getFavorites(userId, limit);
    const signedItems = await signBookshelfItems(favorites);

    res.json({
        success: true,
        data: signedItems
    });
}));

/**
 * GET /api/bookshelf/reading
 * Get currently reading books
 */
router.get('/reading', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const books = await BookshelfService.getCurrentlyReading(userId);
    const signedItems = await signBookshelfItems(books);

    res.json({
        success: true,
        data: signedItems
    });
}));

/**
 * GET /api/bookshelf/completed
 * Get recently completed books
 */
router.get('/completed', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const books = await BookshelfService.getRecentlyCompleted(userId, limit);
    const signedItems = await signBookshelfItems(books);

    res.json({
        success: true,
        data: signedItems
    });
}));

/**
 * GET /api/bookshelf/overdue
 * Get books with overdue reading goals
 */
router.get('/overdue', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const books = await BookshelfService.getOverdueGoals(userId);
    const signedItems = await signBookshelfItems(books);

    res.json({
        success: true,
        data: signedItems
    });
}));

/**
 * GET /api/bookshelf/public
 * Discover public bookshelves (social feature)
 */
router.get('/public', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const queryParams = validateSchema(publicBookshelfSchema, req.query);

    const status = queryParams.status || 'currently_reading';
    const limit = Math.min(parseInt(queryParams.limit || '20'), 100);

    const userId = (req as any).user._id.toString();
    const books = await BookshelfService.discoverPublicBooks(userId, status, limit);
    const signedItems = await signBookshelfItems(books);

    res.json({
        success: true,
        data: signedItems
    });
}));

/**
 * GET /api/bookshelf/:id
 * Get single bookshelf item
 */
router.get('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;

    const bookshelfItem = await BookshelfService.getBookshelfItem(userId, bookshelfItemId);
    const signedItem = await signBookshelfItems(bookshelfItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/status
 * Update reading status
 */
router.patch('/:id/status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updateStatusSchema, req.body);

    const updatedItem = await BookshelfService.updateStatus(userId, bookshelfItemId, body);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/progress
 * Update reading progress
 */
router.patch('/:id/progress', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updateProgressSchema, req.body);

    const updatedItem = await BookshelfService.updateProgress(userId, bookshelfItemId, body);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem,
        message: signedItem.status === 'completed' ? 'Congratulations on completing this book!' : undefined
    });
}));

/**
 * PATCH /api/bookshelf/:id/favorite
 * Toggle favorite status
 */
router.patch('/:id/favorite', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;

    const updatedItem = await BookshelfService.toggleFavorite(userId, bookshelfItemId);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem,
        isFavorite: signedItem.isFavorite
    });
}));

/**
 * PATCH /api/bookshelf/:id/rating
 * Update rating and review
 */
router.patch('/:id/rating', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updateRatingSchema, req.body);

    const updatedItem = await BookshelfService.updateRatingAndReview(
        userId,
        bookshelfItemId,
        body.rating,
        body.review
    );
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/privacy
 * Update privacy setting
 */
router.patch('/:id/privacy', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updatePrivacySchema, req.body);

    const updatedItem = await BookshelfService.updatePrivacy(userId, bookshelfItemId, body.isPrivate);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/tags
 * Update tags
 */
router.patch('/:id/tags', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updateTagsSchema, req.body);

    const updatedItem = await BookshelfService.updateTags(userId, bookshelfItemId, body.tags);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/priority
 * Update priority level
 */
router.patch('/:id/priority', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(updatePrioritySchema, req.body);

    const updatedItem = await BookshelfService.updatePriority(userId, bookshelfItemId, body.priority);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * PATCH /api/bookshelf/:id/goal
 * Set or update reading goal
 */
router.patch('/:id/goal', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const body = validateSchema(setReadingGoalSchema, req.body);

    const updatedItem = await BookshelfService.setReadingGoal(
        userId,
        bookshelfItemId,
        body.targetCompletionDate ? new Date(body.targetCompletionDate) : null,
        body.reminderEnabled,
        body.reminderFrequency
    );
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

/**
 * DELETE /api/bookshelf/:id
 * Remove book from shelf (soft delete by default)
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookshelfItemId = req.params.id;
    const hardDelete = req.query.hard === 'true';

    await BookshelfService.removeBook(userId, bookshelfItemId, hardDelete);

    res.json({
        success: true,
        message: hardDelete ? 'Book permanently removed from shelf' : 'Book marked as dropped'
    });
}));

/**
 * DELETE /api/bookshelf/book/:bookId
 * Remove book by Book ID (flexible alternative)
 */
router.delete('/book/:bookId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookId = req.params.bookId;

    await BookshelfService.removeBookByBookId(userId, bookId);

    res.json({
        success: true,
        message: 'Book removed from shelf'
    });
}));

/**
 * PATCH /api/bookshelf/book/:bookId/status
 * Update reading status by Book ID
 */
router.patch('/book/:bookId/status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const bookId = req.params.bookId;
    const body = validateSchema(updateStatusSchema, req.body);

    const updatedItem = await BookshelfService.updateStatusByBookId(userId, bookId, body);
    const signedItem = await signBookshelfItems(updatedItem);

    res.json({
        success: true,
        data: signedItem
    });
}));

export default router;
