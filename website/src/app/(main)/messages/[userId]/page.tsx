"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

export default function ChatPage() {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser } = useAuthStore();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchMessages = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [msgData, profileData] = await Promise.all([
                apiClient.get<any>(`/api/messages/conversation/${userId}?limit=60`),
                otherUser ? Promise.resolve(null) : apiClient.get<any>(`/api/users/${userId}`),
            ]);
            // Messages come newest-first, reverse for display
            const reversed = [...(msgData.messages || [])].reverse();
            setMessages(reversed);
            if (profileData) {
                setOtherUser(profileData.user || profileData);
            }
        } catch (e) {
            console.error("Failed to fetch messages", e);
        } finally {
            setLoading(false);
        }
    }, [userId, otherUser]);

    useEffect(() => {
        fetchMessages();
        // Poll every 5 seconds for new messages
        pollRef.current = setInterval(() => fetchMessages(true), 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [userId]);

    // Scroll to bottom when messages load
    useEffect(() => {
        if (!loading) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        // Optimistic update
        const optimistic = {
            _id: `opt-${Date.now()}`,
            sender: { _id: currentUser?.id, username: currentUser?.username, profileImage: currentUser?.profileImage },
            receiver: { _id: userId },
            text: trimmed,
            createdAt: new Date().toISOString(),
            _optimistic: true,
        };
        setMessages((prev) => [...prev, optimistic]);
        setText("");
        try {
            await apiClient.post<any>(`/api/messages/send/${userId}`, { text: trimmed });
            // Re-fetch to get the real message from server
            await fetchMessages(true);
        } catch {
            toast.error("Failed to send message");
            setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
            setText(trimmed);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div
                className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3"
                style={{
                    background: "rgba(11,15,20,0.95)",
                    backdropFilter: "blur(20px)",
                    borderBottom: "1px solid var(--glass-border)",
                }}
            >
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                >
                    <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </button>

                {otherUser && (
                    <Link href={`/profile/${userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                            src={otherUser.profileImage}
                            name={otherUser.username}
                            size={36}
                            style={{ border: "2px solid rgba(25,227,209,0.4)" }}
                        />
                        <div className="min-w-0">
                            <p className="font-black text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                {otherUser.username}
                            </p>
                            <p className="text-xs" style={{ color: "var(--primary)", opacity: 0.8 }}>
                                Lv.{otherUser.level || 1}
                            </p>
                        </div>
                    </Link>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">👋</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Say hello to {otherUser?.username}!
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg: any) => {
                            const isMe =
                                msg.sender?._id === currentUser?.id ||
                                msg.sender?._id === currentUser?._id ||
                                msg.sender === currentUser?.id;

                            return (
                                <motion.div
                                    key={msg._id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`max-w-[75%] flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                        {/* Avatar */}
                                        {!isMe && (
                                            <Avatar
                                                src={msg.sender?.profileImage}
                                                name={msg.sender?.username}
                                                size={28}
                                                className="self-end"
                                                style={{ border: "1.5px solid rgba(25,227,209,0.3)" }}
                                            />
                                        )}

                                        <div>
                                            {/* Bubble */}
                                            {msg.isDeleted ? (
                                                <div
                                                    className="rounded-2xl px-4 py-2 text-sm italic"
                                                    style={{
                                                        background: "rgba(255,255,255,0.04)",
                                                        color: "var(--text-muted)",
                                                        border: "1px solid var(--glass-border)",
                                                    }}
                                                >
                                                    This message was deleted
                                                </div>
                                            ) : (
                                                <div
                                                    className="rounded-2xl px-4 py-2 text-sm"
                                                    style={
                                                        isMe
                                                            ? {
                                                                background: "linear-gradient(135deg, rgba(25,227,209,0.25), rgba(0,194,255,0.2))",
                                                                color: "var(--text-primary)",
                                                                border: "1px solid rgba(25,227,209,0.25)",
                                                                opacity: msg._optimistic ? 0.7 : 1,
                                                            }
                                                            : {
                                                                background: "var(--surface-light)",
                                                                color: "var(--text-primary)",
                                                                border: "1px solid var(--glass-border)",
                                                            }
                                                    }
                                                >
                                                    {msg.image && (
                                                        <div className="relative w-48 h-36 rounded-xl overflow-hidden mb-2">
                                                            <Image src={msg.image} alt="image" fill className="object-cover" unoptimized />
                                                        </div>
                                                    )}
                                                    {msg.text}
                                                    {msg.isEdited && (
                                                        <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>(edited)</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <p
                                                className={`text-[10px] mt-0.5 ${isMe ? "text-right" : "text-left"}`}
                                                style={{ color: "var(--text-muted)" }}
                                            >
                                                {formatDate(msg.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
                className="flex-shrink-0 px-4 py-3 flex items-end gap-3"
                style={{
                    background: "rgba(11,15,20,0.95)",
                    backdropFilter: "blur(20px)",
                    borderTop: "1px solid var(--glass-border)",
                }}
            >
                <textarea
                    className="flex-1 rounded-2xl px-4 py-3 text-sm resize-none max-h-32"
                    style={{
                        background: "var(--surface-light)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                        outline: "none",
                    }}
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
                    style={{
                        background: text.trim() && !sending
                            ? "linear-gradient(135deg, #19E3D1, #00C2FF)"
                            : "rgba(255,255,255,0.08)",
                        color: text.trim() && !sending ? "#0B0F14" : "var(--text-muted)",
                    }}
                >
                    {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
