"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Loader2, Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const NOTIF_ICONS: Record<string, string> = {
    LIKE: "❤️",
    COMMENT: "💬",
    FOLLOW: "👤",
    FOLLOW_REQUEST: "📨",
    FOLLOW_ACCEPTED: "✅",
    ACHIEVEMENT: "🏆",
    REWARD: "🎁",
    STREAK: "🔥",
    CHALLENGE: "⚔️",
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await apiClient.get<any>("/api/notifications", { page: 1, limit: 30 });
                setNotifications(data.notifications || data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            await apiClient.patch("/api/notifications/read-all");
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch { }
    };

    return (
        <div className="h-screen overflow-y-auto">
            <div className="sticky top-0 z-20 px-4 pt-6 pb-4 flex items-center justify-between"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
                <div>
                    <h1 className="section-header mb-0.5">Notifications</h1>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {notifications.filter((n) => !n.isRead).length} unread
                    </p>
                </div>
                {notifications.some((n) => !n.isRead) && (
                    <button onClick={markAllRead} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5" />
                        Mark All Read
                    </button>
                )}
            </div>

            <div className="px-4 py-4">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20">
                        <BellOff className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                        <p className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>All caught up!</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notif: any, i: number) => (
                            <motion.div
                                key={notif._id || i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="glass-card p-4 flex items-start gap-3"
                                style={!notif.isRead ? { borderLeft: "2px solid var(--primary)" } : {}}
                            >
                                {/* Emoji Icon */}
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
                                    style={{ background: "rgba(25,227,209,0.1)" }}>
                                    {NOTIF_ICONS[notif.type] || "🔔"}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {notif.data?.fromUser && (
                                        <p className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                                            {notif.data.fromUser.username || notif.data.likedByUsername || notif.data.commentedByUsername || notif.data.followedByUsername}
                                        </p>
                                    )}
                                    {notif.message && (
                                        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                                            {notif.message}
                                        </p>
                                    )}
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        {formatDate(notif.createdAt)}
                                    </p>
                                </div>

                                {/* Unread dot */}
                                {!notif.isRead && (
                                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--primary)" }} />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
