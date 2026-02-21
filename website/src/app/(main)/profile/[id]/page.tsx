"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, UserCheck, UserPlus, Loader2, MessageSquare } from "lucide-react";
import PostCard from "@/components/features/PostCard";
import { getLevelTitle } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/Avatar";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuthStore();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [followStatus, setFollowStatus] = useState<"none" | "following" | "requested">("none");
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    const isOwnProfile = currentUser?.id === id || currentUser?._id === id;

    useEffect(() => {
        if (!id || isOwnProfile) return;
        const fetchProfile = async () => {
            try {
                const [profileData, postsData, follows] = await Promise.all([
                    apiClient.get<any>(`/api/users/${id}`),
                    // Use userId filter so we only get THIS user's posts
                    apiClient.get<any>("/api/books", { page: 1, limit: 50, userId: id }),
                    apiClient.get<any>(`/api/social/follow-counts/${id}`),
                ]);
                const p = profileData.user || profileData;
                setProfile({ ...p, ...follows });
                setPosts(postsData.books || []);
                setFollowStatus(
                    profileData.isFollowing ? "following" :
                        profileData.hasRequestedFollow ? "requested" : "none"
                );
            } catch {
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    if (isOwnProfile) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="mb-4" style={{ color: "var(--text-secondary)" }}>This is your profile</p>
                    <Link href="/profile" className="btn-primary">Go to My Profile</Link>
                </div>
            </div>
        );
    }

    const handleFollow = async () => {
        setFollowLoading(true);
        try {
            const res = await apiClient.post<any>(`/api/social/follow/${id}`);
            const status = res.status;
            if (status === "accepted") setFollowStatus("following");
            else if (status === "pending") setFollowStatus("requested");
            else setFollowStatus("none");
        } catch {
            toast.error("Action failed");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-4xl">👤</p>
                <p style={{ color: "var(--text-secondary)" }}>User not found</p>
                <Link href="/explore" className="btn-primary">Back to Explore</Link>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Back Header */}
                <div
                    className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
                    style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
                >
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                        <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                    </button>
                    <p className="font-black" style={{ color: "var(--text-primary)" }}>{profile.username}</p>
                </div>

                {/* Banner */}
                <div
                    className="relative h-32 sm:h-44"
                    style={{ background: "linear-gradient(135deg, rgba(25,227,209,0.12), rgba(0,194,255,0.08))" }}
                >
                    {profile.profileBanner && (
                        <Image src={profile.profileBanner} alt="banner" fill className="object-cover opacity-60" unoptimized />
                    )}
                </div>

                <div className="px-4 sm:px-6">
                    {/* Avatar + Actions Row */}
                    <div className="flex items-end justify-between -mt-10 mb-4">
                        <Avatar
                            src={profile.profileImage}
                            name={profile.username}
                            size={80}
                            style={{ border: "3px solid var(--background)", boxShadow: "0 0 0 2px rgba(25,227,209,0.4)" }}
                        />

                        <div className="flex items-center gap-2 mb-1">
                            {/* Message button */}
                            <Link
                                href={`/messages/${id}`}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold btn-secondary"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span className="hidden sm:inline">Message</span>
                            </Link>

                            {/* Follow button */}
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${followStatus === "following" ? "btn-secondary" : "btn-primary"}`}
                            >
                                {followLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : followStatus === "following" ? (
                                    <><UserCheck className="w-4 h-4" /> Following</>
                                ) : followStatus === "requested" ? (
                                    "Requested"
                                ) : (
                                    <><UserPlus className="w-4 h-4" /> Follow</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <h2 className="text-xl font-black mb-0.5" style={{ color: "var(--text-primary)" }}>{profile.username}</h2>
                    {profile.bio && (
                        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.bio}</p>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                        <span className="tag">Lv.{profile.level || 1} — {getLevelTitle(profile.level || 1)}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="glass-card p-3 text-center">
                            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                {profile.followersCount || 0}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Followers</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                                {profile.followingCount || 0}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Following</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>
                                {profile.currentStreak || 0}🔥
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Streak</p>
                        </div>
                    </div>

                    {/* Posts Header */}
                    <div className="mb-2 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
                        <p className="text-xs font-black uppercase tracking-widest mt-3 mb-0" style={{ color: "var(--text-muted)" }}>
                            Posts · {posts.length}
                        </p>
                    </div>
                </div>

                {/* Posts */}
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-2">📖</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No posts yet</p>
                    </div>
                )}

                <div className="h-8" />
            </div>
        </div>
    );
}
