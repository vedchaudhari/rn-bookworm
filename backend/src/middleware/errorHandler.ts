import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
    statusCode?: number;
    code?: string | number;
    keyValue?: any;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(`[Error] ${err.message}`, {
        url: req.originalUrl,
        method: req.method,
        // body: req.body, // Removed for security to avoid logging passwords/PII
        query: req.query,
        params: req.params,
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const isProd = process.env.NODE_ENV === 'production';

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            error: "Conflict",
            message: `${field} already exists.`,
        });
    }

    // Handle Mongoose Validation Error
    if (err.name === "ValidationError") {
        return res.status(400).json({
            error: "Validation Error",
            message: err.message,
        });
    }

    // Handle JWT Error
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid token. Please log in again.",
        });
    }

    // Handle Token Expired Error
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Token expired. Please log in again.",
        });
    }

    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? "Internal Server Error" : (err.name || "Error"),
        message: statusCode === 500 && isProd ? "Something went wrong on the server" : message,
        stack: isProd ? undefined : err.stack
    });
};
