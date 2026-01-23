import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validation schemas for API requests
 */

// MongoDB ObjectId string validation
export const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid ObjectId format' }
);

// User validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
        .min(3, '  Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Book validation schemas
export const createBookSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    caption: z.string().min(1, 'Caption is required').max(1000, 'Caption too long'),
    rating: z.number().int().min(1).max(5).or(z.string().transform(val => parseInt(val, 10))),
    image: z.string().min(1, 'Image is required'),
    genre: z.string().optional().default('General'),
    author: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([])
});

// Bookshelf item validation schemas
export const addToBookshelfSchema = z.object({
    bookId: objectIdSchema,
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped']).optional(),
    totalPages: z.number().int().min(0).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    isPrivate: z.boolean().optional()
});

export const updateBookshelfItemSchema = z.object({
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped']).optional(),
    currentPage: z.number().int().min(0).optional(),
    totalPages: z.number().int().min(0).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    review: z.string().max(2000).optional(),
    isFavorite: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    isPrivate: z.boolean().optional(),
    tags: z.array(z.string()).max(20).optional(),
    targetCompletionDate: z.string().datetime().optional().or(z.null())
});

// Reading session validation schemas
export const startSessionSchema = z.object({
    bookshelfItemId: objectIdSchema,
    sessionType: z.enum(['timed', 'pages']).optional().default('pages'),
    startPage: z.number().int().min(0).optional()
});

export const endSessionSchema = z.object({
    endPage: z.number().int().min(0).optional(),
    mood: z.enum(['excited', 'focused', 'relaxed', 'emotional', 'neutral']).optional()
});

// Social validation schemas
export const addCommentSchema = z.object({
    text: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment too long')
});

export const reportSchema = z.object({
    reportedEntityId: objectIdSchema,
    entityType: z.enum(['post', 'user', 'comment']),
    reason: z.enum(['spam', 'harassment', 'inappropriate_content', 'misinformation', 'copyright', 'other']),
    details: z.string().max(500).optional()
});

// Message validation schemas
export const sendMessageSchema = z.object({
    receiverId: objectIdSchema,
    content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long')
});

// Pagination validation
export const paginationSchema = z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional().default('1'),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional().default('10')
});

// Query params validation
export const bookshelfQuerySchema = paginationSchema.extend({
    status: z.enum(['want_to_read', 'currently_reading', 'completed', 'paused', 'dropped', 'all']).optional().default('all'),
    sortBy: z.enum(['createdAt', 'lastReadAt', 'progress', 'rating']).optional().default('lastReadAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    favorite: z.string().transform(val => val === 'true').optional()
});

/**
 * Validation middleware factory
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
    return (req: any, res: any, next: any) => {
        try {
            const data = {
                ...req.body,
                ...req.query,
                ...req.params
            };

            const result = schema.safeParse(data);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            // Attach validated data to request
            req.validatedData = result.data;
            next();
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Validation error',
                error: error.message
            });
        }
    };
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type AddToBookshelfInput = z.infer<typeof addToBookshelfSchema>;
export type UpdateBookshelfItemInput = z.infer<typeof updateBookshelfItemSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type BookshelfQueryInput = z.infer<typeof bookshelfQuerySchema>;
