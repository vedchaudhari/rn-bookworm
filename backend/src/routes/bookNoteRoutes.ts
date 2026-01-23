// backend/src/routes/bookNoteRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import BookNoteService from '../services/bookNoteService';
import { z } from 'zod';

const router = Router();

/**
 * BOOK NOTE ROUTES
 * 
 * Endpoints:
 * - POST   /api/notes                   - Create a new note/highlight
 * - GET    /api/notes                   - Get notes for a book
 * - GET    /api/notes/search            - Search notes by content
 * - GET    /api/notes/stats             - Get note statistics
 * - GET    /api/notes/spotlight         - Get featured notes
 * - GET    /api/notes/tags              - Get all user tags
 * - GET    /api/notes/tag/:tag          - Get notes by tag
 * - GET    /api/notes/public            - Get public notes (discovery)
 * - GET    /api/notes/book-club/:id     - Get book club notes
 * - GET    /api/notes/popular/:bookId   - Get popular highlights for a book
 * - GET    /api/notes/:id               - Get single note
 * - PATCH  /api/notes/:id               - Update note
 * - PATCH  /api/notes/:id/spotlight     - Toggle spotlight status
 * - PATCH  /api/notes/:id/visibility    - Update visibility
 * - POST   /api/notes/:id/like          - Like a note
 * - DELETE /api/notes/:id/like          - Unlike a note
 * - POST   /api/notes/:id/share         - Share note to book club
 * - DELETE /api/notes/:id/share         - Unshare note from book club
 * - DELETE /api/notes/:id               - Delete a note
 * - POST   /api/notes/bulk-delete       - Bulk delete notes
 * - GET    /api/notes/export/:bookId    - Export notes for a book
 */

// ==================== VALIDATION SCHEMAS ====================

