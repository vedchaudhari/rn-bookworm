import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiClient } from "../services/api/apiClient";
import { Keyboard } from "react-native";

// --- SECURITY CONSTANTS & CONFIGURATION ---

const TOKEN_KEY = "refresh_token";

// Standard security option for all native platforms
// Accessible only when device is unlocked and after first unlock.
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
};

// --- SECURE STORAGE WRAPPERS ---

/**
 * Checks if SecureStore is available on the current device/platform.
 */
const isSecureStoreAvailable = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false; // Web not supported by SecureStore
    return await SecureStore.isAvailableAsync();
};

/**
 * Securely saves the token.
 */
const setSecureToken = async (token: string) => {
    try {
        if (await isSecureStoreAvailable()) {
            await SecureStore.setItemAsync(TOKEN_KEY, token, SECURE_OPTIONS);
        } else {
            console.warn("[Auth] SecureStore unavailable, session will not persist securely.");
        }
    } catch (error) {
        console.error("[Auth] Failed to set secure token:", error);
        throw error; // Propagate to caller to handle UI feedback
    }
};

/**
 * Securely retrieves the token.
 */
const getSecureToken = async (): Promise<string | null> => {
    try {
        if (await isSecureStoreAvailable()) {
            return await SecureStore.getItemAsync(TOKEN_KEY, SECURE_OPTIONS);
        }
        return null;
    } catch (error) {
        console.error("[Auth] Failed to get secure token:", error);
        return null; // Treat corruption/failure as logged out
    }
};

/**
 * Securely deletes the token.
 */
const deleteSecureToken = async () => {
    try {
        if (await isSecureStoreAvailable()) {
            await SecureStore.deleteItemAsync(TOKEN_KEY, SECURE_OPTIONS);
        }
    } catch (error) {
        console.error("[Auth] Failed to delete secure token:", error);
        // Continue with logout flow even if this fails
    }
};

