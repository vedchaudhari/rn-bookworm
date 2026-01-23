import { create } from 'zustand';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../lib/apiClient";
import { API_URL } from "../constants/api";

interface User {
    id: string;
    _id?: string; // Kept for compatibility if needed
    email: string;
    username: string;
    profileImage?: string;
    bio?: string;
    level?: number;
    points?: number;
    currentStreak?: number;
    longestStreak?: number;
    [key: string]: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isCheckingAuth: boolean;
    isAuthLoading: boolean;
    register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    checkAuth: () => Promise<void>;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    refreshUser: () => Promise<{ success: boolean; user?: User; error?: string }>;
    updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
}

// Simple Base64 decoder for JWT payload
const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Robust decoding that works in most environments
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Decode error:", e);
        return null;
    }
};

/**
 * Normalizes user object to ensure it has both 'id' and '_id' for consistency
 */
const normalizeUser = (user: any): User => {
    const id = user.id || user._id;
    return {
        ...user,
        id,
        _id: id // Ensure both are present
    };
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: false,
    isCheckingAuth: true,
    isAuthLoading: true,

    register: async (email: string, username: string, password: string) => {
        set({ isLoading: true });
        try {
            const data = await apiClient.post<{ token: string; user: any }>(
                `/api/auth/register`,
                { email, username, password }
            );

            const normalizedUser = normalizeUser(data.user);

            await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));
            await AsyncStorage.setItem("token", data.token);

            set({
                token: data.token,
                user: normalizedUser,
                isLoading: false,
            });

            // Sync with apiClient
            apiClient.setAuthToken(data.token);

            return { success: true };
        } catch (error: any) {
            set({ isLoading: false })
            return { success: false, error: error.message };
        }
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true });

        try {
            const cachedToken = await AsyncStorage.getItem("token");
            const cachedUserStr = await AsyncStorage.getItem("user");

            if (cachedToken) {
                // Cold-start safety: immediately push token to apiClient
                apiClient.setAuthToken(cachedToken);

                let cachedUser = null;
                try {
                    cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
                } catch (e) {
                    console.log("Failed to parse cached user");
                }

                if (!cachedUser) {
                    const decoded = decodeJwt(cachedToken);
                    if (decoded) {
                        const userId = decoded.userId || decoded.id || decoded._id;
                        if (userId) {
                            cachedUser = normalizeUser({ id: userId });
                        }
                    }
                }

                if (cachedUser) {
                    // Ensure cached user is also normalized
                    cachedUser = normalizeUser(cachedUser);
                    set({
                        token: cachedToken,
                        user: cachedUser
                    });
                }
            }

            if (!cachedToken) {
                set({ token: null, user: null });
                return;
            }

            const data = await apiClient.get<{ user: any }>(`/api/auth/me`);
            const normalizedUser = normalizeUser(data.user);

            await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));
            set({
                token: cachedToken,
                user: normalizedUser,
            });

        } catch (error: any) {
            console.log("Auth check error:", error);
            // On 401, apiClient handles it. On other errors, we keep cached state
        } finally {
            set({ isCheckingAuth: false, isAuthLoading: false });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
            const data = await apiClient.post<{ token: string; user: any }>(
                `/api/auth/login`,
                { email, password }
            );

            const normalizedUser = normalizeUser(data.user);

            await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));
            await AsyncStorage.setItem("token", data.token);

            set({
                token: data.token,
                user: normalizedUser,
                isLoading: false
            });

            // Sync with apiClient
            apiClient.setAuthToken(data.token);

            return { success: true };

        } catch (error: any) {
            set({ isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Refresh user data from storage
    refreshUser: async () => {
        try {
            const userJson = await AsyncStorage.getItem("user");
            if (userJson) {
                const user = normalizeUser(JSON.parse(userJson));
                set({ user });
                return { success: true, user };
            }
            return { success: false, error: "No user data found" };
        } catch (error: any) {
            console.error("Error refreshing user:", error);
            return { success: false, error: error.message };
        }
    },

    // Update user data in both state and storage
    updateUser: async (userData: Partial<User>) => {
        try {
            const currentUser = get().user;
            const updatedUser = normalizeUser({ ...currentUser, ...userData });

            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
            set({ user: updatedUser });

            return { success: true };
        } catch (error: any) {
            console.error("Error updating user:", error);
            return { success: false, error: error.message };
        }
    },

    logout: async () => {
        try {
            set({ isLoading: true });

            // 1. Clear storage
            await AsyncStorage.multiRemove(["token", "user"]);

            // 2. Reset all global stores to prevent cross-account data leakage
            // Using dynamic imports to avoid circular dependencies
            try {
                const { useSocialStore } = await import('./socialStore');
                useSocialStore.getState().reset();
            } catch (e) { console.log('Store reset failed: Social'); }

            try {
                const { useBookshelfStore } = await import('./bookshelfStore');
                useBookshelfStore.getState().reset();
            } catch (e) { console.log('Store reset failed: Bookshelf'); }

            try {
                const { useMessageStore } = await import('./messageStore');
                useMessageStore.getState().reset();
            } catch (e) { console.log('Store reset failed: Message'); }

            try {
                const { useNotificationStore } = await import('./notificationStore');
                useNotificationStore.getState().reset();
            } catch (e) { console.log('Store reset failed: Notification'); }

            try {
                const { useReadingSessionStore } = await import('./readingSessionStore');
                useReadingSessionStore.getState().reset();
            } catch (e) { console.log('Store reset failed: ReadingSession'); }

            try {
                const { useGamificationStore } = await import('./gamificationStore');
                useGamificationStore.getState().reset();
            } catch (e) { console.log('Store reset failed: Gamification'); }

            try {
                const { useBookNoteStore } = await import('./bookNoteStore');
                useBookNoteStore.getState().reset();
            } catch (e) { console.log('Store reset failed: BookNote'); }

            try {
                const { useCurrencyStore } = await import('./currencyStore');
                if (typeof useCurrencyStore.getState().reset === 'function') {
                    useCurrencyStore.getState().reset();
                }
            } catch (e) { console.log('Store reset failed: Currency'); }

            set({ token: null, user: null, isLoading: false });

            // Sync with apiClient
            apiClient.setAuthToken(null);

            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, error: "Logout failed" };
        }
    }
}))

// Register global unauthorized handler to trigger logout when a 401 is received
apiClient.registerUnauthorizedCallback(() => {
    useAuthStore.getState().logout();
});
