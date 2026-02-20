"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { user, token, isCheckingAuth } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isCheckingAuth && !user && !token) {
            router.push("/login");
        }
    }, [user, token, isCheckingAuth, router]);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl animate-pulse"
                        style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", boxShadow: "0 0 30px rgba(25,227,209,0.4)" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user && !token) return null;

    return <>{children}</>;
}
