import { Request, Response, NextFunction } from 'express';
import Book from '../models/Book';
import Follow from '../models/Follow';
import { IUserDocument } from '../models/User';

/**
 * Middleware to check if a user has access to a book
 * Access is granted if:
 * 1. The book is public
 * 2. The user is the owner of the book
 * 3. The user is an accepted follower of the book owner
 */
export const checkBookAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookId } = req.params;
        const userId = req.user?._id;

        if (!bookId) {
            return res.status(400).json({ success: false, message: 'Book ID is required' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        // 1. If book is public, anyone can access
        if (book.visibility === 'public') {
            return next();
        }

        // Below rules require authentication
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required for private content' });
        }

        // 2. If user is the owner, grant access
        if (book.user.toString() === userId.toString()) {
            return next();
        }

        // 3. Check if user is an accepted follower of the owner
        const follow = await Follow.findOne({
            follower: userId,
            following: book.user,
            status: 'accepted'
        });

        if (follow) {
            return next();
        }

        // If none of the above, access is denied
        return res.status(403).json({
            success: false,
            message: 'Access denied. You must follow the author to view this private book.'
        });

    } catch (error: any) {
        console.error('Error in checkBookAccess middleware:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};
