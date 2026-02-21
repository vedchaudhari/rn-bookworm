"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { BookOpen, Settings, Users, LogOut, Loader2, Flame, Trophy, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import PostCard from "@/components/features/PostCard";
import { getLevelTitle } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";

export default function ProfilePage() {
    const { user, logout, refreshUser } = useAuthStore();
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [followCounts, setFollowCounts] = useState({ followersCount: 0, followingCount: 0 });

    useEffect(() => {
        if (!user) return;
        const fetchProfileData = async () => {
            try {
                const userId = user.id || user._id;
                const [postsData, shelfStats, follows] = await Promise.all([
                    // Use userId filter to get only this user's posts correctly
                    apiClient.get<any>("/api/books", { page: 1, limit: 50, userId }),
                    apiClient.get<any>("/api/bookshelf/stats"),
                    apiClient.get<any>(`/api/social/follow-counts/${userId}`),
                ]);
                setPosts(postsData.books || []);
                setStats(shelfStats.data);
                setFollowCounts(follows);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user]);

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out");
        router.push("/login");
    };

    if (!user) return null;

    const level = user.level || 1;
    const levelProgress = ((user.points || 0) % 100);

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Banner */}
                <div
                    className="relative h-36 sm:h-52"
                    style={{ background: "linear-gradient(135deg, rgba(25,227,209,0.15), rgba(0,194,255,0.1))" }}
                >
                    {user.profileBanner && (
                        <Image src={user.profileBanner} alt="banner" fill className="object-cover opacity-70" unoptimized />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(25,227,209,0.12), transparent 70%)" }}
                    />
                </div>

                <div className="px-4 sm:px-6">
                    {/* Avatar & Actions Row */}
                    <div className="flex items-end justify-between -mt-12 mb-5">
                        <Avatar
                            src={user.profileImage}
                            name={user.username}
                            size={96}
                            style={{ border: "3px solid var(--background)", boxShadow: "0 0 0 2px rgba(25,227,209,0.4)" }}
                        />

                        <div className="flex gap-2 mb-1">
                            <Link href="/settings" className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-xl transition-colors"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* User Info */}
                    <h1 className="text-2xl font-black mb-0.5" style={{ color: "var(--text-primary)" }}>
                        {user.username}
                    </h1>
                    <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{user.email}</p>

                    {user.bio && (
                        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{user.bio}</p>
                    )}

                    {/* Level Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="tag">Lv.{level} — {getLevelTitle(level)}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {user.points || 0} pts
                        </span>
                    </div>

                    {/* Level Progress Bar */}
                    <div className="progress-bar h-2 mb-5">
                        <div className="progress-fill" style={{ width: `${levelProgress}%` }} />
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <Link
                            href={`/followers/${user.id || user._id}?tab=followers`}
                            className="glass-card p-3 text-center cursor-pointer hover:border-primary/30 transition-all"
                        >
                            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                {followCounts.followersCount}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Followers</p>
                        </Link>
                        <Link
                            href={`/followers/${user.id || user._id}?tab=following`}
                            className="glass-card p-3 text-center cursor-pointer hover:border-primary/30 transition-all"
                        >
                            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                {followCounts.followingCount}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Following</p>
                        </Link>
                        {stats && (
                            <>
                                <div className="glass-card p-3 text-center">
                                    <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                        {stats.totalBooks || 0}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Books</p>
                                </div>
                                <div className="glass-card p-3 text-center">
                                    <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                        {stats.completed || 0}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Completed</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Quick Stats Row */}
                    <div className="flex gap-3 mb-5">
                        {(user.currentStreak || 0) > 0 && (
                            <div
                                className="glass-card flex-1 px-4 py-3 flex items-center gap-3"
                                style={{ borderColor: "rgba(255,149,0,0.25)" }}
                            >
                                <Flame className="w-5 h-5 flex-shrink-0" style={{ color: "#FF9500" }} />
                                <div>
                                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                        {user.currentStreak} Day Streak
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        Best: {user.longestStreak} days
                                    </p>
                                </div>
                            </div>
                        )}
                        {(user.inkDrops ?? 0) > 0 && (
                            <div className="glass-card px-4 py-3 flex items-center gap-2">
                                <Droplets className="w-5 h-5" style={{ color: "var(--primary)" }} />
                                <div>
                                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                        {user.inkDrops || 0}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>InkDrops</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Posts Header */}
                    <div className="mb-4 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
                        <h2 className="text-sm font-black uppercase tracking-widest mt-3 mb-0" style={{ color: "var(--text-muted)" }}>
                            My Book Posts
                        </h2>
                    </div>
                </div>

                {/* Posts */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <p className="text-4xl mb-3">📖</p>
                        <p className="font-bold mb-1" style={{ color: "var(--text-secondary)" }}>No posts yet</p>
                        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                            Share your first book with the community
                        </p>
                        <Link href="/create" className="btn-primary inline-block text-sm">
                            Share First Book
                        </Link>
                    </div>
                ) : (
                    <div className="px-0 sm:px-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post._id}
                                post={post}
                                onDelete={(id) => setPosts((p) => p.filter((b) => b._id !== id))}
                            />
                        ))}
                    </div>
                )}

                <div className="h-8" />
            </div>
        </div>
    );
}
