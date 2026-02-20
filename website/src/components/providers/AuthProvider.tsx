"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { checkAuth, token } = useAuthStore();

    useEffect(() => {
        // Restore token from zustand persist to apiClient memory
        if (token) {
            apiClient.setAuthToken(token);
        }
        // Then verify / refresh
        checkAuth();
    }, []);

    return <>{children}</>;
}
