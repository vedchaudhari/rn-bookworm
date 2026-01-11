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
import User from "./models/User.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
  maxHttpBufferSize: 5e7, // 50MB
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store connected users: Map<userId, Set<socketId>>
const connectedUsers = new Map();
// Store disconnect timeouts: Map<userId, timeoutId>
const disconnectTimeouts = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User authentication
  socket.on("authenticate", async (userId) => {
    console.log(`[Backend] User authenticated: ${userId} (Socket: ${socket.id})`);
    socket.userId = userId; // Store userId for faster lookup
    // Cancel any pending disconnect timeout for this user
    if (disconnectTimeouts.has(userId)) {
      clearTimeout(disconnectTimeouts.get(userId));
      disconnectTimeouts.delete(userId);
      console.log(`Cancelled disconnect timeout for user ${userId}`);
    }

    // Add socket to user's set
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);
    console.log(`User ${userId} authenticated with socket ${socket.id}. Total sockets: ${connectedUsers.get(userId).size}`);

    // Update user status in DB
    try {
      await User.findByIdAndUpdate(userId, { lastActiveDate: new Date() });
    } catch (err) {
      console.error("Error updating user status:", err);
    }

    // Broadcast online status to all clients
    io.emit("user_status", { userId, status: "online", lastActive: new Date() });

    // Send list of currently active users to the new user
    const activeUserIds = Array.from(connectedUsers.keys());
    socket.emit("active_users", activeUserIds);
  });

  // Typing indicators
  socket.on("typing_start", ({ receiverId }) => {
    socket.userId = socket.userId || Array.from(connectedUsers.entries()).find(([uid, set]) => set.has(socket.id))?.[0];
    if (!socket.userId) {
      console.log(`[Backend] typing_start ignored: Unauthenticated socket ${socket.id}`);
      return;
    }

    console.log(`[Backend] typing_start: ${socket.userId} -> ${receiverId}`);

    if (connectedUsers.has(receiverId)) {
      connectedUsers.get(receiverId).forEach((socketId) => {
        io.to(socketId).emit("typing_start", { senderId: socket.userId });
      });
    } else {
      console.log(`[Backend] receiver ${receiverId} not found/offline`);
    }
  });

  socket.on("typing_stop", ({ receiverId }) => {
    socket.userId = socket.userId || Array.from(connectedUsers.entries()).find(([uid, set]) => set.has(socket.id))?.[0];
    if (!socket.userId) return;

    if (connectedUsers.has(receiverId)) {
      connectedUsers.get(receiverId).forEach((socketId) => {
        io.to(socketId).emit("typing_stop", { senderId: socket.userId });
      });
    }
  });

  socket.on("disconnect", async () => {
    let disconnectedUserId = null;

    // Find the user who owned this socket
    for (const [userId, sockets] of connectedUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        disconnectedUserId = userId;
        console.log(`Socket ${socket.id} removed from user ${userId}. Remaining: ${sockets.size}`);

        if (sockets.size === 0) {
          // No more active sockets for this user, start grace period
          console.log(`Starting 10s grace period for user ${userId}`);
          const timeoutId = setTimeout(async () => {
            if (connectedUsers.has(userId) && connectedUsers.get(userId).size === 0) {
              connectedUsers.delete(userId);
              disconnectTimeouts.delete(userId);
              console.log(`User ${userId} marked as offline after grace period`);

              // Update user status in DB
              const now = new Date();
              try {
                await User.findByIdAndUpdate(userId, { lastActiveDate: now });
              } catch (err) {
                console.error("Error updating user status:", err);
              }

              // Broadcast offline status
              io.emit("user_status", { userId, status: "offline", lastActive: now });
            }
          }, 10000); // 10 second grace period

          disconnectTimeouts.set(userId, timeoutId);
        }
        break;
      }
    }
  });
});

// Make io accessible to routes
app.set("io", io);
app.set("connectedUsers", connectedUsers);

// job.start();
app.use(express.json({ limit: "50mb" }));
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
