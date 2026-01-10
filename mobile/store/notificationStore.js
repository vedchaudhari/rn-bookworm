import { create } from 'zustand';
import { API_URL } from '../constants/api';
import { io } from 'socket.io-client';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    socket: null,
    isConnected: false,
    userStatuses: {}, // { userId: { status: 'online'|'offline', lastActive: Date } }

    // Connect to WebSocket
    connect: (userId) => {
        const socket = io(API_URL, {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('Socket connected');
            socket.emit('authenticate', userId);
            set({ isConnected: true });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            set({ isConnected: false });
        });

        socket.on('notification', (notification) => {
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

        set({ socket });
    },

    // Disconnect WebSocket
    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
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
