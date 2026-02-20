"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
    Home, BookOpen, Compass, Bell, User, LogOut,
    PlusCircle, MessageSquare, Flame, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/Avatar";
import toast from "react-hot-toast";
import AppDownloadBadge from "@/components/ui/AppDownloadBadge";

const NAV_ITEMS = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/bookshelf", icon: BookOpen, label: "Bookshelf" },
    { href: "/create", icon: PlusCircle, label: "Create" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
    { href: "/streaks", icon: Flame, label: "Streaks" },
    { href: "/profile", icon: User, label: "Profile" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out");
        router.push("/login");
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-64 z-40 hidden lg:flex flex-col py-6 px-4"
            style={{
                background: "rgba(11, 15, 20, 0.9)",
                borderRight: "1px solid var(--glass-border)",
                backdropFilter: "blur(24px)",
            }}
        >
            {/* Logo */}
            <Link href="/feed" className="flex items-center gap-3 px-3 mb-8">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                        background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                        boxShadow: "0 0 20px rgba(25,227,209,0.4)",
                    }}
                >
                    <BookOpen className="w-6 h-6 text-[#0B0F14]" />
                </div>
                <span className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                    Book<span style={{ color: "var(--primary)" }}>worm</span>
                </span>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link key={href} href={href}>
                            <motion.div
                                whileHover={{ x: 4 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer ${isActive ? "nav-active" : ""
                                    }`}
                                style={
                                    isActive
                                        ? {
                                            background: "rgba(25, 227, 209, 0.1)",
                                            borderLeft: "2px solid var(--primary)",
                                        }
                                        : { color: "var(--text-secondary)" }
                                }
                            >
                                <Icon
                                    className="w-5 h-5 flex-shrink-0"
                                    style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
                                />
                                <span
                                    className={`font-${isActive ? "bold" : "medium"} text-sm`}
                                    style={{ color: isActive ? "var(--primary)" : "var(--text-secondary)" }}
                                >
                                    {label}
                                </span>
                                {isActive && (
                                    <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--primary)" }} />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* App Download Badge */}
            <div className="mt-6 mb-2">
                <AppDownloadBadge />
            </div>

            {/* User Widget */}
            {user && (
                <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
                    <Link href="/profile">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl mb-2 cursor-pointer transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }}>
                            <Avatar
                                src={user.profileImage}
                                name={user.username}
                                size={40}
                                style={{ border: "2px solid rgba(25,227,209,0.3)" }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                                    {user.username}
                                </p>
                                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                    Lv.{user.level || 1} · {user.points || 0} pts
                                </p>
                            </div>
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl w-full transition-all duration-200"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                            e.currentTarget.style.color = "#EF4444";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-muted)";
                        }}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Log Out</span>
                    </button>
                </div>
            )}
        </aside>
    );
}
