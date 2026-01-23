import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/apiClient';

// Helper functions to serialize/deserialize Sets
const serializeSet = (set: Set<string>): string => JSON.stringify([...set]);
const deserializeSet = (str: string): Set<string> => {
    try {
        return new Set(JSON.parse(str));
    } catch {
        return new Set();
    }
};

interface SocialState {
    likedBooks: Set<string>;
    followedUsers: Set<string>;
    isHydrated: boolean;
    hydrate: () => Promise<void>;
    persist: () => Promise<void>;
    toggleLike: (bookId: string, token: string) => Promise<{ success: boolean; liked?: boolean; error?: string }>;
    checkLikeStatus: (bookId: string, token: string) => Promise<boolean>;
    toggleFollow: (userId: string, token: string) => Promise<{ success: boolean; following?: boolean; status?: string; error?: string }>;
    checkFollowStatus: (userId: string, token: string) => Promise<boolean>;
    setFollowStatus: (userId: string, following: boolean) => void;
    addComment: (bookId: string, text: string, token: string) => Promise<{ success: boolean; comment?: any; error?: string }>;
    deleteComment: (commentId: string, token: string) => Promise<{ success: boolean; error?: string }>;
    reset: () => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
    likedBooks: new Set(),
    followedUsers: new Set(),
    isHydrated: false,

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

    toggleLike: async (bookId: string, token: string) => {
        const { likedBooks } = get();
        const wasLiked = likedBooks.has(bookId);

        const newLikedBooks = new Set(likedBooks);
        if (wasLiked) newLikedBooks.delete(bookId);
        else newLikedBooks.add(bookId);

        set({ likedBooks: newLikedBooks });
        get().persist();

        try {
            const data = await apiClient.post<any>(`/api/social/like/${bookId}`);
            return { success: true, liked: data.liked };
        } catch (error: any) {
            console.error('Error toggling like:', error);
            set({ likedBooks });
            get().persist();
            return { success: false, error: error.message };
        }
    },

    checkLikeStatus: async (bookId: string, token: string) => {
        try {
            const data = await apiClient.get<any>(`/api/social/like-status/${bookId}`);
            const { likedBooks } = get();
            const newLikedBooks = new Set(likedBooks);

            if (data.liked) newLikedBooks.add(bookId);
            else newLikedBooks.delete(bookId);

            set({ likedBooks: newLikedBooks });
            get().persist();
            return data.liked;
        } catch (error) {
            console.error('Error checking like status:', error);
            return false;
        }
    },

    toggleFollow: async (userId: string, token: string) => {
        const { followedUsers } = get();
        const wasFollowing = followedUsers.has(userId);

        const newFollowedUsers = new Set(followedUsers);
        if (wasFollowing) newFollowedUsers.delete(userId);
        else newFollowedUsers.add(userId);

        set({ followedUsers: newFollowedUsers });
        get().persist();

        try {
            const data = await apiClient.post<any>(`/api/social/follow/${userId}`);

            // Sync with server response
            const finalFollowedUsers = new Set(get().followedUsers);
            if (data.following) finalFollowedUsers.add(userId);
            else finalFollowedUsers.delete(userId);

            set({ followedUsers: finalFollowedUsers });
            get().persist();

            return { success: true, following: data.following, status: data.status };
        } catch (error: any) {
            console.error('Error toggling follow:', error);
            set({ followedUsers });
            get().persist();
            return { success: false, error: error.message };
        }
    },

    checkFollowStatus: async (userId: string, token: string) => {
        try {
            const data = await apiClient.get<any>(`/api/social/follow-status/${userId}`);
            const { followedUsers } = get();
            const newFollowedUsers = new Set(followedUsers);

            if (data.following) newFollowedUsers.add(userId);
            else newFollowedUsers.delete(userId);

            set({ followedUsers: newFollowedUsers });
            get().persist();
            return !!data.following;
        } catch (error) {
            console.error('Error checking follow status:', error);
            return false;
        }
    },

    setFollowStatus: (userId: string, following: boolean) => {
        const { followedUsers } = get();
        if (followedUsers.has(userId) === following) return;

        const newFollowedUsers = new Set(followedUsers);
        if (following) newFollowedUsers.add(userId);
        else newFollowedUsers.delete(userId);

        set({ followedUsers: newFollowedUsers });
        get().persist();
    },

    addComment: async (bookId: string, text: string, token: string) => {
        try {
            const data = await apiClient.post<any>(`/api/social/comment/${bookId}`, { text });
            return { success: true, comment: data };
        } catch (error: any) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    },

    deleteComment: async (commentId: string, token: string) => {
        try {
            await apiClient.delete(`/api/social/comment/${commentId}`);
            return { success: true };
        } catch (error: any) {
            console.error('Error deleting comment:', error);
            return { success: false, error: error.message };
        }
    },

    reset: async () => {
        set({ likedBooks: new Set(), followedUsers: new Set() });
        try {
            await AsyncStorage.multiRemove(['likedBooks', 'followedUsers']);
        } catch (error) {
            console.error('Error clearing social store:', error);
        }
    },
}));
