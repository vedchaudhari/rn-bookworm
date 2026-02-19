// backend/src/routes/readingSessionRoutes.ts
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth.middleware';
import ReadingSessionService from '../services/readingSessionService';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';

const router = Router();

// READING SESSION ROUTES

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

// ==================== ROUTES ====================

/**
 * POST /api/sessions/start
 * Start a new reading session
 */
router.post('/start', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const body = startSessionSchema.parse(req.body);

    const session = await ReadingSessionService.startSession({
        userId,
        ...body
    });

    res.status(201).json({
        success: true,
        data: session,
        message: 'Reading session started'
    });
}));

/**
 * POST /api/sessions/:id/end
 * End an active reading session
 */
router.post('/:id/end', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const sessionId = req.params.id;
    const body = endSessionSchema.parse(req.body);

    const result = await ReadingSessionService.endSession(userId, sessionId, body);

    res.json({
        success: true,
        data: result.session,
        inkDropsEarned: result.inkDropsEarned,
        message: result.inkDropsEarned > 0
            ? `Session completed! You earned ${result.inkDropsEarned} Ink Drops!`
            : 'Session completed'
    });
}));

/**
 * POST /api/sessions/manual
 * Create a manual or imported reading session
 */
router.post('/manual', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const body = createManualSessionSchema.parse(req.body);

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
}));

/**
 * GET /api/sessions
 * Get user's reading sessions with filters
 */
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const queryParams = sessionsFilterSchema.parse(req.query);

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
}));

/**
 * GET /api/sessions/stats/overall
 * Get overall reading statistics
 */
router.get('/stats/overall', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    if (!userId) throw new AppError('Unauthorized', 401);

    const stats = await ReadingSessionService.getOverallStats(userId);

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * GET /api/sessions/stats/daily
 * Get daily reading statistics
 */
router.get('/stats/daily', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    if (!userId) throw new AppError('Unauthorized', 401);

    const queryParams = statsQuerySchema.parse(req.query);

    const days = queryParams.days ? Math.min(parseInt(queryParams.days), 365) : 30;

    const stats = await ReadingSessionService.getDailyStats(userId, days);

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * GET /api/sessions/stats/weekly
 * Get weekly reading statistics
 */
router.get('/stats/weekly', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    if (!userId) throw new AppError('Unauthorized', 401);

    const queryParams = statsQuerySchema.parse(req.query);

    const weeks = queryParams.weeks ? Math.min(parseInt(queryParams.weeks), 52) : 12;

    const stats = await ReadingSessionService.getWeeklyStats(userId, weeks);

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * GET /api/sessions/stats/monthly
 * Get monthly reading statistics
 */
router.get('/stats/monthly', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    if (!userId) throw new AppError('Unauthorized', 401);

    const queryParams = statsQuerySchema.parse(req.query);

    const months = queryParams.months ? Math.min(parseInt(queryParams.months), 24) : 12;

    const stats = await ReadingSessionService.getMonthlyStats(userId, months);

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * GET /api/sessions/calendar
 * Get reading streak calendar (days with reading activity)
 */
router.get('/calendar', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    if (!userId) throw new AppError('Unauthorized', 401);

    const queryParams = calendarQuerySchema.parse(req.query);



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
}));

/**
 * GET /api/sessions/book/:bookId
 * Get all sessions for a specific book
 */
router.get('/book/:bookId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
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
}));

/**
 * GET /api/sessions/leaderboard
 * Get monthly reading leaderboard
 */
router.get('/leaderboard', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const queryParams = leaderboardQuerySchema.parse(req.query);
    const limit = queryParams.limit ? Math.min(parseInt(queryParams.limit), 100) : 50;

    const leaderboard = await ReadingSessionService.getMonthlyLeaderboard(limit);

    res.json({
        success: true,
        data: leaderboard
    });
}));

/**
 * GET /api/sessions/:id
 * Get single reading session
 */
router.get('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const sessionId = req.params.id;

    const session = await ReadingSessionService.getSession(userId, sessionId);

    res.json({
        success: true,
        data: session
    });
}));

/**
 * DELETE /api/sessions/:id
 * Delete a reading session
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const sessionId = req.params.id;

    await ReadingSessionService.deleteSession(userId, sessionId);

    res.json({
        success: true,
        message: 'Session deleted successfully'
    });
}));

export default router;
