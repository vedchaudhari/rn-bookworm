import { create } from 'zustand';
import { API_URL } from '../constants/api';

export const useMessageStore = create((set, get) => ({
    conversations: [],
    messages: {},
    unreadCount: 0,
    activeConversation: null,

    // Fetch all conversations
    fetchConversations: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ conversations: data.conversations });
            return { success: true };
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch messages for a conversation
    fetchMessages: async (userId, token, page = 1) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/conversation/${userId}?page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const { messages } = get();

            if (page === 1) {
                set({
                    messages: { ...messages, [userId]: data.messages },
                    activeConversation: userId,
                });
            } else {
                const existing = messages[userId] || [];
                set({
                    messages: { ...messages, [userId]: [...data.messages, ...existing] },
                });
            }

            return { success: true, hasMore: data.currentPage < data.totalPages };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: error.message };
        }
    },

    // Send message
    sendMessage: async (receiverId, text, image, token) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/send/${receiverId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, image }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Add message to local state
            const { messages } = get();
            const userMessages = messages[receiverId] || [];
            set({
                messages: { ...messages, [receiverId]: [...userMessages, data] },
            });

            return { success: true, message: data };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    },

    // Add received message (from WebSocket)
    addReceivedMessage: (message) => {
        const { messages, activeConversation } = get();
        const senderId = message.sender._id || message.sender;

        const userMessages = messages[senderId] || [];
        set({
            messages: { ...messages, [senderId]: [...userMessages, message] },
        });

        // Update unread count if not in active conversation
        if (activeConversation !== senderId) {
            set((state) => ({ unreadCount: state.unreadCount + 1 }));
        }
    },

    // Fetch unread count
    fetchUnreadCount: async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` },
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

    // Mark conversation as read
    markAsRead: async (userId, token) => {
        try {
            await fetch(`${API_URL}/api/messages/mark-read/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            // Update local state
            const { conversations } = get();
            const updated = conversations.map(conv =>
                conv.otherUser._id === userId ? { ...conv, unreadCount: 0 } : conv
            );
            set({ conversations: updated });

            return { success: true };
        } catch (error) {
            console.error('Error marking as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Reset store
    reset: () => {
        set({
            conversations: [],
            messages: {},
            unreadCount: 0,
            activeConversation: null,
        });
    },
}));