const createNoteSchema = z.object({
    bookId: z.string().min(1, 'Book ID is required'),
    bookshelfItemId: z.string().min(1, 'Bookshelf item ID is required'),
    type: z.enum(['highlight', 'note', 'bookmark', 'question']),
    pageNumber: z.number().min(1),
    highlightedText: z.string().max(2000).optional().nullable(),
    userNote: z.string().max(5000).optional().nullable(),
    chapterName: z.string().max(200).optional().nullable(),
    position: z.object({
        start: z.number().min(0),
        end: z.number().min(0)
    }).optional().nullable(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').optional(),
    visibility: z.enum(['private', 'followers', 'public']).optional(),
    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
    readingSessionId: z.string().optional().nullable(),
    createdAtProgress: z.number().min(0).max(100).optional()
});

const updateNoteSchema = z.object({
    highlightedText: z.string().max(2000).optional().nullable(),
    userNote: z.string().max(5000).optional().nullable(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').optional(),
    visibility: z.enum(['private', 'followers', 'public']).optional(),
    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
    chapterName: z.string().max(200).optional().nullable()
});

const updateVisibilitySchema = z.object({
    visibility: z.enum(['private', 'followers', 'public'])
});

const shareToBookClubSchema = z.object({
    bookClubId: z.string().min(1, 'Book club ID is required')
});

const noteFiltersSchema = z.object({
    bookshelfItemId: z.string().optional(),
    type: z.string().optional(), // Can be comma-separated
    pageNumber: z.string().optional(),
    tags: z.string().optional(), // Comma-separated
    visibility: z.enum(['private', 'followers', 'public']).optional(),
    isSpotlight: z.string().optional(),
    sortBy: z.enum(['pageNumber', 'createdAt', 'likes']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
});

const searchQuerySchema = z.object({
    q: z.string().min(1, 'Search query is required'),
    bookshelfItemId: z.string().optional(),
    limit: z.string().optional()
});

const publicNotesSchema = z.object({
    limit: z.string().optional(),
    offset: z.string().optional()
});

const popularHighlightsSchema = z.object({
    limit: z.string().optional()
});

const bulkDeleteSchema = z.object({
    bookshelfItemId: z.string().min(1, 'Bookshelf item ID is required'),
    type: z.enum(['highlight', 'note', 'bookmark', 'question']).optional(),
    tags: z.array(z.string()).optional()
});

// ==================== HELPER FUNCTIONS ====================

function validateSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    return schema.parse(data);
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
        case 'BOOKSHELF_ITEM_NOT_FOUND':
            res.status(404).json({ error: 'BOOKSHELF_ITEM_NOT_FOUND', message: 'Bookshelf item not found' });
            break;
        case 'NOTE_NOT_FOUND':
            res.status(404).json({ error: 'NOTE_NOT_FOUND', message: 'Note not found' });
            break;
        case 'UNAUTHORIZED':
            res.status(403).json({ error: 'UNAUTHORIZED', message: 'You do not have permission to access this resource' });
            break;
        case 'HIGHLIGHTED_TEXT_REQUIRED':
            res.status(400).json({
                error: 'HIGHLIGHTED_TEXT_REQUIRED',
                message: 'Highlighted text is required for this note type'
            });
            break;
        case 'INVALID_COLOR_FORMAT':
            res.status(400).json({
                error: 'INVALID_COLOR_FORMAT',
                message: 'Color must be in hex format (e.g., #FFD700)'
            });
            break;
        case 'MAX_TAGS_EXCEEDED':
            res.status(400).json({
                error: 'MAX_TAGS_EXCEEDED',
                message: 'Maximum 10 tags allowed per note'
            });
            break;
        default:
            console.error('Book note route error:', error);
            res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An error occurred while processing your request' });
    }
}

// ==================== ROUTES ====================

/**
 * POST /api/notes
 * Create a new note/highlight/bookmark
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const body = validateSchema(createNoteSchema, req.body);

        const note = await BookNoteService.createNote({
            userId,
            ...body
        });

        res.status(201).json({
            success: true,
            data: note,
            message: 'Note created successfully'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes
 * Get notes for a book with filters
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const queryParams = validateSchema(noteFiltersSchema, req.query);

        if (!queryParams.bookshelfItemId) {
            return res.status(400).json({
                error: 'MISSING_PARAMETER',
                message: 'bookshelfItemId is required'
            });
        }

        const filters: any = {};

        if (queryParams.type) {
            const types = queryParams.type.split(',');
            filters.type = types.length > 1 ? types : types[0];
        }

        if (queryParams.pageNumber) {
            filters.pageNumber = parseInt(queryParams.pageNumber);
        }

        if (queryParams.tags) {
            filters.tags = queryParams.tags.split(',');
        }

        if (queryParams.visibility) {
            filters.visibility = queryParams.visibility;
        }

        if (queryParams.isSpotlight !== undefined) {
            filters.isSpotlight = queryParams.isSpotlight === 'true';
        }

        if (queryParams.sortBy) {
            filters.sortBy = queryParams.sortBy;
        }

        if (queryParams.sortOrder) {
            filters.sortOrder = queryParams.sortOrder;
        }

        if (queryParams.limit) {
            filters.limit = Math.min(parseInt(queryParams.limit), 200);
        }

        if (queryParams.offset) {
            filters.offset = parseInt(queryParams.offset);
        }

        const result = await BookNoteService.getNotesForBook(
            userId,
            queryParams.bookshelfItemId,
            filters
        );

        res.json({
            success: true,
            data: result.notes,
            pagination: {
                total: result.total,
                limit: filters.limit || 100,
                offset: filters.offset || 0,
                hasMore: (filters.offset || 0) + result.notes.length < result.total
            }
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/search
 * Search notes by content
 */
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const queryParams = validateSchema(searchQuerySchema, req.query);

        const limit = queryParams.limit ? Math.min(parseInt(queryParams.limit), 100) : 20;

        const notes = await BookNoteService.searchNotes(
            userId,
            queryParams.q,
            queryParams.bookshelfItemId,
            limit
        );

        res.json({
            success: true,
            data: notes,
            query: queryParams.q
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/stats
 * Get note statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const stats = await BookNoteService.getNoteStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/spotlight
 * Get user's featured/spotlight notes
 */
router.get('/spotlight', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const notes = await BookNoteService.getSpotlightNotes(userId, limit);

        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/tags
 * Get all unique tags used by user
 */
router.get('/tags', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const tags = await BookNoteService.getUserTags(userId);

        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/tag/:tag
 * Get notes by specific tag
 */
router.get('/tag/:tag', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const tag = req.params.tag;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const notes = await BookNoteService.getNotesByTag(userId, tag, limit);

        res.json({
            success: true,
            data: notes,
            tag
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/public
 * Get public notes (discovery feed)
 */
router.get('/public', authenticateToken, async (req: Request, res: Response) => {
    try {
        const queryParams = validateSchema(publicNotesSchema, req.query);

        const limit = queryParams.limit ? Math.min(parseInt(queryParams.limit), 100) : 20;
        const offset = queryParams.offset ? parseInt(queryParams.offset) : 0;

        const notes = await BookNoteService.getPublicNotes(limit, offset);

        res.json({
            success: true,
            data: notes,
            pagination: {
                limit,
                offset,
                hasMore: notes.length === limit
            }
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/book-club/:id
 * Get notes shared with a book club
 */
router.get('/book-club/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const bookClubId = req.params.id;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const notes = await BookNoteService.getBookClubNotes(bookClubId, limit);

        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/popular/:bookId
 * Get popular highlights for a book
 */
router.get('/popular/:bookId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const bookId = req.params.bookId;
        const queryParams = validateSchema(popularHighlightsSchema, req.query);

        const limit = queryParams.limit ? Math.min(parseInt(queryParams.limit), 50) : 10;

        const highlights = await BookNoteService.getPopularHighlights(bookId, limit);

        res.json({
            success: true,
            data: highlights
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/:id
 * Get single note
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        const note = await BookNoteService.getNote(userId, noteId);

        res.json({
            success: true,
            data: note
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * PATCH /api/notes/:id
 * Update a note
 */
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;
        const body = validateSchema(updateNoteSchema, req.body);

        const updatedNote = await BookNoteService.updateNote(userId, noteId, body);

        res.json({
            success: true,
            data: updatedNote,
            message: 'Note updated successfully'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * PATCH /api/notes/:id/spotlight
 * Toggle spotlight/featured status
 */
router.patch('/:id/spotlight', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        const updatedNote = await BookNoteService.toggleSpotlight(userId, noteId);

        res.json({
            success: true,
            data: updatedNote,
            isSpotlight: updatedNote.isSpotlight
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * PATCH /api/notes/:id/visibility
 * Update note visibility
 */
router.patch('/:id/visibility', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;
        const body = validateSchema(updateVisibilitySchema, req.body);

        const updatedNote = await BookNoteService.updateVisibility(userId, noteId, body.visibility);

        res.json({
            success: true,
            data: updatedNote
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * POST /api/notes/:id/like
 * Like a note
 */
router.post('/:id/like', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        const updatedNote = await BookNoteService.likeNote(userId, noteId);

        res.json({
            success: true,
            data: updatedNote,
            likes: updatedNote.likes
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * DELETE /api/notes/:id/like
 * Unlike a note
 */
router.delete('/:id/like', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        const updatedNote = await BookNoteService.unlikeNote(userId, noteId);

        res.json({
            success: true,
            data: updatedNote,
            likes: updatedNote.likes
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * POST /api/notes/:id/share
 * Share note to book club
 */
router.post('/:id/share', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;
        const body = validateSchema(shareToBookClubSchema, req.body);

        const updatedNote = await BookNoteService.shareToBookClub(userId, noteId, body.bookClubId);

        res.json({
            success: true,
            data: updatedNote,
            message: 'Note shared to book club'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * DELETE /api/notes/:id/share
 * Unshare note from book club
 */
router.delete('/:id/share', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        const updatedNote = await BookNoteService.unshareFromBookClub(userId, noteId);

        res.json({
            success: true,
            data: updatedNote,
            message: 'Note unshared from book club'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const noteId = req.params.id;

        await BookNoteService.deleteNote(userId, noteId);

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * POST /api/notes/bulk-delete
 * Bulk delete notes
 */
router.post('/bulk-delete', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const body = validateSchema(bulkDeleteSchema, req.body);

        const result = await BookNoteService.bulkDeleteNotes(
            userId,
            body.bookshelfItemId,
            {
                type: body.type,
                tags: body.tags
            }
        );

        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `${result.deletedCount} notes deleted successfully`
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/notes/export/:bookId
 * Export notes for a book (for backup/sharing)
 */
router.get('/export/:bookId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const bookshelfItemId = req.params.bookId;

        const notes = await BookNoteService.exportNotes(userId, bookshelfItemId);

        res.json({
            success: true,
            data: notes,
            count: notes.length
        });
    } catch (error) {
        handleError(error, res);
    }
});

export default router;
