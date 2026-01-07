import { create } from 'zustand';
import { API_URL } from '../constants/api';

export const useSocialStore = create((set, get) => ({
    // State
    likedBooks: new Set(),
    followedUsers: new Set(),

    // Like actions
    toggleLike: async (bookId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/like/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Optimistic update
            const { likedBooks } = get();
            const newLikedBooks = new Set(likedBooks);

            if (data.liked) {
                newLikedBooks.add(bookId);
            } else {
                newLikedBooks.delete(bookId);
            }

            set({ likedBooks: newLikedBooks });
            return { success: true, liked: data.liked };
        } catch (error) {
            console.error('Error toggling like:', error);
            return { success: false, error: error.message };
        }
    },

    checkLikeStatus: async (bookId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/like-status/${bookId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (data.liked) {
                const { likedBooks } = get();
                const newLikedBooks = new Set(likedBooks);
                newLikedBooks.add(bookId);
                set({ likedBooks: newLikedBooks });
            }

            return data.liked;
        } catch (error) {
            console.error('Error checking like status:', error);
            return false;
        }
    },

    // Follow actions
    toggleFollow: async (userId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/follow/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Optimistic update
            const { followedUsers } = get();
            const newFollowedUsers = new Set(followedUsers);

            if (data.following) {
                newFollowedUsers.add(userId);
            } else {
                newFollowedUsers.delete(userId);
            }

            set({ followedUsers: newFollowedUsers });
            return { success: true, following: data.following };
        } catch (error) {
            console.error('Error toggling follow:', error);
            return { success: false, error: error.message };
        }
    },

    checkFollowStatus: async (userId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/follow-status/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (data.following) {
                const { followedUsers } = get();
                const newFollowedUsers = new Set(followedUsers);
                newFollowedUsers.add(userId);
                set({ followedUsers: newFollowedUsers });
            }

            return data.following;
        } catch (error) {
            console.error('Error checking follow status:', error);
            return false;
        }
    },

    // Comments
    addComment: async (bookId, text, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/comment/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            return { success: true, comment: data };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    },

    deleteComment: async (commentId, token) => {
        try {
            const response = await fetch(`${API_URL}/api/social/comment/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            return { success: true };
        } catch (error) {
            console.error('Error deleting comment:', error);
            return { success: false, error: error.message };
        }
    },

    // Reset store
    reset: () => {
        set({
            likedBooks: new Set(),
            followedUsers: new Set(),
        });
    },
}));
