import { create } from 'zustand';
import { API_URL } from '../constants/api';
import { Socket } from 'socket.io-client';

export interface Message {
    _id: string;
    sender: { _id: string; username: string } | string;
    receiver: string;
    text?: string;
    image?: string;
    video?: string;
    videoThumbnail?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
    createdAt: string;
    pending?: boolean;
    isEdited?: boolean;
    editedAt?: string;
    isDeleted?: boolean;
    read?: boolean;
    deliveredAt?: string;
    readAt?: string;
    deletedFor?: string[];
    [key: string]: any;
}

export interface Conversation {
    _id: string;
    otherUser: { _id: string; username: string; profileImage?: string } | string;
    lastMessage?: {
        text: string;
        createdAt: string;
        senderId: string;
    };
    unreadCount?: number;
    [key: string]: any;
}

interface MessageState {
    conversations: Conversation[];
    messages: { [userId: string]: Message[] };
    unreadCount: number;
    activeConversation: string | null;
    currentUserId: string | null;
    fetchConversations: (token: string) => Promise<{ success: boolean; error?: string }>;
    fetchMessages: (userId: string, token: string, page?: number) => Promise<{ success: boolean; hasMore?: boolean; error?: string }>;
    sendMessage: (
        receiverId: string,
        text: string,
        image: string | undefined,
        video: string | undefined,
        videoThumbnail: string | undefined,
        token: string,
        localImage?: string,
        localVideo?: string,
        localThumbnail?: string,
        width?: number,
        height?: number,
        fileSizeBytes?: number
    ) => Promise<{ success: boolean; message?: Message; error?: string }>;
    addReceivedMessage: (message: Message, currentUserId: string) => void;
    fetchUnreadCount: (token: string) => Promise<{ success: boolean; error?: string }>;
    markAsRead: (userId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    setActiveConversation: (id: string | null) => void;
    editMessage: (messageId: string, text: string, token: string) => Promise<{ success: boolean; error?: string }>;
    deleteMessageForMe: (messageId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    deleteMessageForEveryone: (messageId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    clearChatHistory: (otherUserId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    updateLocalEditedMessage: (data: { messageId: string, text: string, editedAt: string }) => void;
    updateLocalDeletedMessage: (data: { messageId: string, conversationId: string }) => void;
    updateLocalMessagesRead: (data: { conversationId: string, readerId: string, readAt: string }) => void;
    updateLocalMessageDelivered: (data: { messageId: string, deliveredAt: string }) => void;
    setCurrentUserId: (userId: string | null) => void;
    reset: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
    conversations: [],
    messages: {},
    unreadCount: 0,
    activeConversation: null,
    currentUserId: null,

    // Fetch all conversations
    fetchConversations: async (token: string) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(`${API_URL}/api/messages/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorMsg);
            }

            set({ conversations: data.conversations });
            return { success: true };
        } catch (error: any) {
            console.error('Error fetching conversations:', error);

            // Differentiate error types
            let errorMessage = 'Failed to fetch conversations';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout. Please check your connection.';
            } else if (error.message === 'Network request failed') {
                errorMessage = 'No internet connection';
            }

            return { success: false, error: errorMessage };
        }
    },

    // Fetch messages for a conversation
    fetchMessages: async (userId: string, token: string, page: number = 1) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${API_URL}/api/messages/conversation/${userId}?page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            if (page === 1) {
                set(state => {
                    const deduped = Array.from(new Map(data.messages.map((m: any) => [m._id, m])).values());
                    return {
                        messages: { ...state.messages, [userId]: deduped as Message[] },
                        activeConversation: userId,
                    };
                });
            } else {
                set(state => {
                    const existing = state.messages[userId] || [];
                    const combined = [...existing, ...data.messages];
                    const deduped = Array.from(new Map(combined.map(m => [m._id, m])).values());

                    return {
                        messages: { ...state.messages, [userId]: deduped as Message[] },
                    };
                });
            }

            return { success: true, hasMore: data.currentPage < data.totalPages };
        } catch (error: any) {
            console.error('Error fetching messages:', error);

            let errorMessage = 'Failed to load messages';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout';
            } else if (error.message === 'Network request failed') {
                errorMessage = 'No internet connection';
            }

            return { success: false, error: errorMessage };
        }
    },

    // Send message with Optimistic Update
    sendMessage: async (
        receiverId: string,
        text: string,
        image: string | undefined,
        video: string | undefined,
        videoThumbnail: string | undefined,
        token: string,
        localImage?: string,
        localVideo?: string,
        localThumbnail?: string,
        width?: number,
        height?: number,
        fileSizeBytes?: number
    ) => {
        const { messages } = get();
        const tempId = Date.now().toString();

        const tempMessage: Message = {
            _id: tempId,
            sender: { _id: 'me', username: 'Me' },
            receiver: receiverId,
            text: text || "",
            image: localImage || image,
            video: localVideo || video,
            videoThumbnail: localThumbnail || videoThumbnail,
            width,
            height,
            fileSizeBytes,
            createdAt: new Date().toISOString(),
            pending: true,
        };

        const userMessages = messages[receiverId] || [];
        set({
            messages: { ...messages, [receiverId]: [tempMessage, ...userMessages] },
        });

        const { conversations } = get();
        const updatedConversations = [...conversations];
        const existingConvIndex = updatedConversations.findIndex(c =>
            (typeof c.otherUser === 'object' ? c.otherUser._id : c.otherUser) === receiverId
        );

        if (existingConvIndex !== -1) {
            const conv = updatedConversations[existingConvIndex];
            updatedConversations[existingConvIndex] = {
                ...conv,
                lastMessage: {
                    text: text || (image ? "Sent an image" : video ? "Sent a video" : ""),
                    createdAt: new Date().toISOString(),
                    senderId: 'me'
                }
            };
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
                body: JSON.stringify({ text, image, video, videoThumbnail, fileSizeBytes }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set(state => {
                const currentMessages = state.messages[receiverId] || [];

                // Check if the message (by real _id) already exists (e.g., arrived via socket)
                const alreadyExists = currentMessages.some(m => m._id === data._id);

                let updatedMessages;
                if (alreadyExists) {
                    // Just remove the temp message, real one is already there
                    updatedMessages = currentMessages.filter(m => m._id !== tempId);
                } else {
                    // Replace temp message with real data
                    updatedMessages = currentMessages.map(m =>
                        m._id === tempId ? data : m
                    );
                }

                return {
                    messages: { ...state.messages, [receiverId]: updatedMessages },
                };
            });

            return { success: true, message: data };
        } catch (error: any) {
            console.error('Error sending message:', error);

            const currentMessages = get().messages[receiverId] || [];
            const filteredMessages = currentMessages.filter(m => m._id !== tempId);

            set({
                messages: { ...get().messages, [receiverId]: filteredMessages },
            });

            return { success: false, error: error.message };
        }
    },

    // Add received message (from WebSocket)
    addReceivedMessage: (message: Message, currentUserId: string) => {
        const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
        const receiverId = message.receiver;
        const isSelf = senderId === currentUserId;

        // The key for organizing messages is always the 'other' user in the conversation
        const targetUserId = isSelf ? receiverId : senderId;

        if (!targetUserId) {
            console.error('[MessageStore] Cannot determine target user for message:', message);
            return;
        }

        set(state => {
            const userMessages = state.messages[targetUserId] || [];

            // Check if this is an echo of my own message (optimally sent)
            const pendingIndex = userMessages.findIndex(m =>
                m.pending &&
                m.text === message.text &&
                m.image === message.image
            );

            let updatedMessages;
            if (pendingIndex !== -1) {
                // Replace the pending message with the real one to avoid flicker
                updatedMessages = [...userMessages];
                updatedMessages[pendingIndex] = message;
            } else {
                updatedMessages = [message, ...userMessages];
            }

            // Deduplicate by ID
            const deduped = Array.from(new Map(updatedMessages.map(m => [m._id, m])).values());

            // Only increment global unread count if it's NOT from self and NOT in active conversation
            const shouldIncrementUnread = !isSelf && state.activeConversation !== targetUserId;

            return {
                messages: { ...state.messages, [targetUserId]: deduped },
                unreadCount: shouldIncrementUnread ? state.unreadCount + 1 : state.unreadCount
            };
        });

        const { conversations, activeConversation } = get();
        const updatedConversations = [...conversations];
        const existingConvIndex = updatedConversations.findIndex(c =>
            (typeof c.otherUser === 'object' ? c.otherUser._id : c.otherUser) === targetUserId
        );

        if (existingConvIndex !== -1) {
            const conv = updatedConversations[existingConvIndex];
            const shouldIncrementItemUnread = !isSelf && activeConversation !== targetUserId;

            updatedConversations[existingConvIndex] = {
                ...conv,
                lastMessage: {
                    text: message.text || (message.image ? "Sent an image" : message.video ? "Sent a video" : ""),
                    createdAt: message.createdAt,
                    senderId: senderId
                },
                unreadCount: shouldIncrementItemUnread ? (conv.unreadCount || 0) + 1 : (activeConversation === targetUserId ? 0 : (conv.unreadCount || 0))
            };

            const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
            updatedConversations.unshift(updatedConv);

            set({ conversations: updatedConversations });
        } else {
            // New conversation!
            const newConv: Conversation = {
                _id: message.conversationId || `conv_${Date.now()}`,
                otherUser: isSelf ? receiverId : message.sender, // Store the OTHER user's info
                lastMessage: {
                    text: message.text || (message.image ? "Sent an image" : message.video ? "Sent a video" : ""),
                    createdAt: message.createdAt,
                    senderId: senderId
                },
                unreadCount: (!isSelf && activeConversation !== targetUserId) ? 1 : 0
            };
            set({ conversations: [newConv, ...updatedConversations] });
        }
    },

    // Fetch unread count
    fetchUnreadCount: async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` },
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

    // Mark conversation as read
    markAsRead: async (userId: string, token: string) => {
        try {
            await fetch(`${API_URL}/api/messages/mark-read/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const { conversations } = get();
            const updated = conversations.map(conv =>
                (typeof conv.otherUser === 'object' && conv.otherUser._id === userId) ? { ...conv, unreadCount: 0 } : conv
            );
            set({ conversations: updated });

            await get().fetchUnreadCount(token);

            return { success: true };
        } catch (error: any) {
            console.error('Error marking as read:', error);
            return { success: false, error: error.message };
        }
    },

    setActiveConversation: (id: string | null) => {
        set({ activeConversation: id });
    },

    // Edit message with Optimistic Update
    editMessage: async (messageId: string, text: string, token: string) => {
        const { messages, activeConversation } = get();
        if (!activeConversation) return { success: false };

        // Optimistic update
        const conversationMessages = [...(messages[activeConversation] || [])];
        const updatedMessages = conversationMessages.map(m =>
            m._id === messageId ? { ...m, text, isEdited: true, editedAt: new Date().toISOString() } : m
        );

        set({ messages: { ...messages, [activeConversation]: updatedMessages } });

        try {
            const response = await fetch(`${API_URL}/api/messages/edit/${messageId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            return { success: true };
        } catch (error: any) {
            console.error('Error editing message:', error);
            // Rollback on error? Usually better to just show error toast
            return { success: false, error: error.message };
        }
    },

    // Delete for me with Optimistic Update
    deleteMessageForMe: async (messageId: string, token: string) => {
        const { messages, activeConversation } = get();
        if (!activeConversation) return { success: false };

        const updatedMessages = (messages[activeConversation] || []).filter(m => m._id !== messageId);
        set({ messages: { ...messages, [activeConversation]: updatedMessages } });

        try {
            const response = await fetch(`${API_URL}/api/messages/delete-me/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to delete message locally');
            return { success: true };
        } catch (error: any) {
            console.error('Error deleting message for me:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete for everyone with Optimistic Update
    deleteMessageForEveryone: async (messageId: string, token: string) => {
        const { messages, activeConversation } = get();
        if (!activeConversation) return { success: false };

        const updatedMessages = (messages[activeConversation] || []).map(m =>
            m._id === messageId ? { ...m, text: 'This message was deleted', image: undefined, isDeleted: true } : m
        );
        set({ messages: { ...messages, [activeConversation]: updatedMessages } });

        try {
            const response = await fetch(`${API_URL}/api/messages/delete-everyone/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to delete message for everyone');
            return { success: true };
        } catch (error: any) {
            console.error('Error deleting message for everyone:', error);
            return { success: false, error: error.message };
        }
    },

    // Clear chat history with Optimistic Update
    clearChatHistory: async (otherUserId: string, token: string) => {
        const { messages } = get();
        set({ messages: { ...messages, [otherUserId]: [] } });

        try {
            const response = await fetch(`${API_URL}/api/messages/clear/${otherUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to clear chat history');
            return { success: true };
        } catch (error: any) {
            console.error('Error clearing chat history:', error);
            return { success: false, error: error.message };
        }
    },

    // Socket: Update message after edit
    updateLocalEditedMessage: (data: { messageId: string, text: string, editedAt: string }) => {
        const { messages } = get();
        for (const userId in messages) {
            const found = messages[userId].some(m => m._id === data.messageId);
            if (found) {
                const updated = messages[userId].map(m =>
                    m._id === data.messageId ? { ...m, text: data.text, isEdited: true, editedAt: data.editedAt } : m
                );
                set({ messages: { ...messages, [userId]: updated } });
                break;
            }
        }
    },

    // Socket: Update message after delete for everyone
    updateLocalDeletedMessage: (data: { messageId: string, conversationId: string }) => {
        const { messages } = get();
        for (const userId in messages) {
            const found = messages[userId].some(m => m._id === data.messageId);
            if (found) {
                const updated = messages[userId].map(m =>
                    m._id === data.messageId ? { ...m, text: 'This message was deleted', image: undefined, isDeleted: true } : m
                );
                set({ messages: { ...messages, [userId]: updated } });
                break;
            }
        }
    },

    // Socket: Update messages when read by recipient
    updateLocalMessagesRead: (data: { conversationId: string, readerId: string, readAt: string }) => {
        const { messages, currentUserId } = get();
        const otherUserId = data.readerId;

        if (messages[otherUserId]) {
            const updated = messages[otherUserId].map(m => {
                const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
                // If the other user (readerId) read them, it means any message they received (where WE are sender) is now read
                if (senderId === 'me' || senderId === currentUserId) {
                    return { ...m, read: true, readAt: data.readAt };
                }
                return m;
            });
            set({ messages: { ...messages, [otherUserId]: updated } });
        }
    },

    // Socket: Update message when delivered to recipient
    updateLocalMessageDelivered: (data: { messageId: string, deliveredAt: string }) => {
        const { messages } = get();
        for (const userId in messages) {
            const index = messages[userId].findIndex(m => m._id === data.messageId);
            if (index !== -1) {
                const updated = [...messages[userId]];
                updated[index] = { ...updated[index], deliveredAt: data.deliveredAt };
                set({ messages: { ...messages, [userId]: updated } });
                break;
            }
        }
    },

    // Set current user ID for tick matching
    setCurrentUserId: (userId: string | null) => {
        set({ currentUserId: userId });
    },

    // Reset store
    reset: () => {
        set({
            conversations: [],
            messages: {},
            unreadCount: 0,
            activeConversation: null,
            currentUserId: null,
        });
    },
}));