// --- TYPES & INTERFACES ---

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
    hasCompletedOnboarding: boolean;
    register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    checkAuth: () => Promise<void>;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    refreshUser: () => Promise<{ success: boolean; user?: User; error?: string }>;
    updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    completeOnboarding: () => Promise<void>;
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
    hasCompletedOnboarding: false,

    register: async (email: string, username: string, password: string) => {
        set({ isLoading: true });
        try {
            const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>(
                `/api/auth/register`,
                { email, username, password }
            );

            const { accessToken, refreshToken, user } = data as any;
            const normalizedUser = normalizeUser(user);

            // Store non-sensitive user data in AsyncStorage
            await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));

            // Store Refresh Token in SecureStore
            await setSecureToken(refreshToken);

            set({
                token: accessToken, // Access Token in Memory Only
                user: normalizedUser,
                isLoading: false,
                isAuthLoading: false,
                isCheckingAuth: false
            });

            // Sync with apiClient
            apiClient.setAuthToken(accessToken);

            return { success: true };
        } catch (error: any) {
            set({ isLoading: false })
            return { success: false, error: error.message };
        }
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true });

        try {
            // 1. Attempt to get Refresh Token from SecureStore
            const refreshToken = await getSecureToken();

            // Load onboarding state
            const onboarding = await AsyncStorage.getItem('onboarding_completed');
            set({ hasCompletedOnboarding: onboarding === 'true' });

            if (refreshToken) {
                // Attempt to usage Refresh Token to get a new Access Token
                try {
                    const refreshResponse = await apiClient.post<{ accessToken: string, refreshToken: string }>(
                        `/api/auth/refresh`,
                        { refreshToken }
                    );

                    const { accessToken, refreshToken: newRefreshToken } = refreshResponse;

                    // Rotate Refresh Token
                    await setSecureToken(newRefreshToken);

                    // Set Access Token in State
                    set({ token: accessToken });
                    apiClient.setAuthToken(accessToken);

                    // Fetch User Profile
                    try {
                        const data = await apiClient.get<{ user: any }>(`/api/auth/me`);
                        const normalizedUser = normalizeUser(data.user);

                        await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));
                        set({ user: normalizedUser });
                    } catch (meError) {
                        console.warn("[Auth] /me failed after refresh", meError);
                        // Fallback to cached user if available
                        const cachedUserStr = await AsyncStorage.getItem("user");
                        if (cachedUserStr) {
                            set({ user: normalizeUser(JSON.parse(cachedUserStr)) });
                        }
                    }

                } catch (refreshError) {
                    console.error("[Auth] Refresh failed during checkAuth:", refreshError);
                    // Refresh failed (invalid/expired) -> User is logged out
                    await deleteSecureToken();
                    set({ token: null, user: null });
                    apiClient.setAuthToken(null);
                }
            } else {
                // No Refresh Token -> Logged out
                set({ token: null, user: null });
                apiClient.setAuthToken(null);
            }

        } catch (error: any) {
            console.error("Auth check error:", error);
            set({ token: null, user: null });
        } finally {
            set({ isCheckingAuth: false, isAuthLoading: false });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {

            const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>(
                `/api/auth/login`,
                { email, password }
            );

            const { accessToken, refreshToken, user } = data as any;
            const normalizedUser = normalizeUser(user);

            // Store non-sensitive user data in AsyncStorage
            await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));

            // Store Refresh Token in SecureStore
            await setSecureToken(refreshToken);

            // Ensure legacy token is gone
            await AsyncStorage.removeItem("token");

            set({
                token: accessToken,
                user: normalizedUser,
                isLoading: false,
                isAuthLoading: false,
                isCheckingAuth: false
            });


            // Sync with apiClient
            apiClient.setAuthToken(accessToken);

            return { success: true };

        } catch (error: any) {
            console.error("❌ Login failed:", error);
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

            // 1. Notify Backend (Best Effort)
            const refreshToken = await getSecureToken();
            if (refreshToken) {
                try {
                    await apiClient.post('/api/auth/logout', { refreshToken });
                } catch (e) {
                    console.warn("[Auth] Backend logout failed, continuing local logout", e);
                }
            }

            // 2. Clear storage (BUT keep onboarding state)
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("token"); // Cleanup legacy if exists

            // Clear SecureStore (Delete Refresh Token)
            await deleteSecureToken();

            // Dismiss keyboard to prevent Android UI crashes during nav
            Keyboard.dismiss();

            // 3. Reset all global stores to prevent cross-account data leakage
            // Using dynamic imports to avoid circular dependencies
            try {
                const { useSocialStore } = await import('./socialStore');
                useSocialStore.getState().reset();
            } catch (e) { console.error('Store reset failed: Social'); }

            try {
                const { useBookshelfStore } = await import('./bookshelfStore');
                useBookshelfStore.getState().reset();
            } catch (e) { console.error('Store reset failed: Bookshelf'); }

            try {
                const { useMessageStore } = await import('./messageStore');
                useMessageStore.getState().reset();
            } catch (e) { console.error('Store reset failed: Message'); }

            try {
                const { useNotificationStore } = await import('./notificationStore');
                useNotificationStore.getState().reset();
            } catch (e) { console.error('Store reset failed: Notification'); }

            try {
                const { useReadingSessionStore } = await import('./readingSessionStore');
                useReadingSessionStore.getState().reset();
            } catch (e) { console.error('Store reset failed: ReadingSession'); }

            try {
                const { useGamificationStore } = await import('./gamificationStore');
                useGamificationStore.getState().reset();
            } catch (e) { console.error('Store reset failed: Gamification'); }

            try {
                const { useBookNoteStore } = await import('./bookNoteStore');
                useBookNoteStore.getState().reset();
            } catch (e) { console.error('Store reset failed: BookNote'); }

            try {
                const { useCurrencyStore } = await import('./currencyStore');
                if (typeof useCurrencyStore.getState().reset === 'function') {
                    useCurrencyStore.getState().reset();
                }
            } catch (e) { console.error('Store reset failed: Currency'); }

            set({ token: null, user: null });

            // Sync with apiClient
            apiClient.setAuthToken(null);

            return { success: true };
        } catch (error) {
            return { success: false, error: "Logout failed" };
        }
    },

    completeOnboarding: async () => {
        await AsyncStorage.setItem('onboarding_completed', 'true');
        set({ hasCompletedOnboarding: true });
    }
}))

// Register global unauthorized handler to trigger logout when a 401 is received
apiClient.registerUnauthorizedCallback(() => {
    useAuthStore.getState().logout();
});

