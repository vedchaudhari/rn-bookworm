"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { MessageSquare, Search, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";

export default function MessagesPage() {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const data = await apiClient.get<any>("/api/messages/conversations");
                setConversations(data.conversations || []);
            } catch (e) {
                console.error("Failed to fetch conversations", e);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    const filtered = conversations.filter((c) => {
        if (!search.trim()) return true;
        return c.otherUser?.username?.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Header */}
                <div
                    className="sticky top-0 z-20 px-4 pt-6 pb-4"
                    style={{
                        background: "rgba(11,15,20,0.9)",
                        backdropFilter: "blur(20px)",
                        borderBottom: "1px solid var(--glass-border)",
                    }}
                >
                    <h1 className="section-header mb-1">Messages</h1>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                        Your private conversations
                    </p>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--primary)" }} />
                        <input
                            type="text"
                            className="input-field pl-11 pr-10 text-sm"
                            placeholder="Search conversations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-4 py-4">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20"
                        >
                            <MessageSquare
                                className="w-16 h-16 mx-auto mb-4"
                                style={{ color: "var(--text-muted)", opacity: 0.4 }}
                            />
                            <p className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                                {search ? "No conversations found" : "No messages yet"}
                            </p>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                {search
                                    ? "Try a different name"
                                    : "Search for a user in Explore and start a conversation"}
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((conv: any, i: number) => {
                                const other = conv.otherUser;
                                const lastMsg = conv.lastMessage;
                                const unread = conv.unreadCount || 0;
                                const isFromMe = lastMsg?.senderId?.toString() === user?.id;

                                return (
                                    <motion.div
                                        key={conv.conversationId || i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <Link
                                            href={`/messages/${other?._id}`}
                                            className="glass-card flex items-center gap-4 p-4"
                                            style={
                                                unread > 0
                                                    ? { borderLeft: "2px solid var(--primary)" }
                                                    : {}
                                            }
                                        >
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <Avatar
                                                    src={other?.profileImage}
                                                    name={other?.username}
                                                    size={48}
                                                    style={{ border: "2px solid rgba(25,227,209,0.3)" }}
                                                />
                                                {/* Unread badge */}
                                                {unread > 0 && (
                                                    <div
                                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                                                        style={{
                                                            background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                                                            color: "#0B0F14",
                                                        }}
                                                    >
                                                        {unread > 9 ? "9+" : unread}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p
                                                        className="font-bold text-sm truncate"
                                                        style={{
                                                            color: unread > 0 ? "var(--text-primary)" : "var(--text-secondary)",
                                                        }}
                                                    >
                                                        {other?.username}
                                                    </p>
                                                    {lastMsg?.createdAt && (
                                                        <p className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
                                                            {formatDate(lastMsg.createdAt)}
                                                        </p>
                                                    )}
                                                </div>
                                                <p
                                                    className="text-xs truncate"
                                                    style={{
                                                        color: unread > 0 ? "var(--text-secondary)" : "var(--text-muted)",
                                                        fontWeight: unread > 0 ? 600 : 400,
                                                    }}
                                                >
                                                    {isFromMe ? "You: " : ""}
                                                    {lastMsg?.text || "📷 Media"}
                                                </p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
