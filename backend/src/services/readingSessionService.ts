// backend/src/services/readingSessionService.ts
import ReadingSession, { IReadingSessionDocument, SessionSource } from '../models/ReadingSession';
import BookshelfItem from '../models/BookshelfItem';
import { addInkDrops } from './inkDropService';
import { toObjectId } from '../lib/objectId';
import mongoose from 'mongoose';

/**
 * READING SESSION SERVICE
 * 
 * Responsibilities:
 * - Start and end reading sessions
 * - Track reading time and progress
 * - Calculate reading speed and analytics
 * - Validate sessions for streak contribution
 * - Award Ink Drops for reading
 * - Aggregate daily/weekly/monthly statistics
 * 
 * Edge Cases Handled:
 * - Overlapping sessions (prevent multiple active sessions)
 * - Session duration validation (sanity checks)
 * - Minimum session time for rewards (5 minutes)
 * - Auto-calculation of metrics via pre-save hooks
 * - Time zone handling (UTC normalization)
 * - Session quality scoring (pause tracking)
 */

export interface StartSessionParams {
    userId: string;
    bookId: string;
    bookshelfItemId: string;
    startPage: number;
    source?: SessionSource;
    deviceType?: 'mobile' | 'tablet' | 'web' | 'unknown';
    location?: string | null;
}

export interface EndSessionParams {
    endPage: number;
    pauseCount?: number;
    averagePauseDuration?: number;
}

export interface SessionStats {
    totalSessions: number;
    totalMinutes: number;
    totalPages: number;
    totalWords: number;
    averageSpeed: number;
    averageFocusScore: number;
    longestSession: number;
    streakValidSessions: number;
}

// Active sessions cache (in-memory tracking)
// In production, consider Redis for distributed system
const activeSessions = new Map<string, string>(); // userId -> sessionId

export class ReadingSessionService {
    /**
     * Start a new reading session
     * Prevents overlapping sessions for same user
     */
    static async startSession(params: StartSessionParams): Promise<IReadingSessionDocument> {
        const {
            userId,
            bookId,
            bookshelfItemId,
            startPage,
            source = 'auto',
            deviceType = 'unknown',
            location = null
        } = params;

        // Check for active session
        if (activeSessions.has(userId)) {
            const activeSessionId = activeSessions.get(userId)!;
            const activeSession = await ReadingSession.findById(activeSessionId);

            if (activeSession) {
                throw new Error('ACTIVE_SESSION_EXISTS');
            } else {
                // Clean up stale entry
                activeSessions.delete(userId);
            }
        }

        // Validate bookshelf item exists and belongs to user
        const bookshelfItem = await BookshelfItem.findById(bookshelfItemId);
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        // Create session
        const session = await ReadingSession.create({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId),
            bookshelfItemId: toObjectId(bookshelfItemId),
            startTime: new Date(),
            endTime: new Date(), // Will be updated on end
            duration: 0, // Will be calculated on end
            startPage,
            endPage: startPage, // Initialize to startPage
            pagesRead: 0,
            source,
            deviceType,
            location,
            sessionDate: new Date().toISOString().split('T')[0], // Set explicitly before validation
            isCompleteSession: false // Mark as incomplete until ended
        });

        // Track active session
        activeSessions.set(userId, session._id.toString());

