import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import User, { IUserDocument } from "../models/User";
import { redis, CACHE_KEYS, TTL } from "../lib/redis";

import { UserService } from "../services/userService";

// Extend the Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: IUserDocument;
        }
    }
}

interface DecodedToken extends JwtPayload {
    userId: string;
}

const protectRoute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader) {
            return res.status(401).json({ message: "No authentication token, access denied" });
        }

        // Strict Bearer Token Parsing
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Invalid token format. Format must be: Bearer <token>" });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token.trim() === "") {
            return res.status(401).json({ message: "Token is empty" });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            // Internal error, pass to global handler
            return next(new Error("Internal Server Error: JWT_SECRET missing"));
        }

        try {
            const decoded = jwt.verify(token, secret) as DecodedToken;
            const userId = decoded.userId;

            // Use Centralized Service (Handles Redis Read-Through)
            const user = await UserService.getUserById(userId);

            if (!user) {
                console.warn(`User found in token but not DB: ${userId}`);
                return res.status(401).json({ message: "Token is not valid" });
            }

            req.user = user;
            next();

        } catch (jwtError: any) {
            console.error(`JWT Verification Failed: ${jwtError.message}`);
            return res.status(401).json({ message: "Token is not valid" });
        }

    } catch (error: any) {
        next(error);
    }
};

export default protectRoute;
