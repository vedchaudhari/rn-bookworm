"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import PostCard from "@/components/features/PostCard";
import { Loader2, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function FeedPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "following">("all");

    const fetchPosts = useCallback(async (pageNum = 1, tab = activeTab, reset = false) => {
        try {
            if (pageNum === 1) reset ? setRefreshing(true) : setLoading(true);
            else setLoadingMore(true);

            const endpoint = tab === "following" ? "/api/books/following" : "/api/books";
            const data = await apiClient.get<any>(endpoint, { page: pageNum, limit: 10 });

            setPosts((prev) => {
                const incoming = data.books || [];
                const combined = pageNum === 1 ? incoming : [...prev, ...incoming];
                const unique = Array.from(new Map(combined.map((b: any) => [b._id, b])).values());
                return unique;
            });

            setHasMore(pageNum < (data.totalPages || 1));
            setPage(pageNum);
        } catch (e) {
            console.error("Feed fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchPosts(1, activeTab, true);
    }, [activeTab]);

    const handleTabChange = (tab: "all" | "following") => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setPage(1);
    };

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (
            el.scrollHeight - el.scrollTop <= el.clientHeight + 300 &&
            hasMore &&
            !loadingMore &&
            !loading
        ) {
            fetchPosts(page + 1, activeTab);
        }
    }, [hasMore, loadingMore, loading, page, activeTab, fetchPosts]);

    const Skeleton = () => (
        <div className="glass-card mx-4 mt-2 overflow-hidden">
            <div className="skeleton w-full h-48" />
            <div className="p-4 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-full" />
                <div className="flex items-center gap-3 mt-3">
                    <div className="skeleton w-8 h-8 rounded-full" />
                    <div className="space-y-2">
                        <div className="skeleton h-3 w-24" />
                        <div className="skeleton h-2 w-16" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-screen overflow-y-auto" onScroll={handleScroll}>
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 px-4 pt-6 pb-4"
                style={{
                    background: "rgba(11,15,20,0.9)",
                    backdropFilter: "blur(20px)",
                    borderBottom: "1px solid var(--glass-border)",
                }}
            >
                <h1 className="section-header mb-1">Feed</h1>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Curated stories for your shelf</p>

                {/* Tabs */}
                <div className="flex gap-2">
                    {[
                        { key: "all", label: "All Books", icon: Globe },
                        { key: "following", label: "Following", icon: Users },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => handleTabChange(key as any)}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all"
                            style={
                                activeTab === key
                                    ? {
                                        background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                                        color: "#0B0F14",
                                    }
                                    : {
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: "var(--text-secondary)",
                                    }
                            }
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="py-2">
                {loading ? (
                    <>
                        <Skeleton />
                        <Skeleton />
                        <Skeleton />
                    </>
                ) : posts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center px-6"
                    >
                        <div className="text-6xl mb-4">📚</div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                            No posts yet
                        </h3>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {activeTab === "following"
                                ? "Follow more readers to see their posts here"
                                : "Be the first to share a book recommendation!"}
                        </p>
                    </motion.div>
                ) : (
                    <>
                        {posts.map((post, i) => (
                            <motion.div
                                key={post._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i < 5 ? i * 0.05 : 0 }}
                            >
                                <PostCard
                                    post={post}
                                    onDelete={(id) => setPosts((p) => p.filter((b) => b._id !== id))}
                                />
                            </motion.div>
                        ))}
                        {loadingMore && (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
