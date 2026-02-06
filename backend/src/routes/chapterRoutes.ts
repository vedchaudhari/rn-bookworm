import express, { Request, Response } from 'express';
import Chapter from '../models/Chapter';
import Book from '../models/Book';
import BookshelfItem from '../models/BookshelfItem';
import protectRoute from '../middleware/auth.middleware';
import { upload, cleanupUploadedFile } from '../middleware/upload.middleware';
import { parseTXT, parsePDF, sanitizeChapterContent } from '../lib/fileParser';
import { uploadFileToS3, getSignedUrlForFile } from '../lib/s3';
import { checkBookAccess } from '../middleware/access.middleware';
import fs from 'fs';


const router = express.Router();

// ============= AUTHOR ENDPOINTS =============

// Create a new chapter
router.post('/:bookId/chapters', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { title, content, chapterNumber, isPremium } = req.body;
        const authorId = req.user!._id;

        // Verify book exists and user is the author
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        if (book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the book author can add chapters'
            });
        }

        // Check if chapter number already exists
        const existingChapter = await Chapter.findOne({ bookId, chapterNumber });
        if (existingChapter) {
            return res.status(400).json({
                success: false,
                message: `Chapter ${chapterNumber} already exists`
            });
        }

        // Create chapter
        const chapter = await Chapter.create({
            bookId,
            authorId,
            chapterNumber,
            title,
            content,
            isPremium: isPremium || false,
            isPublished: false
        });

        res.status(201).json({
            success: true,
            message: 'Chapter created successfully',
            chapter
        });
    } catch (error: any) {
        console.error('Error creating chapter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get all chapters for a book (author view - includes unpublished)
router.get('/:bookId/chapters/author', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const authorId = req.user!._id;

        // Verify user is the author
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        if (book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const chapters = await Chapter.find({ bookId })
            .sort({ chapterNumber: 1 })
            .select('-content'); // Don't send full content in list

        res.json({
            success: true,
            chapters,
            total: chapters.length
        });
    } catch (error: any) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Update a chapter
router.put('/:bookId/chapters/:chapterNumber', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId, chapterNumber } = req.params;
        const { title, content, isPremium } = req.body;
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId);
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const chapter = await Chapter.findOneAndUpdate(
            { bookId, chapterNumber: parseInt(chapterNumber) },
            { title, content, isPremium },
            { new: true }
        );

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        res.json({
            success: true,
            message: 'Chapter updated successfully',
            chapter
        });
    } catch (error: any) {
        console.error('Error updating chapter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Publish a chapter
router.post('/:bookId/chapters/:chapterNumber/publish', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId, chapterNumber } = req.params;
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId);
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const chapter = await Chapter.findOneAndUpdate(
            { bookId, chapterNumber: parseInt(chapterNumber) },
            { isPublished: true },
            { new: true }
        );

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Update book's total chapters count
        const publishedCount = await Chapter.countDocuments({ bookId, isPublished: true });
        await Book.findByIdAndUpdate(bookId, {
            totalChapters: publishedCount,
            hasContent: publishedCount > 0,
            contentType: 'chapters'
        });

        res.json({
            success: true,
            message: 'Chapter published successfully',
            chapter
        });
    } catch (error: any) {
        console.error('Error publishing chapter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Delete a chapter
router.delete('/:bookId/chapters/:chapterNumber', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId, chapterNumber } = req.params;
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId);
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const chapter = await Chapter.findOneAndDelete({
            bookId,
            chapterNumber: parseInt(chapterNumber)
        });

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Update book stats
        const publishedCount = await Chapter.countDocuments({ bookId, isPublished: true });
        await Book.findByIdAndUpdate(bookId, {
            totalChapters: publishedCount,
            hasContent: publishedCount > 0
        });

        res.json({
            success: true,
            message: 'Chapter deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ============= BULK UPLOAD ENDPOINT =============

// Upload file and auto-split into chapters
router.post('/:bookId/upload', protectRoute, upload.single('manuscript'), async (req: Request, res: Response) => {
    let filePath: string | undefined;

    try {
        const { bookId } = req.params;
        const { keepPdf } = req.query; // Check if user wants to keep as PDF
        const authorId = req.user!._id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        filePath = file.path;

        // Verify book exists and user is the author
        const book = await Book.findById(bookId);
        if (!book) {
            cleanupUploadedFile(filePath);
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        if (book.user.toString() !== authorId.toString()) {
            cleanupUploadedFile(filePath);
            return res.status(403).json({
                success: false,
                message: 'Only the book author can upload chapters'
            });
        }

        // ==================== PDF MODE ====================
        if (keepPdf === 'true') {
            if (file.mimetype !== 'application/pdf') {
                cleanupUploadedFile(filePath);
                return res.status(400).json({
                    success: false,
                    message: 'Only PDF files can be used for PDF reading mode.'
                });
            }

            try {
                const { isS3Configured, uploadFileToS3 } = await import('../lib/s3');

                let savedUrl: string;
                let mode: 'pdf' | 'pdf_local' = 'pdf';

                if (isS3Configured()) {
                    // Upload to S3
                    savedUrl = await uploadFileToS3(authorId.toString(), filePath, file.originalname, file.mimetype);
                    cleanupUploadedFile(filePath); // Cleanup local temp file
                } else {
                    // Fallback to local storage (keep the file in uploadsDir)
                    console.log('PDF Upload: S3 not configured, falling back to local storage');
                    savedUrl = `/uploads/${file.filename}`;
                    mode = 'pdf_local';
                    // We DON'T cleanup here because the file IS the content now
                }

                book.pdfUrl = savedUrl;
                book.contentType = 'pdf';
                book.hasContent = true;
                book.publishStatus = 'published';
                await book.save();

                return res.status(200).json({
                    success: true,
                    message: mode === 'pdf' ? 'PDF uploaded to S3 successfully' : 'PDF saved locally (Dev Mode)',
                    pdfUrl: savedUrl,
                    mode: mode
                });
            } catch (storageError: any) {
                console.error('Storage Error:', storageError);
                cleanupUploadedFile(filePath);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save PDF to storage',
                    error: storageError.message
                });
            }
        }
        // ==================================================

        // Parse file based on type
        let chapters;
        const mimeType = file.mimetype;

        if (mimeType === 'text/plain') {
            const text = await fs.promises.readFile(filePath, 'utf-8');
            chapters = await parseTXT(text);
        } else if (mimeType === 'application/pdf') {
            chapters = await parsePDF(filePath);
        } else {
            cleanupUploadedFile(filePath);
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type. Currently supports TXT and PDF files.'
            });
        }

        if (!chapters || chapters.length === 0) {
            cleanupUploadedFile(filePath);
            return res.status(400).json({
                success: false,
                message: 'No chapters detected in the file. Please ensure your file contains properly formatted chapters.'
            });
        }

        // Create all chapters in database
        const createdChapters = [];
        for (const chapterData of chapters) {
            // Check if chapter number already exists
            const existing = await Chapter.findOne({ bookId, chapterNumber: chapterData.number });
            if (existing) {
                continue; // Skip existing chapters
            }

            const chapter = await Chapter.create({
                bookId,
                authorId,
                chapterNumber: chapterData.number,
                title: chapterData.title,
                content: sanitizeChapterContent(chapterData.content),
                isPublished: false,
                isPremium: false
            });

            createdChapters.push({
                chapterNumber: chapter.chapterNumber,
                title: chapter.title,
                wordCount: chapter.wordCount,
                readingTimeEstimate: chapter.readingTimeEstimate
            });
        }

        // Cleanup uploaded file
        cleanupUploadedFile(filePath);

        res.status(201).json({
            success: true,
            message: `Successfully created ${createdChapters.length} chapters`,
            chaptersCreated: createdChapters.length,
            chapters: createdChapters,
            skipped: chapters.length - createdChapters.length
        });
    } catch (error: any) {
        // Ultimate fallback cleanup: ensure any remaining temp file is removed
        if (filePath && fs.existsSync(filePath)) {
            cleanupUploadedFile(filePath);
        }

        console.error('Error uploading chapters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Bulk publish chapters
router.post('/:bookId/bulk-publish', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { chapterNumbers } = req.body; // Array of chapter numbers to publish
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId);
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Publish specified chapters (or all if not specified)
        const query: any = { bookId };
        if (chapterNumbers && Array.isArray(chapterNumbers) && chapterNumbers.length > 0) {
            query.chapterNumber = { $in: chapterNumbers };
        }

        const result = await Chapter.updateMany(query, { isPublished: true });

        // Update book stats
        const totalPublished = await Chapter.countDocuments({ bookId, isPublished: true });
        await Book.findByIdAndUpdate(bookId, {
            totalChapters: totalPublished,
            hasContent: totalPublished > 0,
            contentType: 'chapters',
            publishStatus: totalPublished > 0 ? 'published' : 'draft'
        });

        res.json({
            success: true,
            message: `Published ${result.modifiedCount} chapters`,
            publishedCount: result.modifiedCount,
            totalPublished
        });
    } catch (error: any) {
        console.error('Error bulk publishing chapters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Merge two consecutive chapters
router.post('/:bookId/merge', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { chapter1Number, chapter2Number } = req.body;
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId);
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const [ch1, ch2] = await Promise.all([
            Chapter.findOne({ bookId, chapterNumber: chapter1Number }),
            Chapter.findOne({ bookId, chapterNumber: chapter2Number })
        ]);

        if (!ch1 || !ch2) {
            return res.status(404).json({
                success: false,
                message: 'One or both chapters not found'
            });
        }

        // Merge content
        ch1.content = ch1.content + '\n\n---\n\n' + ch2.content;
        ch1.title = ch1.title + ' & ' + ch2.title;
        await ch1.save();

        // Delete second chapter
        await ch2.deleteOne();

        // Renumber subsequent chapters
        await Chapter.updateMany(
            { bookId, chapterNumber: { $gt: chapter2Number } },
            { $inc: { chapterNumber: -1 } }
        );

        res.json({
            success: true,
            message: 'Chapters merged successfully',
            mergedChapter: {
                chapterNumber: ch1.chapterNumber,
                title: ch1.title,
                wordCount: ch1.wordCount
            }
        });
    } catch (error: any) {
        console.error('Error merging chapters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ============= READER ENDPOINTS =============

// Get published chapters list (reader view)
router.get('/:bookId/chapters', protectRoute, checkBookAccess, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;

        const chapters = await Chapter.find({
            bookId,
            isPublished: true
        })
            .sort({ chapterNumber: 1 })
            .select('chapterNumber title wordCount readingTimeEstimate isPremium publishedAt');

        res.json({
            success: true,
            chapters,
            total: chapters.length
        });
    } catch (error: any) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Read a specific chapter
router.get('/:bookId/chapters/:chapterNumber/read', protectRoute, checkBookAccess, async (req: Request, res: Response) => {
    try {
        const { bookId, chapterNumber } = req.params;
        const userId = req.user!._id;

        // Get chapter
        const chapter = await Chapter.findOne({
            bookId,
            chapterNumber: parseInt(chapterNumber),
            isPublished: true
        });

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found or not published'
            });
        }

        // Check access for premium chapters
        const isAuthor = chapter.authorId.toString() === userId.toString();

        if (chapter.isPremium && !isAuthor && !req.user?.isPro) {
            return res.status(403).json({
                success: false,
                message: 'This is a premium chapter. Upgrade to Readsphere Pro to read.',
                isPremium: true
            });
        }

        // Update reading progress
        const bookshelfItem = await BookshelfItem.findOne({ userId, bookId });
        if (bookshelfItem) {
            bookshelfItem.lastReadChapter = parseInt(chapterNumber);
            bookshelfItem.lastReadAt = new Date();

            // Update current chapter if it's ahead
            if (parseInt(chapterNumber) > bookshelfItem.currentChapter) {
                bookshelfItem.currentChapter = parseInt(chapterNumber);
            }

            await bookshelfItem.save();
        }

        res.json({
            success: true,
            chapter: {
                chapterNumber: chapter.chapterNumber,
                title: chapter.title,
                content: chapter.content,
                wordCount: chapter.wordCount,
                readingTimeEstimate: chapter.readingTimeEstimate
            }
        });
    } catch (error: any) {
        console.error('Error reading chapter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Mark chapter as complete
router.post('/:bookId/chapters/:chapterNumber/complete', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId, chapterNumber } = req.params;
        const userId = req.user!._id;

        const bookshelfItem = await BookshelfItem.findOne({ userId, bookId });
        if (!bookshelfItem) {
            return res.status(404).json({
                success: false,
                message: 'Book not in bookshelf. Add it first.'
            });
        }

        const chNum = parseInt(chapterNumber);

        // Add to completed chapters if not already there
        if (!bookshelfItem.completedChapters.includes(chNum)) {
            bookshelfItem.completedChapters.push(chNum);
            bookshelfItem.completedChapters.sort((a, b) => a - b);
        }

        // Get total chapters from book
        const book = await Book.findById(bookId);
        if (book && book.totalChapters > 0) {
            // Calculate progress percentage based on chapters
            const progressPercent = Math.round(
                (bookshelfItem.completedChapters.length / book.totalChapters) * 100
            );
            bookshelfItem.progress = progressPercent;

            // If all chapters completed, mark as complete
            if (progressPercent >= 100) {
                bookshelfItem.status = 'completed';
                bookshelfItem.completedAt = new Date();
            } else if (bookshelfItem.status === 'want_to_read') {
                bookshelfItem.status = 'currently_reading';
                bookshelfItem.startedReadingAt = bookshelfItem.startedReadingAt || new Date();
            }
        }

        await bookshelfItem.save();

        res.json({
            success: true,
            message: 'Chapter marked as complete',
            progress: {
                currentChapter: bookshelfItem.currentChapter,
                completedChapters: bookshelfItem.completedChapters,
                progressPercent: bookshelfItem.progress
            }
        });
    } catch (error: any) {
        console.error('Error marking chapter complete:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET AUTHOR STATS
router.get('/:bookId/stats', protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const authorId = req.user!._id;

        // Verify ownership
        const book = await Book.findById(bookId).select('title author image totalChapters user');
        if (!book || book.user.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Aggregate statistics from BookshelfItem
        const items = await BookshelfItem.find({ bookId });

        const totalReaders = items.length;
        const currentlyReading = items.filter(i => i.status === 'currently_reading').length;
        const completed = items.filter(i => i.status === 'completed').length;

        // Average progress
        const avgProgress = totalReaders > 0
            ? Math.round(items.reduce((acc, curr) => acc + curr.progress, 0) / totalReaders)
            : 0;

        // Chapter drop-off (how many people reached/completed each chapter)
        const chapterStats: any = {};
        items.forEach(item => {
            item.completedChapters.forEach(chNum => {
                chapterStats[chNum] = (chapterStats[chNum] || 0) + 1;
            });
        });

        // Recent activity
        const recentReaders = await BookshelfItem.find({ bookId })
            .sort({ lastReadAt: -1 })
            .limit(5)
            .populate('userId', 'username profileImage');

        res.json({
            success: true,
            stats: {
                totalReaders,
                currentlyReading,
                completed,
                avgProgress,
                chapterStats, // {1: 50, 2: 45, 3: 30...}
                recentReaders: await Promise.all(recentReaders.map(async (r) => {
                    const userObj = (r.userId as any).toObject ? (r.userId as any).toObject() : r.userId;
                    userObj.profileImage = await getSignedUrlForFile(userObj.profileImage);
                    return {
                        user: userObj,
                        progress: r.progress,
                        lastReadAt: r.lastReadAt
                    };
                }))
            }
        });
    } catch (error: any) {
        console.error('Error fetching author stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get reading metadata
router.get('/:bookId/reader/metadata', protectRoute, checkBookAccess, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const userId = req.user!._id;

        const [book, bookshelfItem, totalChapters] = await Promise.all([
            Book.findById(bookId).select('title author image totalChapters hasContent'),
            BookshelfItem.findOne({ userId, bookId }),
            Chapter.countDocuments({ bookId, isPublished: true })
        ]);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        const bookObj = book.toObject();
        if (bookObj.image && bookObj.image.includes('amazonaws.com')) {
            bookObj.image = await getSignedUrlForFile(bookObj.image);
        }
        if (bookObj.pdfUrl && bookObj.pdfUrl.includes('amazonaws.com')) {
            bookObj.pdfUrl = await getSignedUrlForFile(bookObj.pdfUrl);
        }

        res.json({
            success: true,
            book: {
                title: bookObj.title,
                author: bookObj.author,
                image: bookObj.image,
                pdfUrl: bookObj.pdfUrl,
                totalChapters: book.totalChapters || totalChapters
            },
            progress: bookshelfItem ? {
                currentChapter: bookshelfItem.currentChapter,
                lastReadChapter: bookshelfItem.lastReadChapter,
                completedChapters: bookshelfItem.completedChapters,
                progressPercent: bookshelfItem.progress,
                status: bookshelfItem.status
            } : null
        });
    } catch (error: any) {
        console.error('Error fetching reader metadata:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

export default router;
