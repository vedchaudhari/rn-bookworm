// backend/src/routes/readingSessionRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import ReadingSessionService from '../services/readingSessionService';
import { z } from 'zod';

const router = Router();

/**
 * READING SESSION ROUTES
 * 
 * Endpoints:
 * - POST   /api/sessions/start          - Start a new reading session
 * - POST   /api/sessions/:id/end        - End an active reading session
 * - POST   /api/sessions/manual         - Create a manual/imported session
 * - GET    /api/sessions                - Get user's reading sessions
 * - GET    /api/sessions/:id            - Get single session
 * - GET    /api/sessions/stats/overall  - Get overall reading statistics
 * - GET    /api/sessions/stats/daily    - Get daily reading stats
 * - GET    /api/sessions/stats/weekly   - Get weekly reading stats
 * - GET    /api/sessions/stats/monthly  - Get monthly reading stats
 * - GET    /api/sessions/calendar       - Get reading streak calendar
 * - GET    /api/sessions/book/:bookId   - Get sessions for specific book
 * - GET    /api/sessions/leaderboard    - Get monthly reading leaderboard
 * - DELETE /api/sessions/:id            - Delete a session
 */

// ==================== VALIDATION SCHEMAS ====================

const startSessionSchema = z.object({
    bookId: z.string().min(1, 'Book ID is required'),
    bookshelfItemId: z.string().min(1, 'Bookshelf item ID is required'),
    startPage: z.coerce.number().min(0),
    source: z.enum(['manual', 'auto', 'imported']).optional(),
    deviceType: z.enum(['mobile', 'tablet', 'web', 'unknown']).optional(),
    location: z.string().max(100).optional().nullable()
});

const endSessionSchema = z.object({
    endPage: z.coerce.number().min(0),
    pauseCount: z.coerce.number().min(0).optional(),
    averagePauseDuration: z.coerce.number().min(0).optional()
});

const createManualSessionSchema = z.object({
    bookId: z.string().min(1, 'Book ID is required'),
    bookshelfItemId: z.string().min(1, 'Bookshelf item ID is required'),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    startPage: z.coerce.number().min(0),
    endPage: z.coerce.number().min(0),
    source: z.enum(['manual', 'auto', 'imported']).optional(),
    location: z.string().max(100).optional().nullable()
});

const sessionsFilterSchema = z.object({
    bookshelfItemId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
});

const calendarQuerySchema = z.object({
    year: z.string().regex(/^\d{4}$/, 'Invalid year format'),
    month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Invalid month format')
});

const statsQuerySchema = z.object({
    days: z.string().optional(),
    weeks: z.string().optional(),
    months: z.string().optional()
});

const leaderboardQuerySchema = z.object({
    limit: z.string().optional()
});

// ==================== HELPER FUNCTIONS ====================

function validateSchema<T>(schema: z.ZodSchema<T>, data: any): T {
    return schema.parse(data);
}

function handleError(error: any, res: Response): void {
    if (error instanceof z.ZodError) {
        console.error('[Validation Error] Details:', JSON.stringify(error.errors, null, 2));
        res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
        });
        return;
    }

    const errorMessage = error.message || 'Unknown error';

    switch (errorMessage) {
        case 'ACTIVE_SESSION_EXISTS':
            res.status(409).json({
                error: 'ACTIVE_SESSION_EXISTS',
                message: 'You already have an active reading session. Please end it before starting a new one.'
            });
            break;
        case 'BOOKSHELF_ITEM_NOT_FOUND':
            res.status(404).json({ error: 'BOOKSHELF_ITEM_NOT_FOUND', message: 'Bookshelf item not found' });
            break;
        case 'SESSION_NOT_FOUND':
            res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Reading session not found' });
            break;
        case 'SESSION_ALREADY_COMPLETED':
            res.status(400).json({
                error: 'SESSION_ALREADY_COMPLETED',
                message: 'This session has already been completed'
            });
            break;
        case 'UNAUTHORIZED':
            res.status(403).json({ error: 'UNAUTHORIZED', message: 'You do not have permission to access this resource' });
            break;
        case 'INVALID_ID_FORMAT':
            res.status(400).json({ error: 'INVALID_ID_FORMAT', message: 'User ID format is invalid' });
            break;
        case 'INVALID_TIME_RANGE':
            res.status(400).json({
                error: 'INVALID_TIME_RANGE',
                message: 'End time must be after start time'
            });
            break;
        case 'INVALID_DATE_PARAMS':
            res.status(400).json({ error: 'INVALID_DATE_PARAMS', message: 'Invalid year or month' });
            break;
        case 'INVALID_DATE_RANGE':
            res.status(400).json({ error: 'INVALID_DATE_RANGE', message: 'Invalid date range calculation' });
            break;
        case 'SESSION_TOO_LONG':
            res.status(400).json({
                error: 'SESSION_TOO_LONG',
                message: 'Session duration cannot exceed 24 hours'
            });
            break;
        default:
            console.error('Reading session route error:', error);
            res.status(500).json({
                error: error.message || 'INTERNAL_ERROR',
                message: error.message || 'An error occurred while processing your request',
                stack: error.stack
            });
    }
}

// ==================== ROUTES ====================

/**
 * POST /api/sessions/start
 * Start a new reading session
 */
