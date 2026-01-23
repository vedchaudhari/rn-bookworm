// backend/src/services/bookNoteService.ts
import BookNote, { IBookNoteDocument, NoteType, Visibility } from '../models/BookNote';
import BookshelfItem from '../models/BookshelfItem';
import { toObjectId } from '../lib/objectId';
import mongoose from 'mongoose';

/**
 * BOOK NOTE SERVICE
 * 
 * Responsibilities:
 * - Create highlights, notes, bookmarks, questions
 * - Update and delete notes
 * - Manage visibility and privacy
 * - Social features (likes, sharing)
 * - Search and filter notes
 * - Book club integration
 * - Popular highlights discovery
 * 
 * Edge Cases Handled:
 * - Ownership validation
 * - Privacy filtering for social queries
 * - Max length validation
 * - Tag limits
 * - Color validation (hex format)
 * - Duplicate highlight prevention (same page + position)
 * - Edit tracking and versioning
 */

export interface CreateNoteParams {
    userId: string;
    bookId: string;
    bookshelfItemId: string;
    type: NoteType;
    pageNumber: number;
    highlightedText?: string | null;
    userNote?: string | null;
    chapterName?: string | null;
    position?: { start: number; end: number } | null;
    color?: string;
    visibility?: Visibility;
    tags?: string[];
    readingSessionId?: string | null;
    createdAtProgress?: number;
}

export interface UpdateNoteParams {
    highlightedText?: string | null;
    userNote?: string | null;
    color?: string;
    visibility?: Visibility;
    tags?: string[];
    chapterName?: string | null;
}

export interface NoteFilters {
    type?: NoteType | NoteType[];
    pageNumber?: number;
    tags?: string[];
    visibility?: Visibility;
    isSpotlight?: boolean;
    sortBy?: 'pageNumber' | 'createdAt' | 'likes';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export class BookNoteService {
    /**
     * Create a new note/highlight
     */
    static async createNote(params: CreateNoteParams): Promise<IBookNoteDocument> {
        const {
            userId,
            bookId,
            bookshelfItemId,
            type,
            pageNumber,
            highlightedText = null,
            userNote = null,
            chapterName = null,
            position = null,
            color = '#FFD700',
            visibility = 'private',
            tags = [],
            readingSessionId = null,
            createdAtProgress = 0
        } = params;

        // Validate bookshelf item exists and belongs to user
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        // Validate note type requirements
        if (type === 'highlight' || type === 'question') {
            if (!highlightedText) {
                throw new Error('HIGHLIGHTED_TEXT_REQUIRED');
            }
        }

        // For 'note' type, we need either highlighted text OR a user note
        if (type === 'note') {
            if (!highlightedText && !userNote) {
                throw new Error('NOTE_CONTENT_REQUIRED');
            }
        }

        // Validate color format
        if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
            throw new Error('INVALID_COLOR_FORMAT');
        }

        // Validate tags limit
        if (tags.length > 10) {
            throw new Error('MAX_TAGS_EXCEEDED');
        }

        // Create note
        const note = await BookNote.create({
            userId: toObjectId(userId),
            bookId: toObjectId(bookId),
            bookshelfItemId: toObjectId(bookshelfItemId),
            type,
            pageNumber,
            highlightedText,
            userNote,
            chapterName,
            position,
            color,
            visibility,
            tags,
            readingSessionId: readingSessionId ? toObjectId(readingSessionId) : null,
            createdAtProgress
        });

        // Update bookshelf item note count
        bookshelfItem.notes += 1;
        await bookshelfItem.save();

        return note;
    }

    /**
     * Update an existing note
     */
    static async updateNote(
        userId: string,
        noteId: string,
        params: UpdateNoteParams
    ): Promise<IBookNoteDocument> {
        const note = await this.getNote(userId, noteId);

        const { highlightedText, userNote, color, visibility, tags, chapterName } = params;

        // Use instance method for content updates to track edit history
        if (highlightedText !== undefined || userNote !== undefined) {
            await note.updateContent(userNote, highlightedText);
        }

        // Update color
        if (color !== undefined) {
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                throw new Error('INVALID_COLOR_FORMAT');
            }
            note.color = color;
        }

        // Update visibility
        if (visibility !== undefined) {
            note.visibility = visibility;
        }

        // Update tags
        if (tags !== undefined) {
            if (tags.length > 10) {
                throw new Error('MAX_TAGS_EXCEEDED');
            }
            note.tags = tags;
        }

        // Update chapter
        if (chapterName !== undefined) {
            note.chapterName = chapterName;
        }

        await note.save();

