import { create } from 'zustand';
import { API_URL } from '../constants/api';
import { io, Socket } from 'socket.io-client';

interface Notification {
    _id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    [key: string]: any;
}

interface UserStatus {
    status: 'online' | 'offline';
    lastActive: Date | string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    socket: Socket | null;
    isConnected: boolean;
    lastAuthenticatedUserId?: string;
    userStatuses: { [userId: string]: UserStatus };
    typingStatus: { [userId: string]: boolean };
    connect: (userId: string) => void;
    disconnect: () => void;
    fetchNotifications: (token: string, page?: number) => Promise<{ success: boolean; hasMore?: boolean; error?: string }>;
    fetchUnreadCount: (token: string) => Promise<{ success: boolean; error?: string }>;
    markAsRead: (notificationId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    markAllAsRead: (token: string) => Promise<{ success: boolean; error?: string }>;
    deleteNotification: (notificationId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    sendTypingStart: (receiverId: string) => void;
    sendTypingStop: (receiverId: string) => void;
    reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    socket: null,
    isConnected: false,
    unreadCount: 0,
    lastAuthenticatedUserId: undefined,
    notifications: [],
    isLoading: false,
    userStatuses: {},
    typingStatus: {},

    // Connect to WebSocket
    connect: (userId: string) => {
        if (!userId) {
            console.warn('⚠️ Cannot connect socket: No userId provided');
            return;
        }

        let disconnectTimer: any = null;
        const { socket: existingSocket } = get();
        let activeSocket = existingSocket;

        if (!activeSocket) {

            activeSocket = io(API_URL, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: true,
                forceNew: true,
            });

            activeSocket.on('connect', () => {

                if (disconnectTimer) {
                    clearTimeout(disconnectTimer);
                    disconnectTimer = null;
                }

                activeSocket?.emit('authenticate', userId);
                set({ lastAuthenticatedUserId: userId } as any);
                set({ isConnected: true });
            });

            activeSocket.on('connect_error', (error: Error) => {
                console.error('❌ Socket connection error:', error.message);
            });

            activeSocket.on('disconnect', (reason: string) => {

                if (reason === 'io client disconnect') {
                    set({ isConnected: false });
                    return;
                }
                if (disconnectTimer) clearTimeout(disconnectTimer);
                disconnectTimer = setTimeout(() => {
                    set({ isConnected: false });
                    disconnectTimer = null;
                }, 5000);
            });

            activeSocket.on('notification', (notification: Notification) => {

                set(state => {
                    const combined = [notification, ...state.notifications];
                    const deduped = Array.from(new Map(combined.map(n => [n._id, n])).values());
                    return {
                        notifications: deduped,
                        unreadCount: state.unreadCount + 1,
                    };
                });
            });

            activeSocket.on('user_status', ({ userId, status, lastActive }: { userId: string; status: 'online' | 'offline'; lastActive: string }) => {
                const { userStatuses } = get();
                set({
                    userStatuses: {
                        ...userStatuses,
                        [userId]: { status, lastActive }
                    }
                });
            });

            activeSocket.on('active_users', (userIds: string[]) => {
                const { userStatuses } = get();
                const newStatuses = { ...userStatuses };
                userIds.forEach(id => {
                    newStatuses[id] = { status: 'online', lastActive: new Date() };
                });
                set({ userStatuses: newStatuses });
            });

            activeSocket.on('typing_start', ({ senderId }: { senderId: string }) => {

                set((state) => ({
                    typingStatus: { ...state.typingStatus, [senderId]: true }
                }));
            });

            activeSocket.on('typing_stop', ({ senderId }: { senderId: string }) => {
                set((state) => ({
                    typingStatus: { ...state.typingStatus, [senderId]: false }
                }));
            });

            set({ socket: activeSocket });
        } else {

            activeSocket.emit('authenticate', userId);
            set({ lastAuthenticatedUserId: userId } as any);
        }

        // Global delivery acknowledgement - always re-attach or ensure they are present
        // (Removing existing ones first to prevent duplicates if connect is called multiple times)
        activeSocket.off('new_message');
        activeSocket.on('new_message', (message: any) => {
            const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
            // If WE are the receiver, immediately tell server we got it
            if (senderId !== userId) {

                activeSocket?.emit('message_delivered', {
                    messageId: message._id,
                    senderId: senderId
                });
            }
        });

        activeSocket.off('pending_delivery');
        activeSocket.on('pending_delivery', (messages: { messageId: string, senderId: string }[]) => {

            messages.forEach(m => {
                activeSocket?.emit('message_delivered', {
                    messageId: m.messageId,
                    senderId: m.senderId
                });
            });
        });
    },

    // Disconnect WebSocket
    disconnect: () => {
        const { socket } = get();
        if (socket) {

            socket.off('connect');
            socket.off('disconnect');
            socket.off('notification');
            socket.off('user_status');
            socket.disconnect();
            set({ socket: null, isConnected: false, userStatuses: {}, lastAuthenticatedUserId: undefined });
        }
    },

    // Fetch notifications
    fetchNotifications: async (token: string, page: number = 1) => {
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
                set(state => {
                    const combined = [...state.notifications, ...data.notifications];
                    const deduped = Array.from(new Map(combined.map(n => [n._id, n])).values());
                    return { notifications: deduped };
                });
            }

            return { success: true, hasMore: data.currentPage < data.totalPages };
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message };
        }
    },

    // Get unread count
    fetchUnreadCount: async (token: string) => {
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
        } catch (error: any) {
            console.error('Error fetching unread count:', error);
            return { success: false, error: error.message };
        }
    },

    // Mark notification as read
    markAsRead: async (notificationId: string, token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const { notifications, unreadCount } = get();
            const updatedNotifications = notifications.map(n =>
                n._id === notificationId ? { ...n, read: true } : n
            );

            set({
                notifications: updatedNotifications,
                unreadCount: Math.max(0, unreadCount - 1),
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Mark all as read
    markAllAsRead: async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const { notifications } = get();
            const updatedNotifications = notifications.map(n => ({ ...n, read: true }));

            set({
                notifications: updatedNotifications,
                unreadCount: 0,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error marking all as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete notification
    deleteNotification: async (notificationId: string, token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const { notifications } = get();
            const updatedNotifications = notifications.filter(n => n._id !== notificationId);

            set({ notifications: updatedNotifications });

            return { success: true };
        } catch (error: any) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Send typing start
    sendTypingStart: (receiverId: string) => {
        const { socket } = get();
        if (socket) {

            socket.emit('typing_start', { receiverId });
        }
    },

    // Send typing stop
    sendTypingStop: (receiverId: string) => {
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
