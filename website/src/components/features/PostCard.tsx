"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Star, MoreHorizontal, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Post {
    _id: string;
    title: string;
    caption: string;
    image: string;
    rating: number;
    createdAt: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
    likeCount?: number;
    commentCount?: number;
    user: {
        _id: string;
        username: string;
        profileImage: string;
    };
}

interface Props {
    post: Post;
    onDelete?: (id: string) => void;
}

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    className={`w-3 h-3 ${i <= rating ? "star-filled fill-current" : "star-empty"}`}
                />
            ))}
        </div>
    );
}

export default function PostCard({ post, onDelete }: Props) {
    const { user } = useAuthStore();
    const [liked, setLiked] = useState(!!post.isLiked);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [bookmarked, setBookmarked] = useState(!!post.isBookmarked);
    const [showMenu, setShowMenu] = useState(false);
    const isOwner = user?.id === post.user?._id || user?._id === post.user?._id;

    const handleLike = async () => {
        const prev = liked;
        setLiked(!liked);
        setLikeCount((c) => (liked ? c - 1 : c + 1));
        try {
            await apiClient.post(`/api/social/like/${post._id}`);
        } catch {
            setLiked(prev);
            setLikeCount((c) => (prev ? c + 1 : c - 1));
        }
    };

    const handleDelete = async () => {
        try {
            await apiClient.delete(`/api/books/${post._id}`);
            toast.success("Post deleted");
            onDelete?.(post._id);
        } catch {
            toast.error("Failed to delete");
        }
        setShowMenu(false);
    };

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card overflow-hidden mb-4 mx-4 mt-2"
        >
            {/* Book Image */}
            {post.image && (
                <div className="relative w-full h-48 sm:h-64 overflow-hidden">
                    <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 640px"
                        unoptimized
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(11,15,20,0.9) 0%, transparent 60%)" }} />

                    {/* Title + rating on image */}
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-lg font-black text-white leading-tight mb-1 line-clamp-2">
                            {post.title}
                        </h2>
                        <Stars rating={post.rating} />
                    </div>

                    {/* Owner menu */}
                    {isOwner && (
                        <div className="absolute top-3 right-3">
                            <button
                                onClick={() => setShowMenu((s) => !s)}
                                className="p-2 rounded-xl"
                                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
                            >
                                <MoreHorizontal className="w-5 h-5 text-white" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute top-full right-0 mt-1 rounded-2xl p-1 min-w-36"
                                        style={{ background: "rgba(14,27,36,0.97)", border: "1px solid var(--glass-border)" }}
                                    >
                                        <button
                                            onClick={handleDelete}
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors"
                                            style={{ color: "var(--error)" }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}

            <div className="p-4">
                {/* Caption */}
                {post.caption && (
                    <p className="text-sm mb-4 line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                        {post.caption}
                    </p>
                )}

                {/* User + Interactions Row */}
                <div className="flex items-center justify-between">
                    {/* User */}
                    <Link href={`/profile/${post.user?._id}`} className="flex items-center gap-2 group">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                            style={{ border: "1.5px solid rgba(25,227,209,0.3)" }}>
                            {post.user?.profileImage ? (
                                <Image src={post.user.profileImage} alt={post.user.username} fill className="object-cover" unoptimized />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-black"
                                    style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}>
                                    {post.user?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors"
                                style={{ color: "var(--text-primary)" }}>
                                {post.user?.username}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {formatDate(post.createdAt)}
                            </p>
                        </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleLike}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
                            style={{
                                background: liked ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${liked ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                            }}
                        >
                            <Heart
                                className={`w-4 h-4 transition-all ${liked ? "fill-current" : ""}`}
                                style={{ color: liked ? "#EF4444" : "var(--text-muted)" }}
                            />
                            {likeCount > 0 && (
                                <span className="text-xs font-bold" style={{ color: liked ? "#EF4444" : "var(--text-muted)" }}>
                                    {likeCount}
                                </span>
                            )}
                        </button>

                        <Link
                            href={`/book/${post._id}`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                            <MessageCircle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                            {(post.commentCount || 0) > 0 && (
                                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                                    {post.commentCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}
