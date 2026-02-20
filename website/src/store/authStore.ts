import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/apiClient";

export interface User {
    id: string;
    _id?: string;
    email: string;
    username: string;
    profileImage?: string;
    profileBanner?: string;
    bio?: string;
    level?: number;
    points?: number;
    inkDrops?: number;
    currentStreak?: number;
    longestStreak?: number;
    isPrivate?: boolean;
    createdAt?: string;
    [key: string]: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isCheckingAuth: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateUser: (data: Partial<User>) => void;
    refreshUser: () => Promise<void>;
}

const normalizeUser = (user: any): User => {
    const id = user.id || user._id;
    return { ...user, id, _id: id };
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,
            isCheckingAuth: true,

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const data = await apiClient.post<any>("/api/auth/login", { email, password });
                    const { accessToken, refreshToken, user } = data;
                    const normalizedUser = normalizeUser(user);

                    localStorage.setItem("refresh_token", refreshToken);
                    apiClient.setAuthToken(accessToken);

                    set({
                        token: accessToken,
                        user: normalizedUser,
                        isLoading: false,
                        isCheckingAuth: false,
                    });
                    return { success: true };
                } catch (error: any) {
                    set({ isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            register: async (email, username, password) => {
                set({ isLoading: true });
                try {
                    const data = await apiClient.post<any>("/api/auth/register", { email, username, password });
                    const { accessToken, refreshToken, user } = data;
                    const normalizedUser = normalizeUser(user);

                    localStorage.setItem("refresh_token", refreshToken);
                    apiClient.setAuthToken(accessToken);

                    set({
                        token: accessToken,
                        user: normalizedUser,
                        isLoading: false,
                        isCheckingAuth: false,
                    });
                    return { success: true };
                } catch (error: any) {
                    set({ isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            logout: async () => {
                const refreshToken = localStorage.getItem("refresh_token");
                try {
                    if (refreshToken) {
                        await apiClient.post("/api/auth/logout", { refreshToken });
                    }
                } catch (e) { }
                localStorage.removeItem("refresh_token");
                apiClient.setAuthToken(null);
                set({ user: null, token: null });
            },

            checkAuth: async () => {
                set({ isCheckingAuth: true });
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) {
                    set({ isCheckingAuth: false, user: null, token: null });
                    return;
                }
                try {
                    const res = await apiClient.post<any>("/api/auth/refresh", { refreshToken });
                    const { accessToken, refreshToken: newRefreshToken } = res;

                    localStorage.setItem("refresh_token", newRefreshToken);
                    apiClient.setAuthToken(accessToken);
                    set({ token: accessToken });

                    const meData = await apiClient.get<any>("/api/auth/me");
                    set({ user: normalizeUser(meData.user), isCheckingAuth: false });
                } catch (e) {
                    localStorage.removeItem("refresh_token");
                    apiClient.setAuthToken(null);
                    set({ user: null, token: null, isCheckingAuth: false });
                }
            },

            updateUser: (data) => {
                const current = get().user;
                if (current) set({ user: normalizeUser({ ...current, ...data }) });
            },

            refreshUser: async () => {
                try {
                    const meData = await apiClient.get<any>("/api/auth/me");
                    set({ user: normalizeUser(meData.user) });
                } catch (e) { }
            },
        }),
        {
            name: "bookworm-auth",
            partialize: (state) => ({ user: state.user, token: state.token }),
        }
    )
);

// Register unauthorized callback
if (typeof window !== "undefined") {
    apiClient.registerUnauthorizedCallback(() => {
        useAuthStore.getState().logout();
    });
}