        return note;
    }

    /**
     * Delete a note
     */
    static async deleteNote(userId: string, noteId: string): Promise<void> {
        const note = await this.getNote(userId, noteId);

        // Update bookshelf item note count
        const bookshelfItem = await BookshelfItem.findById(note.bookshelfItemId);
        if (bookshelfItem) {
            bookshelfItem.notes = Math.max(0, bookshelfItem.notes - 1);
            await bookshelfItem.save();
        }

        await BookNote.findByIdAndDelete(noteId);
    }

    /**
     * Get single note by ID with ownership validation
     */
    static async getNote(userId: string, noteId: string): Promise<IBookNoteDocument> {
        const note = await BookNote.findById(toObjectId(noteId));

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        // For private notes, validate ownership
        if (note.visibility === 'private' && note.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        return note;
    }

    /**
     * Get all notes for a book with filters
     */
    static async getNotesForBook(
        userId: string,
        bookshelfItemId: string,
        filters: NoteFilters = {}
    ): Promise<{
        notes: IBookNoteDocument[];
        total: number;
    }> {
        const {
            type,
            pageNumber,
            tags,
            visibility,
            isSpotlight,
            sortBy = 'pageNumber',
            sortOrder = 'asc',
            limit = 100,
            offset = 0
        } = filters;

        // Validate bookshelf item belongs to user
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        // Build query
        const query: any = { bookshelfItemId: toObjectId(bookshelfItemId) };

        if (type) {
            query.type = Array.isArray(type) ? { $in: type } : type;
        }

        if (pageNumber !== undefined) {
            query.pageNumber = pageNumber;
        }

        if (tags && tags.length > 0) {
            query.tags = { $in: tags };
        }

        if (visibility) {
            query.visibility = visibility;
        }

        if (isSpotlight !== undefined) {
            query.isSpotlight = isSpotlight;
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const [notes, total] = await Promise.all([
            BookNote.find(query)
                .sort(sort)
                .skip(offset)
                .limit(limit)
                .lean(),
            BookNote.countDocuments(query)
        ]);

        return { notes: notes as unknown as IBookNoteDocument[], total };
    }

    /**
     * Get notes grouped by page
     */
    static async getNotesByPage(userId: string, bookshelfItemId: string): Promise<any[]> {
        // Validate ownership
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        return await BookNote.getNotesByPage(toObjectId(bookshelfItemId));
    }

    /**
     * Search notes by content
     */
    static async searchNotes(
        userId: string,
        searchQuery: string,
        bookshelfItemId?: string,
        limit: number = 20
    ): Promise<IBookNoteDocument[]> {
        const query: any = {
            userId: toObjectId(userId),
            $or: [
                { highlightedText: { $regex: searchQuery, $options: 'i' } },
                { userNote: { $regex: searchQuery, $options: 'i' } },
                { tags: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        if (bookshelfItemId) {
            query.bookshelfItemId = toObjectId(bookshelfItemId);
        }

        return await BookNote.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('bookId', 'title author coverImage')
            .lean() as unknown as IBookNoteDocument[];
    }

    /**
     * Toggle spotlight/featured status
     */
    static async toggleSpotlight(userId: string, noteId: string): Promise<IBookNoteDocument> {
        const note = await this.getNote(userId, noteId);
        await note.toggleSpotlight();
        return note;
    }

    /**
     * Like a note (public or followers-only)
     */
    static async likeNote(userId: string, noteId: string): Promise<IBookNoteDocument> {
        const note = await BookNote.findById(toObjectId(noteId));

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        // Check visibility - can't like private notes unless owner
        if (note.visibility === 'private' && note.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        await note.addLike();
        return note;
    }

    /**
     * Unlike a note
     */
    static async unlikeNote(userId: string, noteId: string): Promise<IBookNoteDocument> {
        const note = await BookNote.findById(toObjectId(noteId));

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        await note.removeLike();
        return note;
    }

    /**
     * Update note visibility
     */
    static async updateVisibility(
        userId: string,
        noteId: string,
        visibility: Visibility
    ): Promise<IBookNoteDocument> {
        const note = await this.getNote(userId, noteId);
        await note.updateVisibility(visibility);
        return note;
    }

    /**
     * Share note to book club
     */
    static async shareToBookClub(
        userId: string,
        noteId: string,
        bookClubId: string
    ): Promise<IBookNoteDocument> {
        const note = await this.getNote(userId, noteId);

        // TODO: Validate user is member of book club (when Book Club feature is implemented)

        note.sharedWithBookClubId = toObjectId(bookClubId);
        note.visibility = 'public'; // Auto-set to public when sharing to book club
        await note.save();

        return note;
    }

    /**
     * Unshare note from book club
     */
    static async unshareFromBookClub(userId: string, noteId: string): Promise<IBookNoteDocument> {
        const note = await this.getNote(userId, noteId);

        note.sharedWithBookClubId = null;
        await note.save();

        return note;
    }

    /**
     * Get popular highlights for a book (social discovery)
     */
    static async getPopularHighlights(
        bookId: string,
        limit: number = 10
    ): Promise<IBookNoteDocument[]> {
        return await BookNote.getPopularHighlights(toObjectId(bookId), limit);
    }

    /**
     * Get user's spotlight/featured notes
     */
    static async getSpotlightNotes(userId: string, limit: number = 10): Promise<IBookNoteDocument[]> {
        return await BookNote.find({
            userId: toObjectId(userId),
            isSpotlight: true
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('bookId', 'title author coverImage')
            .lean() as unknown as IBookNoteDocument[];
    }

    /**
     * Get recent public notes (discovery feed)
     */
    static async getPublicNotes(limit: number = 20, offset: number = 0): Promise<IBookNoteDocument[]> {
        return await BookNote.find({
            visibility: 'public',
            type: { $in: ['highlight', 'note', 'question'] }
        })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate('userId', 'username profileImage')
            .populate('bookId', 'title author coverImage')
            .lean() as unknown as IBookNoteDocument[];
    }

    /**
     * Get notes shared with a book club
     */
    static async getBookClubNotes(bookClubId: string, limit: number = 50): Promise<IBookNoteDocument[]> {
        // TODO: Validate user is member of book club (when Book Club feature is implemented)

        return await BookNote.find({
            sharedWithBookClubId: toObjectId(bookClubId)
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'username profileImage')
            .populate('bookId', 'title author coverImage')
            .lean() as unknown as IBookNoteDocument[];
    }

    /**
     * Get note statistics for a user
     */
    static async getNoteStats(userId: string): Promise<{
        totalNotes: number;
        highlights: number;
        notes: number;
        bookmarks: number;
        questions: number;
        publicNotes: number;
        totalLikes: number;
    }> {
        const stats = await BookNote.aggregate([
            {
                $match: { userId: toObjectId(userId) }
            },
            {
                $group: {
                    _id: null,
                    totalNotes: { $sum: 1 },
                    highlights: {
                        $sum: { $cond: [{ $eq: ['$type', 'highlight'] }, 1, 0] }
                    },
                    notes: {
                        $sum: { $cond: [{ $eq: ['$type', 'note'] }, 1, 0] }
                    },
                    bookmarks: {
                        $sum: { $cond: [{ $eq: ['$type', 'bookmark'] }, 1, 0] }
                    },
                    questions: {
                        $sum: { $cond: [{ $eq: ['$type', 'question'] }, 1, 0] }
                    },
                    publicNotes: {
                        $sum: { $cond: [{ $eq: ['$visibility', 'public'] }, 1, 0] }
                    },
                    totalLikes: { $sum: '$likes' }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                totalNotes: 0,
                highlights: 0,
                notes: 0,
                bookmarks: 0,
                questions: 0,
                publicNotes: 0,
                totalLikes: 0
            };
        }

        return stats[0];
    }

    /**
     * Get notes by tag
     */
    static async getNotesByTag(userId: string, tag: string, limit: number = 50): Promise<IBookNoteDocument[]> {
        return await BookNote.find({
            userId: toObjectId(userId),
            tags: tag
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('bookId', 'title author coverImage')
            .lean() as unknown as IBookNoteDocument[];
    }

    /**
     * Get all unique tags used by a user
     */
    static async getUserTags(userId: string): Promise<string[]> {
        const result = await BookNote.aggregate([
            {
                $match: { userId: toObjectId(userId) }
            },
            {
                $unwind: '$tags'
            },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        return result.map(r => r._id);
    }

    /**
     * Bulk delete notes (by book or filters)
     */
    static async bulkDeleteNotes(
        userId: string,
        bookshelfItemId: string,
        filters: { type?: NoteType; tags?: string[] } = {}
    ): Promise<{ deletedCount: number }> {
        // Validate ownership
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        const query: any = {
            userId: toObjectId(userId),
            bookshelfItemId: toObjectId(bookshelfItemId)
        };

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        const result = await BookNote.deleteMany(query);

        // Update bookshelf item note count
        const remainingNotes = await BookNote.countDocuments({
            bookshelfItemId: toObjectId(bookshelfItemId)
        });
        bookshelfItem.notes = remainingNotes;
        await bookshelfItem.save();

        return { deletedCount: result.deletedCount || 0 };
    }

    /**
     * Export notes for a book (for backup or sharing)
     */
    static async exportNotes(userId: string, bookshelfItemId: string): Promise<any[]> {
        // Validate ownership
        const bookshelfItem = await BookshelfItem.findById(toObjectId(bookshelfItemId));
        if (!bookshelfItem) {
            throw new Error('BOOKSHELF_ITEM_NOT_FOUND');
        }
        if (bookshelfItem.userId.toString() !== userId) {
            throw new Error('UNAUTHORIZED');
        }

        const notes = await BookNote.find({
            bookshelfItemId: toObjectId(bookshelfItemId)
        })
            .sort({ pageNumber: 1, createdAt: 1 })
            .populate('bookId', 'title author')
            .lean();

        // Format for export
        return notes.map(note => ({
            type: note.type,
            pageNumber: note.pageNumber,
            chapterName: note.chapterName,
            highlightedText: note.highlightedText,
            userNote: note.userNote,
            tags: note.tags,
            createdAt: note.createdAt,
            color: note.color
        }));
    }
}

export default BookNoteService;
