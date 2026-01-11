import { create } from 'zustand';
import { API_URL } from '../constants/api';
import { io } from 'socket.io-client';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    socket: null,
    isConnected: false,
    userStatuses: {}, // { userId: { status: 'online'|'offline', lastActive: Date } }
    typingStatus: {}, // { userId: boolean }

    // Connect to WebSocket
    connect: (userId) => {
        if (!userId) {
            console.log('⚠️ Cannot connect socket: No userId provided');
            return;
        }

        const { socket: existingSocket } = get();
        if (existingSocket) {
            console.log('Using existing socket connection');
            if (!existingSocket.connected) {
                existingSocket.connect();
            }
            if (!existingSocket.connected) {
                existingSocket.connect();
            }
            console.log('[Store] Re-emitting authenticate for existing socket');
            existingSocket.emit('authenticate', userId);
            return;
        }

        let disconnectTimer = null;

        console.log('🔌 Initializing new socket connection...');
        const socket = io(API_URL, {
            transports: ['websocket'], // Force WebSocket for instant connection
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            forceNew: true, // Force a new connection instance
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully!', socket.id);
            console.log('🚀 Transport used:', socket.io.engine.transport.name); // Log transport type

            // Upgrade listener
            socket.io.engine.on("upgrade", () => {
                console.log("🚀 Transport upgraded to:", socket.io.engine.transport.name);
            });

            if (disconnectTimer) {
                clearTimeout(disconnectTimer);
                disconnectTimer = null;
            }
            console.log('[Store] Authenticating socket with userId:', userId);
            socket.emit('authenticate', userId);
            set({ isConnected: true });
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('⚠️  Socket disconnected. Reason:', reason);

            // If it's a deliberate disconnect by the client, set immediately
            if (reason === 'io client disconnect') {
                set({ isConnected: false });
                return;
            }

            // Otherwise, wait 5 seconds before showing "disconnected" in UI
            // to handle transient drops seamlessly
            if (disconnectTimer) clearTimeout(disconnectTimer);
            disconnectTimer = setTimeout(() => {
                set({ isConnected: false });
                disconnectTimer = null;
            }, 5000);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Reconnection attempt', attemptNumber);
        });

        socket.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error.message);
        });

        socket.on('reconnect_failed', () => {
            console.error('❌ Reconnection failed after all attempts');
        });

        socket.on('notification', (notification) => {
            console.log('📬 New notification received:', notification);
            const { notifications, unreadCount } = get();
            set({
                notifications: [notification, ...notifications],
                unreadCount: unreadCount + 1,
            });
        });

        socket.on('user_status', ({ userId, status, lastActive }) => {
            const { userStatuses } = get();
            set({
                userStatuses: {
                    ...userStatuses,
                    [userId]: { status, lastActive }
                }
            });
        });

        socket.on('active_users', (userIds) => {
            const { userStatuses } = get();
            const newStatuses = { ...userStatuses };
            userIds.forEach(id => {
                newStatuses[id] = { status: 'online', lastActive: new Date() };
            });
            set({ userStatuses: newStatuses });
        });

        socket.on('typing_start', ({ senderId }) => {
            console.log('[Store] Received typing_start from:', senderId);
            set((state) => ({
                typingStatus: { ...state.typingStatus, [senderId]: true }
            }));
        });

        socket.on('typing_stop', ({ senderId }) => {
            set((state) => ({
                typingStatus: { ...state.typingStatus, [senderId]: false }
            }));
        });

        set({ socket });
    },

    // Disconnect WebSocket
    disconnect: () => {
        const { socket } = get();
        if (socket) {
            console.log('🔌 Disconnecting socket manually');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('notification');
            socket.off('user_status');
            socket.disconnect();
            set({ socket: null, isConnected: false, userStatuses: {} });
        }
    },

    // Fetch notifications
    fetchNotifications: async (token, page = 1) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications?page=${page}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (page === 1) {
                set({
                    notifications: data.notifications,
                    unreadCount: data.unreadCount,
                });
            } else {
                const { notifications } = get();
                set({
                    notifications: [...notifications, ...data.notifications],
                });
            }

            return { success: true, hasMore: data.currentPage < data.totalPages };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message };
        }
    },

    // Get unread count
    fetchUnreadCount: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ unreadCount: data.unreadCount });
            return { success: true };
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return { success: false, error: error.message };
        }
    },

    // Mark notification as read
    markAsRead: async (notificationId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update local state
            const { notifications, unreadCount } = get();
            const updatedNotifications = notifications.map(n =>
                n._id === notificationId ? { ...n, read: true } : n
            );

            set({
                notifications: updatedNotifications,
                unreadCount: Math.max(0, unreadCount - 1),
            });

            return { success: true };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Mark all as read
    markAllAsRead: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update local state
            const { notifications } = get();
            const updatedNotifications = notifications.map(n => ({ ...n, read: true }));

            set({
                notifications: updatedNotifications,
                unreadCount: 0,
            });

            return { success: true };
        } catch (error) {
            console.error('Error marking all as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete notification
    deleteNotification: async (notificationId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update local state
            const { notifications } = get();
            const updatedNotifications = notifications.filter(n => n._id !== notificationId);

            set({ notifications: updatedNotifications });

            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Send typing start
    sendTypingStart: (receiverId) => {
        const { socket } = get();
        if (socket) {
            console.log('[Store] Sending typing_start to:', receiverId);
            socket.emit('typing_start', { receiverId });
        }
    },

    // Send typing stop
    sendTypingStop: (receiverId) => {
        const { socket } = get();
        if (socket) socket.emit('typing_stop', { receiverId });
    },

    // Reset store
    reset: () => {
        const { socket } = get();
        if (socket) socket.disconnect();

        set({
            notifications: [],
            unreadCount: 0,
            socket: null,
            isConnected: false,
        });
    },
}));
