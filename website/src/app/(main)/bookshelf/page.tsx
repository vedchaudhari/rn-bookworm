"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { BookOpen, Star, Heart, Clock, CheckCircle, PauseCircle, XCircle, Library, Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { getStatusClass, getStatusLabel } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_TABS = [
    { key: "all", label: "All", icon: Library },
    { key: "currently_reading", label: "Reading", icon: BookOpen },
    { key: "want_to_read", label: "Want to Read", icon: Clock },
    { key: "completed", label: "Completed", icon: CheckCircle },
    { key: "paused", label: "Paused", icon: PauseCircle },
    { key: "dropped", label: "Dropped", icon: XCircle },
];

export default function BookshelfPage() {
    const [items, setItems] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");

    const fetchBookshelf = async (tab = activeTab) => {
        setLoading(true);
        try {
            const params: any = { limit: 50, offset: 0 };
            if (tab !== "all") params.status = tab;
            const data = await apiClient.get<any>("/api/bookshelf", params);
            setItems(data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await apiClient.get<any>("/api/bookshelf/stats");
            setStats(data.data);
        } catch { }
    };

    useEffect(() => {
        fetchBookshelf();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchBookshelf(activeTab);
    }, [activeTab]);

    const filtered = items.filter((item) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            item.bookId?.title?.toLowerCase().includes(q) ||
            item.bookId?.author?.toLowerCase().includes(q)
        );
    });

    const handleToggleFavorite = async (itemId: string) => {
        try {
            const res = await apiClient.patch<any>(`/api/bookshelf/${itemId}/favorite`);
            setItems((prev) => prev.map((i) => i._id === itemId ? { ...i, isFavorite: res.isFavorite } : i));
        } catch {
            toast.error("Failed to update favorite");
        }
    };

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Header */}
                <div className="sticky top-0 z-20 px-4 pt-6 pb-4"
                    style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
                    <h1 className="section-header mb-1">My Bookshelf</h1>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Your personal reading collection</p>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                                { label: "Total", value: stats.totalBooks || 0 },
                                { label: "Reading", value: stats.currentlyReading || 0 },
                                { label: "Done", value: stats.completed || 0 },
                            ].map(({ label, value }) => (
                                <div key={label} className="glass-card p-3 text-center">
                                    <p className="text-2xl font-black" style={{ color: "var(--primary)" }}>{value}</p>
                                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                        <input className="input-field pl-10 pr-8 text-sm" placeholder="Search books..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {STATUS_TABS.map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setActiveTab(key)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
                                style={activeTab === key
                                    ? { background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }
                                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }
                                }
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 py-4">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-5xl mb-4">📚</div>
                            <p className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                                {search ? "No books match your search" : "Your shelf is empty"}
                            </p>
                            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                                {!search && "Explore books and add them to your collection"}
                            </p>
                            {!search && (
                                <Link href="/explore" className="btn-primary inline-block">
                                    Browse Books
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {filtered.map((item, i) => (
                                    <motion.div
                                        key={item._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="glass-card"
                                    >
                                        <div className="flex gap-4 p-4">
                                            {/* Book Cover */}
                                            <Link href={`/book/${item.bookId?._id}`} className="flex-shrink-0">
                                                <div className="relative w-16 h-24 rounded-xl overflow-hidden"
                                                    style={{ border: "1px solid rgba(25,227,209,0.2)" }}>
                                                    {item.bookId?.image ? (
                                                        <Image src={item.bookId.image} alt={item.bookId.title} fill className="object-cover" unoptimized />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"
                                                            style={{ background: "linear-gradient(135deg, rgba(25,227,209,0.1), rgba(0,194,255,0.1))" }}>
                                                            <BookOpen className="w-6 h-6" style={{ color: "var(--primary)" }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <Link href={`/book/${item.bookId?._id}`}>
                                                        <h3 className="font-black text-sm line-clamp-1 hover:text-primary transition-colors"
                                                            style={{ color: "var(--text-primary)" }}>
                                                            {item.bookId?.title}
                                                        </h3>
                                                    </Link>
                                                    <button onClick={() => handleToggleFavorite(item._id)} className="flex-shrink-0 mt-0.5">
                                                        <Heart className={`w-4 h-4 transition-colors ${item.isFavorite ? "fill-current" : ""}`}
                                                            style={{ color: item.isFavorite ? "#EF4444" : "var(--text-muted)" }} />
                                                    </button>
                                                </div>

                                                {item.bookId?.author && (
                                                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                                                        by {item.bookId.author}
                                                    </p>
                                                )}

                                                <span className={`tag text-xs ${getStatusClass(item.status)}`}>
                                                    {getStatusLabel(item.status)}
                                                </span>

                                                {/* Progress Bar */}
                                                {item.status === "currently_reading" && item.progress?.currentPage > 0 && (
                                                    <div className="mt-2">
                                                        <div className="progress-bar h-1.5">
                                                            <div
                                                                className="progress-fill h-full"
                                                                style={{
                                                                    width: `${Math.min(100, (item.progress.currentPage / (item.progress.totalPages || item.bookId?.totalPages || 1)) * 100)}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                                            Page {item.progress.currentPage} / {item.progress.totalPages || item.bookId?.totalPages || "?"}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Rating */}
                                                {item.rating && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} className={`w-3 h-3 ${s <= item.rating ? "star-filled fill-current" : "star-empty"}`} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
