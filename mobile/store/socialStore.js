import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

// Helper functions to serialize/deserialize Sets
const serializeSet = (set) => JSON.stringify([...set]);
const deserializeSet = (str) => {
    try {
        return new Set(JSON.parse(str));
    } catch {
        return new Set();
    }
};

export const useSocialStore = create((set, get) => ({
    // State
    likedBooks: new Set(),
    followedUsers: new Set(),
    isHydrated: false,

    // Hydrate state from AsyncStorage
    hydrate: async () => {
        try {
            const [likedBooksStr, followedUsersStr] = await Promise.all([
                AsyncStorage.getItem('likedBooks'),
                AsyncStorage.getItem('followedUsers')
            ]);

            set({
                likedBooks: likedBooksStr ? deserializeSet(likedBooksStr) : new Set(),
                followedUsers: followedUsersStr ? deserializeSet(followedUsersStr) : new Set(),
                isHydrated: true
            });
        } catch (error) {
            console.error('Error hydrating social store:', error);
            set({ isHydrated: true });
        }
    },

    // Persist to AsyncStorage
    persist: async () => {
        try {
            const { likedBooks, followedUsers } = get();
            await Promise.all([
                AsyncStorage.setItem('likedBooks', serializeSet(likedBooks)),
                AsyncStorage.setItem('followedUsers', serializeSet(followedUsers))
            ]);
        } catch (error) {
            console.error('Error persisting social store:', error);
        }
    },

    // Like actions
    toggleLike: async (bookId, token) => {
        const { likedBooks } = get();
        const wasLiked = likedBooks.has(bookId);

        // Optimistic Update
        const newLikedBooks = new Set(likedBooks);
        if (wasLiked) {
            newLikedBooks.delete(bookId);
        } else {
            newLikedBooks.add(bookId);
        }
        set({ likedBooks: newLikedBooks });
        get().persist();

        try {
            const response = await fetch(`${API_URL}/api/social/like/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) {
                // Revert on failure
                set({ likedBooks: likedBooks });
                get().persist();
                throw new Error(data.message);
            }

            return { success: true, liked: !wasLiked };
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error
            set({ likedBooks: likedBooks });
            get().persist();
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
                // Only update if not already there to avoid unnecessary heavy ops
                if (!likedBooks.has(bookId)) {
                    const newLikedBooks = new Set(likedBooks);
                    newLikedBooks.add(bookId);
                    set({ likedBooks: newLikedBooks });
                    get().persist();
                }
            }

            return data.liked;
        } catch (error) {
            console.error('Error checking like status:', error);
            return false;
        }
    },

    // Follow actions
    toggleFollow: async (userId, token) => {
        const { followedUsers } = get();
        const wasFollowing = followedUsers.has(userId);

        // Optimistic Update
        const newFollowedUsers = new Set(followedUsers);
        if (wasFollowing) {
            newFollowedUsers.delete(userId);
        } else {
            newFollowedUsers.add(userId);
        }
        set({ followedUsers: newFollowedUsers });
        get().persist();

        try {
            const response = await fetch(`${API_URL}/api/social/follow/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) {
                // Revert
                set({ followedUsers: followedUsers });
                get().persist();
                throw new Error(data.message);
            }

            return { success: true, following: !wasFollowing };
        } catch (error) {
            console.error('Error toggling follow:', error);
            // Revert
            set({ followedUsers: followedUsers });
            get().persist();
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
                get().persist(); // Persist changes
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
    reset: async () => {
        set({
            likedBooks: new Set(),
            followedUsers: new Set(),
        });
        try {
            await AsyncStorage.multiRemove(['likedBooks', 'followedUsers']);
        } catch (error) {
            console.error('Error clearing social store:', error);
        }
    },
}));
