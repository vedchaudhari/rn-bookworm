"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import PostCard from "@/components/features/PostCard";
import { Search, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function ExplorePage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"books" | "users">("books");
    const [trending, setTrending] = useState<any[]>([]);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const data = await apiClient.get<any>("/api/books", { page: 1, limit: 12 });
                setTrending(data.books || []);
            } catch { }
        };
        fetchTrending();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                setUsers([]);
                return;
            }
            setLoading(true);
            try {
                if (tab === "books") {
                    const data = await apiClient.get<any>("/api/books/search", { query: query.trim() });
                    setResults(data.books || []);
                } else {
                    const data = await apiClient.get<any>("/api/users/search", { query: query.trim() });
                    setUsers(data.users || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [query, tab]);

    const searchActive = query.trim().length > 0;

    return (
        <div className="h-screen overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 px-4 pt-6 pb-4"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
                <h1 className="section-header mb-1">Explore</h1>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Discover books & readers</p>

                {/* Search Bar */}
                <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--primary)" }} />
                    <input
                        type="text"
                        className="input-field pl-12 pr-10"
                        placeholder={tab === "books" ? "Search books..." : "Search users..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-muted)" }}>
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {["books", "users"].map((t) => (
                        <button key={t} onClick={() => setTab(t as any)}
                            className="px-4 py-1.5 rounded-2xl text-sm font-bold capitalize transition-all"
                            style={tab === t
                                ? { background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }
                                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }
                            }
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="py-2">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                ) : searchActive ? (
                    tab === "books" ? (
                        results.length > 0 ? (
                            results.map((post, i) => (
                                <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                    <PostCard post={post} />
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-5xl mb-3">🔍</p>
                                <p className="font-bold" style={{ color: "var(--text-secondary)" }}>No books found</p>
                            </div>
                        )
                    ) : (
                        <div className="space-y-2 mx-4 mt-2">
                            {users.length > 0 ? users.map((u: any, i: number) => (
                                <motion.div key={u._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                    <Link href={`/profile/${u._id}`} className="glass-card flex items-center gap-3 p-4">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                                            style={{ border: "2px solid rgba(25,227,209,0.3)" }}>
                                            {u.profileImage ? (
                                                <Image src={u.profileImage} alt={u.username} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-sm font-black"
                                                    style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}>
                                                    {u.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold" style={{ color: "var(--text-primary)" }}>{u.username}</p>
                                            {u.bio && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{u.bio}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black neon-text">Lv.{u.level || 1}</p>
                                        </div>
                                    </Link>
                                </motion.div>
                            )) : (
                                <div className="text-center py-16">
                                    <p className="text-5xl mb-3">👤</p>
                                    <p className="font-bold" style={{ color: "var(--text-secondary)" }}>No users found</p>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    // Trending / All books
                    <div className="px-4">
                        <h2 className="text-sm font-black uppercase tracking-widest mb-3 mt-4" style={{ color: "var(--text-muted)" }}>
                            Trending Books
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {trending.map((post: any, i: number) => (
                                <motion.div
                                    key={post._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <Link href={`/book/${post._id}`} className="glass-card overflow-hidden block">
                                        <div className="relative w-full h-36">
                                            <Image src={post.image || ""} alt={post.title} fill className="object-cover" unoptimized
                                                onError={() => { }} />
                                            <div className="absolute inset-0"
                                                style={{ background: "linear-gradient(to top, rgba(11,15,20,0.9) 0%, transparent 50%)" }} />
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <p className="text-xs font-black text-white line-clamp-1">{post.title}</p>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1.5">
                                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                by @{post.user?.username}
                                            </p>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