        return session;
    }

    /**
     * End an active reading session
     * Calculates metrics and awards Ink Drops
     */
    static async endSession(
        userId: string,
        sessionId: string,
        params: EndSessionParams
    ): Promise<{
        session: IReadingSessionDocument;
        inkDropsEarned: number;
        updatedBookshelfItem: any;
    }> {
        const { endPage, pauseCount = 0, averagePauseDuration = 0 } = params;

        // Get session
        const session = await ReadingSession.findById(sessionId);

        if (!session) {
            throw new Error('SESSION_NOT_FOUND');
        }

        // Verify ownership
        if (session.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        // Prevent ending already completed session
        if (session.isCompleteSession) {
            throw new Error('SESSION_ALREADY_COMPLETED');
        }

        // Update session
        session.endTime = new Date();
        session.endPage = endPage;
        session.pauseCount = pauseCount;
        session.averagePauseDuration = averagePauseDuration;
        session.isCompleteSession = true;

        // Pre-save hook will calculate: duration, pagesRead, wordsRead, readingSpeed, focusScore, sessionDate

        await session.save();

        // Remove from active sessions
        activeSessions.delete(userId);

        // Update BookshelfItem with aggregated reading time
        const bookshelfItem = await BookshelfItem.findById(session.bookshelfItemId);
        if (bookshelfItem) {
            // Aggregate total reading time for this book
            const totalTime = await this.getTotalReadingTimeForBook(
                userId,
                session.bookshelfItemId.toString()
            );

            bookshelfItem.actualReadingTime = totalTime;

            // Calculate and update reading speed (pages per hour)
            if (totalTime > 0) {
                const totalPages = await this.getTotalPagesReadForBook(
                    userId,
                    session.bookshelfItemId.toString()
                );
                bookshelfItem.readingSpeed = Math.round((totalPages / totalTime) * 60);
            }

            // Update current page if session ended at a later page
            if (endPage > bookshelfItem.currentPage) {
                await bookshelfItem.updateProgress(endPage);
            } else {
                await bookshelfItem.save();
            }
        }

        // Award Ink Drops if session is valid
        let inkDropsEarned = 0;
        if (session.isValidForStreak()) {
            inkDropsEarned = session.calculateInkDrops();
            session.inkDropsEarned = inkDropsEarned;
            await session.save();

            if (inkDropsEarned > 0) {
                await addInkDrops(userId, inkDropsEarned, 'streak_check_in');
            }
        }

        return {
            session,
            inkDropsEarned,
            updatedBookshelfItem: bookshelfItem
        };
    }

    /**
     * Manually create a completed session (for imports or manual tracking)
     */
    static async createManualSession(params: {
        userId: string;
        bookId: string;
        bookshelfItemId: string;
        startTime: Date;
        endTime: Date;
        startPage: number;
        endPage: number;
        source?: SessionSource;
        location?: string | null;
    }): Promise<IReadingSessionDocument> {
        const {
            userId,
            bookId,
            bookshelfItemId,
            startTime,
            endTime,
            startPage,
            endPage,
            source = 'manual',
            location = null
        } = params;

        // Validate time range
        if (endTime <= startTime) {
            throw new Error('INVALID_TIME_RANGE');
        }

        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

        // Sanity check: max 24 hours
        if (durationMinutes > 1440) {
            throw new Error('SESSION_TOO_LONG');
        }

        // Validate bookshelf item
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        // Create session
        const session = await ReadingSession.create({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId),
            bookshelfItemId: toObjectId(bookshelfItemId),
            startTime,
            endTime,
            startPage,
            endPage,
            source,
            deviceType: 'unknown',
            location,
            isCompleteSession: true
        });

        // Award Ink Drops if valid
        if (session.isValidForStreak()) {
            const inkDrops = session.calculateInkDrops();
            session.inkDropsEarned = inkDrops;
            await session.save();

            if (inkDrops > 0) {
                await addInkDrops(userId, inkDrops, 'streak_check_in');
            }
        }

        // Update bookshelf item
        if (endPage > bookshelfItem.currentPage) {
            await bookshelfItem.updateProgress(endPage);
        }

        return session;
    }

    /**
     * Get user's reading sessions with filters
     */
    static async getSessions(
        userId: string,
        filters: {
            bookshelfItemId?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{
        sessions: IReadingSessionDocument[];
        total: number;
    }> {
        const {
            bookshelfItemId,
            startDate,
            endDate,
            limit = 50,
            offset = 0
        } = filters;

        const query: any = { userId: toObjectId(userId), isCompleteSession: true };

        if (bookshelfItemId) {
            query.bookshelfItemId = toObjectId(bookshelfItemId);
        }

        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = startDate;
            if (endDate) query.startTime.$lte = endDate;
        }

        const [sessions, total] = await Promise.all([
            ReadingSession.find(query)
                .sort({ startTime: -1 })
                .skip(offset)
                .limit(limit)
                .populate('bookId', 'title author coverImage')
                .lean(),
            ReadingSession.countDocuments(query)
        ]);

        return { sessions: sessions as unknown as IReadingSessionDocument[], total };
    }

    /**
     * Get single session by ID
     */
    static async getSession(userId: string, sessionId: string): Promise<IReadingSessionDocument> {
        const session = await ReadingSession.findById(toObjectId(sessionId));

        if (!session) {
            throw new Error('SESSION_NOT_FOUND');
        }

        if (session.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        return session;
    }

    /**
     * Delete a session (for manual corrections)
     */
    static async deleteSession(userId: string, sessionId: string): Promise<void> {
        const session = await this.getSession(userId, sessionId);

        await ReadingSession.findByIdAndDelete(sessionId);

        // Recalculate bookshelf item reading time
        const totalTime = await this.getTotalReadingTimeForBook(
            userId,
            session.bookshelfItemId.toString()
        );

        const bookshelfItem = await BookshelfItem.findById(session.bookshelfItemId);
        if (bookshelfItem) {
            bookshelfItem.actualReadingTime = totalTime;
            await bookshelfItem.save();
        }
    }

    /**
     * Get daily reading statistics
     */
    static async getDailyStats(userId: string, days: number = 30): Promise<any[]> {
        return await ReadingSession.getDailyStats(toObjectId(userId), days);
    }

    /**
     * Get weekly reading statistics
     */
    static async getWeeklyStats(userId: string, weeks: number = 12): Promise<any[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));

        return await ReadingSession.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    startTime: { $gte: startDate },
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$startTime' },
                        week: { $week: '$startTime' }
                    },
                    totalMinutes: { $sum: '$duration' },
                    totalPages: { $sum: '$pagesRead' },
                    totalWords: { $sum: '$wordsRead' },
                    sessionCount: { $sum: 1 },
                    avgFocusScore: { $avg: '$focusScore' }
                }
            },
            { $sort: { '_id.year': -1, '_id.week': -1 } },
            { $limit: weeks }
        ]);
    }

    /**
     * Get monthly reading statistics
     */
    static async getMonthlyStats(userId: string, months: number = 12): Promise<any[]> {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        return await ReadingSession.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    startTime: { $gte: startDate },
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$startTime' },
                        month: { $month: '$startTime' }
                    },
                    totalMinutes: { $sum: '$duration' },
                    totalPages: { $sum: '$pagesRead' },
                    totalWords: { $sum: '$wordsRead' },
                    sessionCount: { $sum: 1 },
                    avgFocusScore: { $avg: '$focusScore' },
                    avgReadingSpeed: { $avg: '$readingSpeed' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: months }
        ]);
    }

    /**
     * Get overall reading statistics for user
     */
    static async getOverallStats(userId: string): Promise<SessionStats> {
        const stats = await ReadingSession.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    totalMinutes: { $sum: '$duration' },
                    totalPages: { $sum: '$pagesRead' },
                    totalWords: { $sum: '$wordsRead' },
                    averageSpeed: { $avg: '$readingSpeed' },
                    averageFocusScore: { $avg: '$focusScore' },
                    longestSession: { $max: '$duration' },
                    streakValidSessions: {
                        $sum: { $cond: ['$contributesToStreak', 1, 0] }
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                totalSessions: 0,
                totalMinutes: 0,
                totalPages: 0,
                totalWords: 0,
                averageSpeed: 0,
                averageFocusScore: 0,
                longestSession: 0,
                streakValidSessions: 0
            };
        }

        return stats[0];
    }

    /**
     * Get reading streak days (for calendar view)
     * Returns array of dates with reading activity
     */
    static async getReadingStreakDays(userId: string, year: number, month: number): Promise<string[]> {
        console.log(`[ReadingSessionService] [START] getReadingStreakDays calling for user=${userId}, year=${year}, month=${month}`);

        try {
            // Validate inputs
            if (!year || !month || isNaN(year) || isNaN(month)) {
                console.error('[ReadingSessionService] [ERROR] Invalid year or month');
                throw new Error('INVALID_DATE_PARAMS');
            }

            // Validate year and month ranges
            if (year < 1900 || year > 2100) {
                throw new Error('INVALID_YEAR_RANGE');
            }

            if (month < 1 || month > 12) {
                throw new Error('INVALID_MONTH_RANGE');
            }

            const cleanUserId = toObjectId(userId);

            // Create YYYY-MM-DD strings for filtering sessionDate (which is indexed)
            // Month is 1-indexed (1-12)
            const yearStr = year.toString();
            const monthStr = month.toString().padStart(2, '0');

            // Format for prefix match
            const datePrefix = `${yearStr}-${monthStr}`;

            console.log(`[ReadingSessionService] Searching sessions for month prefix: ${datePrefix}`);

            // Use direct distinct query with prefix matching on sessionDate
            console.log('[ReadingSessionService] Executing ReadingSession.distinct...');

            if (!ReadingSession) {
                console.error('[ReadingSessionService] [ERROR] ReadingSession model is undefined');
                throw new Error('MODEL_UNDEFINED');
            }

            // Use safer regex with escaped prefix
            const escapedPrefix = datePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const streakDays = await ReadingSession.distinct('sessionDate', {
                userId: cleanUserId,
                sessionDate: { $regex: new RegExp(`^${escapedPrefix}`) },
                contributesToStreak: true
            });

            console.log(`[ReadingSessionService] [SUCCESS] Found ${streakDays.length} streak days`);
            return streakDays;
        } catch (error: any) {
            console.error('[ReadingSessionService] [ERROR] in getReadingStreakDays:', error);

            // Re-throw known errors
            if (error.message === 'INVALID_DATE_PARAMS' ||
                error.message === 'INVALID_YEAR_RANGE' ||
                error.message === 'INVALID_MONTH_RANGE' ||
                error.message === 'INVALID_ID_FORMAT') {
                throw error;
            }

            // Wrap unknown errors
            throw new Error('DATABASE_ERROR');
        }
    }

    /**
     * Get total reading time for a specific book
     */
    static async getTotalReadingTimeForBook(userId: string, bookshelfItemId: string): Promise<number> {
        const result = await ReadingSession.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    bookshelfItemId: toObjectId(bookshelfItemId),
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$duration' }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalMinutes : 0;
    }

    /**
     * Get total pages read for a specific book
     */
    static async getTotalPagesReadForBook(userId: string, bookshelfItemId: string): Promise<number> {
        const result = await ReadingSession.aggregate([
            {
                $match: {
                    userId: toObjectId(userId),
                    bookshelfItemId: toObjectId(bookshelfItemId),
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalPages: { $sum: '$pagesRead' }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalPages : 0;
    }

    /**
     * Get leaderboard - most reading time this month
     */
    static async getMonthlyLeaderboard(limit: number = 50): Promise<any[]> {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        return await ReadingSession.aggregate([
            {
                $match: {
                    startTime: { $gte: monthStart },
                    isCompleteSession: true
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalMinutes: { $sum: '$duration' },
                    totalPages: { $sum: '$pagesRead' },
                    sessionCount: { $sum: 1 }
                }
            },
            { $sort: { totalMinutes: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    profileImage: '$user.profileImage',
                    totalMinutes: 1,
                    totalPages: 1,
                    sessionCount: 1
                }
            }
        ]);
    }

    /**
     * Import sessions from external source (Kindle, Goodreads, etc.)
     */
    static async importSessions(
        userId: string,
        sessions: Array<{
            bookId: string;
            bookshelfItemId: string;
            startTime: Date;
            endTime: Date;
            startPage: number;
            endPage: number;
        }>
    ): Promise<{ imported: number; failed: number }> {
        let imported = 0;
        let failed = 0;

        for (const sessionData of sessions) {
            try {
                await this.createManualSession({
                    ...sessionData,
                    userId,
                    source: 'imported'
                });
                imported++;
            } catch (error) {
                failed++;
                console.error('Failed to import session:', error);
            }
        }

        return { imported, failed };
    }
}

export default ReadingSessionService;
