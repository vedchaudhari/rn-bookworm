import { Request, Response, NextFunction } from "express";

/**
 * Unified Async Handler for Express Routes
 * Captures errors in async functions and passes them to the next middleware (error handler)
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
