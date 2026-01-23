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
    notifications: [],
    unreadCount: 0,
    socket: null,
    isConnected: false,
    userStatuses: {},
    typingStatus: {},

    // Connect to WebSocket
    connect: (userId: string) => {
        if (!userId) {
            console.log('⚠️ Cannot connect socket: No userId provided');
            return;
        }

        const { socket: existingSocket } = get();
        if (existingSocket) {
            console.log(`🔌 Using existing socket [${existingSocket.id || 'not connected'}]`);
            if (!existingSocket.connected) {
                console.log('🔄 Reconnecting existing socket...');
                existingSocket.connect();
            }
            console.log('[Store] Re-authenticating with userId:', userId);
            existingSocket.emit('authenticate', userId);
            return;
        }

        let disconnectTimer: any = null;

        console.log('🔌 Initializing new socket connection...');
        const socket = io(API_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            forceNew: true,
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully!', socket.id);

            if (disconnectTimer) {
                clearTimeout(disconnectTimer);
                disconnectTimer = null;
            }
            console.log('[Store] Authenticating socket with userId:', userId);
            socket.emit('authenticate', userId);
            set({ isConnected: true });
        });

        socket.on('connect_error', (error: Error) => {
            console.error('❌ Socket connection error:', error.message);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('⚠️  Socket disconnected. Reason:', reason);

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

        socket.on('notification', (notification: Notification) => {
            console.log('📬 New notification received:', notification);
            set(state => {
                const combined = [notification, ...state.notifications];
                const deduped = Array.from(new Map(combined.map(n => [n._id, n])).values());

                return {
                    notifications: deduped,
                    unreadCount: state.unreadCount + 1,
                };
            });
        });

        socket.on('user_status', ({ userId, status, lastActive }: { userId: string; status: 'online' | 'offline'; lastActive: string }) => {
            const { userStatuses } = get();
            set({
                userStatuses: {
                    ...userStatuses,
                    [userId]: { status, lastActive }
                }
            });
        });

        socket.on('active_users', (userIds: string[]) => {
            const { userStatuses } = get();
            const newStatuses = { ...userStatuses };
            userIds.forEach(id => {
                newStatuses[id] = { status: 'online', lastActive: new Date() };
            });
            set({ userStatuses: newStatuses });
        });

        socket.on('typing_start', ({ senderId }: { senderId: string }) => {
            console.log('[Store] Received typing_start from:', senderId);
            set((state) => ({
                typingStatus: { ...state.typingStatus, [senderId]: true }
            }));
        });

        socket.on('typing_stop', ({ senderId }: { senderId: string }) => {
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
            console.log('[Store] Sending typing_start to:', receiverId);
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