router.post('/start', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const body = validateSchema(startSessionSchema, req.body);

        const session = await ReadingSessionService.startSession({
            userId,
            ...body
        });

        res.status(201).json({
            success: true,
            data: session,
            message: 'Reading session started'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * POST /api/sessions/:id/end
 * End an active reading session
 */
router.post('/:id/end', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const sessionId = req.params.id;
        const body = validateSchema(endSessionSchema, req.body);

        const result = await ReadingSessionService.endSession(userId, sessionId, body);

        res.json({
            success: true,
            data: result.session,
            inkDropsEarned: result.inkDropsEarned,
            message: result.inkDropsEarned > 0
                ? `Session completed! You earned ${result.inkDropsEarned} Ink Drops!`
                : 'Session completed'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * POST /api/sessions/manual
 * Create a manual or imported reading session
 */
router.post('/manual', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const body = validateSchema(createManualSessionSchema, req.body);

        const session = await ReadingSessionService.createManualSession({
            userId,
            bookId: body.bookId,
            bookshelfItemId: body.bookshelfItemId,
            startTime: new Date(body.startTime),
            endTime: new Date(body.endTime),
            startPage: body.startPage,
            endPage: body.endPage,
            source: body.source,
            location: body.location
        });

        res.status(201).json({
            success: true,
            data: session,
            message: 'Manual session created successfully'
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions
 * Get user's reading sessions with filters
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const queryParams = validateSchema(sessionsFilterSchema, req.query);

        const filters: any = {};

        if (queryParams.bookshelfItemId) {
            filters.bookshelfItemId = queryParams.bookshelfItemId;
        }

        if (queryParams.startDate) {
            filters.startDate = new Date(queryParams.startDate);
        }

        if (queryParams.endDate) {
            filters.endDate = new Date(queryParams.endDate);
        }

        if (queryParams.limit) {
            filters.limit = Math.min(parseInt(queryParams.limit), 100);
        }

        if (queryParams.offset) {
            filters.offset = parseInt(queryParams.offset);
        }

        const result = await ReadingSessionService.getSessions(userId, filters);

        res.json({
            success: true,
            data: result.sessions,
            pagination: {
                total: result.total,
                limit: filters.limit || 50,
                offset: filters.offset || 0,
                hasMore: (filters.offset || 0) + result.sessions.length < result.total
            }
        });
    } catch (error) {
        handleError(error, res);
    }
});



/**
 * GET /api/sessions/stats/overall
 * Get overall reading statistics
 */
router.get('/stats/overall', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || '';
        const stats = await ReadingSessionService.getOverallStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/stats/daily
 * Get daily reading statistics
 */
router.get('/stats/daily', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || '';
        const queryParams = validateSchema(statsQuerySchema, req.query);

        const days = queryParams.days ? Math.min(parseInt(queryParams.days), 365) : 30;

        const stats = await ReadingSessionService.getDailyStats(userId, days);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/stats/weekly
 * Get weekly reading statistics
 */
router.get('/stats/weekly', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || '';
        const queryParams = validateSchema(statsQuerySchema, req.query);

        const weeks = queryParams.weeks ? Math.min(parseInt(queryParams.weeks), 52) : 12;

        const stats = await ReadingSessionService.getWeeklyStats(userId, weeks);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/stats/monthly
 * Get monthly reading statistics
 */
router.get('/stats/monthly', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || '';
        const queryParams = validateSchema(statsQuerySchema, req.query);

        const months = queryParams.months ? Math.min(parseInt(queryParams.months), 24) : 12;

        const stats = await ReadingSessionService.getMonthlyStats(userId, months);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/calendar
 * Get reading streak calendar (days with reading activity)
 */
router.get('/calendar', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || '';
        const queryParams = validateSchema(calendarQuerySchema, req.query);

        console.log(`[Routes] [Calendar] userId=${userId}, year=${queryParams.year}, month=${queryParams.month}`);

        const year = parseInt(queryParams.year);
        const month = parseInt(queryParams.month);

        const streakDays = await ReadingSessionService.getReadingStreakDays(userId, year, month);

        res.json({
            success: true,
            data: {
                year,
                month,
                streakDays
            }
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/book/:bookId
 * Get all sessions for a specific book
 */
router.get('/book/:bookId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const bookshelfItemId = req.params.bookId; // This should be bookshelfItemId

        const totalTime = await ReadingSessionService.getTotalReadingTimeForBook(userId, bookshelfItemId);
        const totalPages = await ReadingSessionService.getTotalPagesReadForBook(userId, bookshelfItemId);

        const sessions = await ReadingSessionService.getSessions(userId, {
            bookshelfItemId,
            limit: 100
        });

        res.json({
            success: true,
            data: {
                sessions: sessions.sessions,
                summary: {
                    totalMinutes: totalTime,
                    totalPages: totalPages,
                    sessionCount: sessions.total
                }
            }
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/leaderboard
 * Get monthly reading leaderboard
 */
router.get('/leaderboard', authenticateToken, async (req: Request, res: Response) => {
    try {
        const queryParams = validateSchema(leaderboardQuerySchema, req.query);
        const limit = queryParams.limit ? Math.min(parseInt(queryParams.limit), 100) : 50;

        const leaderboard = await ReadingSessionService.getMonthlyLeaderboard(limit);

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * GET /api/sessions/:id
 * Get single reading session
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString();
        const sessionId = req.params.id;

        const session = await ReadingSessionService.getSession(userId, sessionId);

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        handleError(error, res);
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete a reading session
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const sessionId = req.params.id;

        await ReadingSessionService.deleteSession(userId, sessionId);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        handleError(error, res);
    }
});

export default router;
