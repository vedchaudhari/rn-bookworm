import express, { Request, Response, NextFunction } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import protectRoute from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { getSignedUrlForFile } from "../lib/s3";
import { redis } from "../lib/redis";
import { UserService } from "../services/userService";

const router = express.Router();

// Generate token payload interface
interface GenerateTokenPayload {
    userId: string;
    jti?: string; // JWT ID for refresh tokens
}

// Token Configuration
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

// Helper to hash token for Redis storage
const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = (userId: any) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }

    // Access Token
    const accessToken = jwt.sign({ userId }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });

    // Refresh Token with unique JTI
    const jti = crypto.randomUUID();
    const refreshToken = jwt.sign({ userId, jti }, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return { accessToken, refreshToken, jti };
};

const storeRefreshToken = async (userId: string, jti: string, refreshToken: string) => {
    const key = `refresh:${userId}:${jti}`;
    const hash = hashToken(refreshToken);
    await redis.set(key, hash, { ex: REFRESH_TOKEN_TTL });
};

// Register Route
interface RegisterBody {
    email?: string;
    username?: string;
    password?: string;
}

router.post("/register", asyncHandler(async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    const { email, username, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    if (username.length < 3) {
        return res.status(400).json({ message: "Username should be at least 3 characters long" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    // check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" }); // 409 Conflict
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
    }

    // get random avatar
    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const user = new User({
        email,
        username,
        password,
        profileImage,
    });

    await user.save();

    const { accessToken, refreshToken, jti } = generateTokens(user._id);
    await storeRefreshToken(user._id.toString(), jti, refreshToken);

    res.status(201).json({
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: await getSignedUrlForFile(user.profileImage),
            bio: user.bio,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
        },
    });
}));

// Login Route
interface LoginBody {
    email?: string;
    password?: string;
}

router.post("/login", asyncHandler(async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    const loginIdentifier = email.toLowerCase();

    const user = await User.findOne({
        $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    }).select('+password');

    const invalidCredsMsg = "Invalid credentials";

    if (!user) {
        return res.status(401).json({ message: invalidCredsMsg }); // 401 Unauthorized
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
        return res.status(401).json({ message: invalidCredsMsg });
    }

    const { accessToken, refreshToken, jti } = generateTokens(user._id);
    await storeRefreshToken(user._id.toString(), jti, refreshToken);

    res.status(200).json({
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: await getSignedUrlForFile(user.profileImage),
            bio: user.bio,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
        },
    });
}));

// Refresh Token Route
router.post("/refresh", asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "Server configuration error" });

    try {
        // 1. Verify Request Token Signature
        const decoded = jwt.verify(refreshToken, secret) as GenerateTokenPayload;

        if (!decoded.userId || !decoded.jti) {
            return res.status(403).json({ message: "Invalid token payload" });
        }

        const { userId, jti } = decoded;
        const key = `refresh:${userId}:${jti}`;

        // 2. Check Redis for token existence
        const storedHash = await redis.get(key);

        if (!storedHash) {
            // Token not in Redis (expired, revoked, or rotated)
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        // 3. Verify Hash (Security: Detect token mismatch)
        const requestHash = hashToken(refreshToken);
        if (storedHash !== requestHash) {
            // Potential token reuse/theft
            await redis.del(key);
            return res.status(403).json({ message: "Invalid token" });
        }

        // 4. Token Rotation: Delete old token
        await redis.del(key);

        // 5. Generate New Tokens
        const newTokens = generateTokens(userId);

        // 6. Store New Refresh Token
        await storeRefreshToken(userId, newTokens.jti, newTokens.refreshToken);

        res.json({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken
        });

    } catch (error) {
        console.error("Refresh Token Error:", error);
        return res.status(403).json({ message: "Invalid refresh token" });
    }
}));

// Logout Route
router.post("/logout", asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // If no refresh token provided, just success (client strips state)
    if (!refreshToken) {
        return res.status(200).json({ message: "Logged out" });
    }

    try {
        const secret = process.env.JWT_SECRET!;
        // Decode without verifying expiration to get ID (allow logout even if expired)
        const decoded = jwt.decode(refreshToken) as GenerateTokenPayload;

        if (decoded && decoded.userId && decoded.jti) {
            const key = `refresh:${decoded.userId}:${decoded.jti}`;
            await redis.del(key);
        }
    } catch (e) {
        // Ignore errors during logout
        console.error("Logout cleanup error:", e);
    }

    res.status(200).json({ message: "Logged out successfully" });
}));

// Get Current User Route
router.get("/me", protectRoute, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "User not found" });

    res.status(200).json({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: await getSignedUrlForFile(user.profileImage),
            bio: user.bio,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
        },
    });
}));

// Change Password Route
interface ChangePasswordBody {
    currentPassword?: string;
    newPassword?: string;
}

router.put("/change-password", protectRoute, asyncHandler(async (req: Request<{}, {}, ChangePasswordBody>, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!._id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return res.status(403).json({ message: "Incorrect current password" });
    }

    // Update password (pre-save hook will hash it)
    await UserService.updatePassword(userId.toString(), newPassword);

    res.json({ message: "Password updated successfully" });
}));

export default router;
