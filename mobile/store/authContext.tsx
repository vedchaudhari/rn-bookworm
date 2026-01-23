import { create } from 'zustand';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../lib/apiClient";
import { API_URL } from "../constants/api";

interface User {
    _id: string;
    id?: string;
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

        // Use global atob if available
        const decoded = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: false,
    isCheckingAuth: true,

    register: async (email: string, username: string, password: string) => {
        set({ isLoading: true });
        try {
            const data = await apiClient.post<{ token: string; user: User }>(
                `/api/auth/register`,
                { email, username, password }
            );

            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            await AsyncStorage.setItem("token", data.token);

            set({
                token: data.token,
                user: data.user,
                isLoading: false,
            })

            return { success: true };
        } catch (error: any) {
            set({ isLoading: false })
            return { success: false, error: error.message };
        }
    },

    checkAuth: async () => {
        // Set checking state at the start
        set({ isCheckingAuth: true });

        try {
            // 1. Immediately hydrate from storage to avoid race conditions
            const cachedToken = await AsyncStorage.getItem("token");
            const cachedUserStr = await AsyncStorage.getItem("user");

            if (cachedToken) {
                let cachedUser = null;
                try {
                    cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
                } catch (e) {
                    console.log("Failed to parse cached user");
                }

                // If user object is missing, try to decode token for at least the ID
                if (!cachedUser) {
                    const decoded = decodeJwt(cachedToken);
                    if (decoded) {
                        cachedUser = { _id: decoded.id || decoded.userId || decoded._id };
                    }
                }

                if (cachedUser) {
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

            // 2. Verify token with backend
            const data = await apiClient.get<{ user: User }>(`/api/auth/me`);

            // 3. Update with fresh data
            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            set({
                token: cachedToken,
                user: data.user,
            });

        } catch (error: any) {
            console.log("Auth check error:", error);
            // If it's a 401, apiClient already handles logout via interceptor
            // On other errors (e.g. network), we keep the cached state if it exists
        } finally {
            // CRITICAL: Always set isCheckingAuth to false
            set({ isCheckingAuth: false });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
            const data = await apiClient.post<{ token: string; user: User }>(
                `/api/auth/login`,
                { email, password }
            );

            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            await AsyncStorage.setItem("token", data.token);

            set({
                token: data.token,
                user: data.user,
                isLoading: false
            })

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
                const user = JSON.parse(userJson);
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
            const updatedUser = { ...currentUser, ...userData } as User;

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

            // 2. Reset all global stores to prevent cross-account stale data
            const { useSocialStore } = await import('./socialStore');
            const { useBookshelfStore } = await import('./bookshelfStore');
            const { useMessageStore } = await import('./messageStore');

            useSocialStore.getState().reset();
            useBookshelfStore.getState().reset();
            useMessageStore.getState().reset();

            set({ token: null, user: null, isLoading: false });

            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, error: "Logout failed" };
        }
    }
}))
