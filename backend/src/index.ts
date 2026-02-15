import express, { Express, Request, Response } from "express";
import path from "path";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes";
import bookRoutes from "./routes/bookRoutes";
import socialRoutes from "./routes/socialRoutes";
import gamificationRoutes from "./routes/gamificationRoutes";
import discoveryRoutes from "./routes/discoveryRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import messageRoutes from "./routes/messageRoutes";
import bookContentRoutes from "./routes/bookContentRoutes";
import userRoutes from "./routes/userRoutes";
import bookshelfRoutes from "./routes/bookshelfRoutes";
import streakRoutes from "./routes/streakRoutes";
import readingSessionRoutes from "./routes/readingSessionRoutes";
import bookNoteRoutes from "./routes/bookNoteRoutes";
import challengeRoutes from "./routes/challengeRoutes";
import chapterRoutes from "./routes/chapterRoutes";
import currencyRoutes from "./routes/currencyRoutes";
import clubRoutes from "./routes/clubRoutes";


import { connectDB, disconnectDB } from "./lib/db";
import { redis, checkRedis } from "./lib/redis";
import { runDataCleanup } from "./utils/dbCleanup";
import { setupSocketIO } from "./socket/socketHandler";
import { errorHandler } from "./middleware/errorHandler";

const REQUIRED_ENV_VARS = [
    "MONGO_URI",
    "JWT_SECRET",
    "REDIS_URL",
    "REDIS_TOKEN",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "AWS_S3_BUCKET_NAME",
];

const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`[Fatal] Missing required environment variables: ${missing.join(", ")}`);
        process.exit(1);
    }
};

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
    maxHttpBufferSize: 5e7, // 50MB
    pingTimeout: 5000,
    pingInterval: 10000,
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Setup Socket.IO logic
setupSocketIO(io);

// Make io accessible to routes
app.set("io", io);

// middleware
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get("/", (req: Request, res: Response) => {
    res.send("Hello Bookwoooorm! 🐛📚");
});

app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date(), version: "1.0.1" });
});

// Request Timeout Middleware
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000);
    next();
});

// Rate Limiting
import rateLimit from 'express-rate-limit';

// Rate Limiter Configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { status: 429, message: "Too many requests, please try again later." }
});

// Apply rate limiter to all api routes
app.use('/api', limiter);

console.log("[Backend] Registering routes...");
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/book-content", bookContentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookshelf", bookshelfRoutes);
app.use("/api/streaks", streakRoutes);
app.use("/api/sessions", readingSessionRoutes);
app.use("/api/notes", bookNoteRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/clubs", clubRoutes);

// Global Error Handler (Must be after routes)
app.use(errorHandler);

const startServer = async () => {
    try {
        // 0. Validate Environment
        validateEnv();

        // 1. Connect to Database and Cache
        await Promise.all([
            connectDB(),
            checkRedis()
        ]);

        // 2. Start Listening
        httpServer.listen(PORT, async () => {
            console.log(`Server running on port ${PORT}`);

            // 3. Run database integrity cleanup on startup (if safe)
            try {
                await runDataCleanup();
            } catch (err) {
                console.error('Failed to run startup cleanup:', err);
            }
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

// Graceful Shutdown
const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    // Stop accepting new connections
    httpServer.close(async () => {
        console.log("HTTP server closed.");

        try {
            await disconnectDB();
            // await redis.quit(); // Upstash is HTTP-based

            console.log("Database connections closed.");
            process.exit(0);
        } catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    });

    // Force exit if hanging
    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
