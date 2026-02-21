"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, MessageCircle, Star, MoreHorizontal, Trash2, Bookmark } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";

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
    tags?: string[];
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

    const handleBookmark = async () => {
        const prev = bookmarked;
        setBookmarked(!bookmarked);
        try {
            await apiClient.post(`/api/social/bookmark/${post._id}`);
            toast.success(prev ? "Removed from bookmarks" : "Bookmarked!");
        } catch {
            setBookmarked(prev);
            toast.error("Failed to update bookmark");
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
            className="glass-card overflow-hidden mb-6 group hover:border-primary/20 transition-all duration-300"
        >
            {/* Book Image */}
            {post.image && (
                <div className="relative w-full h-48 sm:h-64 overflow-hidden group/image">
                    <Link href={`/book/${post._id}`} className="block w-full h-full cursor-pointer">
                        <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover/image:scale-105"
                            sizes="(max-width: 768px) 100vw, 640px"
                            unoptimized
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

                        {/* Title + rating on image */}
                        <div className="absolute bottom-4 left-4 right-4 translate-y-2 group-hover/image:translate-y-0 transition-transform duration-300">
                            <h2 className="text-xl font-black text-white leading-tight mb-2 line-clamp-2 drop-shadow-lg group-hover/image:text-primary transition-colors">
                                {post.title}
                            </h2>
                            <Stars rating={post.rating} />
                        </div>
                    </Link>

                    {/* Owner menu */}
                    {isOwner && (
                        <div className="absolute top-3 right-3 z-10">
                            <button
                                onClick={() => setShowMenu((s) => !s)}
                                className="p-2 rounded-xl bg-black/50 backdrop-blur-md hover:bg-black/70 transition-colors"
                            >
                                <MoreHorizontal className="w-5 h-5 text-white" />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute top-full right-0 mt-2 rounded-2xl p-1 w-32 bg-surface border border-glass-border shadow-2xl overflow-hidden"
                                    >
                                        <button
                                            onClick={handleDelete}
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors text-error hover:bg-error/10"
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

            <div className="p-5">
                {/* Caption */}
                {post.caption && (
                    <p className="text-sm mb-3 line-clamp-3 text-text-secondary leading-relaxed">
                        {post.caption}
                    </p>
                )}

                {/* Hashtags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                style={{
                                    background: "rgba(25,227,209,0.08)",
                                    border: "1px solid rgba(25,227,209,0.2)",
                                    color: "var(--primary)",
                                }}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* User + Interactions Row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    {/* User */}
                    <Link href={`/profile/${post.user?._id}`} className="flex items-center gap-3 group/user">
                        <Avatar
                            src={post.user?.profileImage}
                            name={post.user?.username}
                            size={36}
                            style={{ border: "1.5px solid rgba(25,227,209,0.3)" }}
                        />
                        <div>
                            <p className="text-sm font-bold text-text-primary group-hover/user:text-primary transition-colors">
                                {post.user?.username}
                            </p>
                            <p className="text-xs text-text-muted">
                                {formatDate(post.createdAt)}
                            </p>
                        </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border ${liked
                                ? "bg-error/10 border-error/30 text-error"
                                : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                                }`}
                        >
                            <Heart
                                className={`w-4 h-4 transition-transform ${liked ? "fill-current scale-110" : "scale-100"}`}
                            />
                            {likeCount > 0 && (
                                <span className="text-xs font-bold">
                                    {likeCount}
                                </span>
                            )}
                        </button>

                        {/* Comment */}
                        <Link
                            href={`/book/${post._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all bg-white/5 border border-white/10 text-text-muted hover:bg-white/10 hover:text-primary hover:border-primary/30"
                        >
                            <MessageCircle className="w-4 h-4" />
                            {(post.commentCount || 0) > 0 && (
                                <span className="text-xs font-bold">
                                    {post.commentCount}
                                </span>
                            )}
                        </Link>

                        {/* Bookmark */}
                        <button
                            onClick={handleBookmark}
                            className={`p-1.5 rounded-xl transition-all border ${bookmarked
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                                }`}
                        >
                            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}
