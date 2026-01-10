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
                // Prevent duplicates when merging
                const existingIds = new Set(existing.map(m => m._id));
                const newMessages = data.messages.filter(m => !existingIds.has(m._id));

                set({
                    // Append older messages to the end
                    messages: { ...messages, [userId]: [...existing, ...newMessages] },
                });
            }

            return { success: true, hasMore: data.currentPage < data.totalPages };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: error.message };
        }
    },

    // Send message
    // Send message with Optimistic Update
    sendMessage: async (receiverId, text, image, token) => {
        const { messages, user } = get(); // user might need to be passed or stored
        // Create a temporary ID for optimistic update
        const tempId = Date.now().toString();

        // Construct temporary message
        const tempMessage = {
            _id: tempId,
            sender: { _id: 'me', username: 'Me' }, // You might want real user data here if available
            receiver: receiverId,
            text: text || "",
            image,
            createdAt: new Date().toISOString(),
            pending: true, // Marker for UI
        };

        // 1. Optimistic Update: Add to store immediately
        const userMessages = messages[receiverId] || [];

        // Update Message History (Prepend new message)
        set({
            messages: { ...messages, [receiverId]: [tempMessage, ...userMessages] },
        });

        // Update Conversation List (Optimistic)
        const { conversations } = get();
        const updatedConversations = [...conversations];
        const existingConvIndex = updatedConversations.findIndex(c =>
            (c.otherUser?._id || c.otherUser) === receiverId
        );

        if (existingConvIndex !== -1) {
            const conv = updatedConversations[existingConvIndex];
            updatedConversations[existingConvIndex] = {
                ...conv,
                lastMessage: {
                    text: text || "Sent an image",
                    createdAt: new Date().toISOString(),
                    senderId: 'me'
                }
            };
            // Move to top
            const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
            updatedConversations.unshift(updatedConv);
            set({ conversations: updatedConversations });
        }

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

            // 2. Success: Replace temp message with real one
            const currentMessages = get().messages[receiverId] || [];
            const updatedMessages = currentMessages.map(m =>
                m._id === tempId ? data : m
            );

            set({
                messages: { ...get().messages, [receiverId]: updatedMessages },
            });

            return { success: true, message: data };
        } catch (error) {
            console.error('Error sending message:', error);

            // 3. Failure: Remove optimistic message
            const currentMessages = get().messages[receiverId] || [];
            const filteredMessages = currentMessages.filter(m => m._id !== tempId);

            set({
                messages: { ...get().messages, [receiverId]: filteredMessages },
            });

            return { success: false, error: error.message };
        }
    },

    // Add received message (from WebSocket)
    addReceivedMessage: (message) => {
        const { messages, activeConversation, conversations } = get();
        const senderId = message.sender._id || message.sender;

        const userMessages = messages[senderId] || [];

        // 1. Update Message History (Prepend new message)
        if (!userMessages.some(m => m._id === message._id)) {
            set({
                messages: { ...messages, [senderId]: [message, ...userMessages] },
            });
        }

        // 2. Update Unread Count (Global)
        if (activeConversation !== senderId) {
            set((state) => ({ unreadCount: state.unreadCount + 1 }));
        }

        // 3. Update Conversation List (Inbox)
        const updatedConversations = [...conversations];
        const existingConvIndex = updatedConversations.findIndex(c =>
            (c.otherUser?._id || c.otherUser) === senderId
        );

        if (existingConvIndex !== -1) {
            // Update existing conversation
            const conv = updatedConversations[existingConvIndex];
            updatedConversations[existingConvIndex] = {
                ...conv,
                lastMessage: {
                    text: message.text,
                    createdAt: message.createdAt,
                    senderId: senderId
                },
                unreadCount: activeConversation === senderId ? 0 : (conv.unreadCount || 0) + 1
            };

            // Move to top
            const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
            updatedConversations.unshift(updatedConv);

            set({ conversations: updatedConversations });
        } else {
            // Optionally fetch fresh conversations if it's a new user
            // get().fetchConversations(token); 
            // For now, we trust fetchConversations will be called on mount of Messages screen
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

            // Update local state (Conversation List)
            const { conversations } = get();
            const updated = conversations.map(conv =>
                conv.otherUser._id === userId ? { ...conv, unreadCount: 0 } : conv
            );
            set({ conversations: updated });

            // Update Global Unread Count (for Tab Badge)
            // We fetch from server to get accurate remaining total count
            await get().fetchUnreadCount(token);

            return { success: true };
        } catch (error) {
            console.error('Error marking as read:', error);
            return { success: false, error: error.message };
        }
    },

    setActiveConversation: (id) => {
        set({ activeConversation: id });
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
