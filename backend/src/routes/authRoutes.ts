import express, { Request, Response, NextFunction } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import protectRoute from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = express.Router();

//generate token payload interface
interface GenerateTokenPayload {
    userId: string;
}

const generateToken = (userId: any): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    return jwt.sign({ userId }, secret, { expiresIn: "15d" });
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

    const token = generateToken(user._id);

    res.status(201).json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
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

    const token = generateToken(user._id);

    res.status(200).json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            bio: user.bio,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
        },
    });
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
            profileImage: user.profileImage,
            bio: user.bio,
            level: user.level,
            points: user.points,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            createdAt: user.createdAt,
        },
    });
}));

export default router;
