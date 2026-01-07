import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import discoveryRoutes from "./routes/discoveryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import bookContentRoutes from "./routes/bookContentRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store connected users
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User authentication
  socket.on("authenticate", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} authenticated with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    // Remove user from connected users
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Make io accessible to routes
app.set("io", io);
app.set("connectedUsers", connectedUsers);

// job.start();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello Bookwoooorm! 🐛📚");
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/book-content", bookContentRoutes);
app.use("/api/users", userRoutes);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
