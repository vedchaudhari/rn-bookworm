"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, BookPlus, Star, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
    { value: "want_to_read", label: "Want to Read" },
    { value: "currently_reading", label: "Currently Reading" },
    { value: "completed", label: "Completed" },
    { value: "paused", label: "Paused" },
    { value: "dropped", label: "Dropped" },
];

export default function BookDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuthStore();
    const [book, setBook] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [comment, setComment] = useState("");
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [commenting, setCommenting] = useState(false);
    const [showAddToShelf, setShowAddToShelf] = useState(false);
    const [addingToShelf, setAddingToShelf] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchBook = async () => {
            try {
                const [bookData, commentsData] = await Promise.all([
                    apiClient.get<any>(`/api/books/${id}`),
                    apiClient.get<any>(`/api/social/comments/${id}`),
                ]);
                setBook(bookData.book || bookData);
                setLiked(bookData.book?.isLiked || bookData.isLiked || false);
                setLikeCount(bookData.book?.likeCount || bookData.likeCount || 0);
                setComments(commentsData.comments || commentsData || []);
            } catch (e) {
                toast.error("Failed to load book");
            } finally {
                setLoading(false);
            }
        };
        fetchBook();
    }, [id]);

    const handleLike = async () => {
        const prev = liked;
        setLiked(!liked);
        setLikeCount((c) => (!liked ? c + 1 : c - 1));
        try {
            await apiClient.post(`/api/social/like/${id}`);
        } catch {
            setLiked(prev);
            setLikeCount((c) => (prev ? c + 1 : c - 1));
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setCommenting(true);
        try {
            const data = await apiClient.post<any>(`/api/social/comment/${id}`, { comment: comment.trim() });
            const newComment = data.comment || {
                _id: Date.now().toString(),
                comment: comment.trim(),
                user: { _id: user?.id, username: user?.username, profileImage: user?.profileImage },
                createdAt: new Date().toISOString(),
            };
            setComments((prev) => [newComment, ...prev]);
            setComment("");
        } catch {
            toast.error("Failed to post comment");
        } finally {
            setCommenting(false);
        }
    };

    const handleAddToShelf = async (status: string) => {
        setAddingToShelf(true);
        try {
            await apiClient.post("/api/bookshelf", { bookId: id, status });
            toast.success(`Added to ${STATUS_OPTIONS.find((s) => s.value === status)?.label}!`);
            setShowAddToShelf(false);
        } catch (e: any) {
            toast.error(e.message || "Could not add to shelf");
        } finally {
            setAddingToShelf(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }
    if (!book) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-4xl">📖</p>
            <p style={{ color: "var(--text-secondary)" }}>Book not found</p>
            <Link href="/feed" className="btn-primary">Back to Feed</Link>
        </div>
    );

    return (
        <div className="h-screen overflow-y-auto">
            {/* Back Button */}
            <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
                <Link href="/feed" className="p-2 rounded-xl transition-colors" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </Link>
                <h1 className="text-lg font-black truncate" style={{ color: "var(--text-primary)" }}>
                    {book.title}
                </h1>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Hero Image */}
                {book.image && (
                    <div className="relative w-full h-72 sm:h-96 overflow-hidden">
                        <Image src={book.image} alt={book.title} fill className="object-cover" unoptimized sizes="100vw" />
                        <div className="absolute inset-0"
                            style={{ background: "linear-gradient(to top, var(--background) 0%, transparent 60%)" }} />
                    </div>
                )}

                <div className="px-4 pt-4">
                    {/* Header */}
                    <h2 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                        {book.title}
                    </h2>

                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-4 h-4 ${s <= book.rating ? "star-filled fill-current" : "star-empty"}`} />
                        ))}
                        <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>({book.rating}/5)</span>
                    </div>

                    {/* Caption */}
                    {book.caption && (
                        <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {book.caption}
                        </p>
                    )}

                    {/* Author + Actions Row */}
                    <div className="flex items-center justify-between mb-5">
                        <Link href={`/profile/${book.user?._id}`} className="flex items-center gap-2 group">
                            <div className="relative w-9 h-9 rounded-full overflow-hidden"
                                style={{ border: "1.5px solid rgba(25,227,209,0.3)" }}>
                                {book.user?.profileImage ? (
                                    <Image src={book.user.profileImage} alt={book.user.username} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-black"
                                        style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}>
                                        {book.user?.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{book.user?.username}</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(book.createdAt)}</p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Like */}
                            <button onClick={handleLike}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                                style={{
                                    background: liked ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                                    border: `1px solid ${liked ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                                }}>
                                <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} style={{ color: liked ? "#EF4444" : "var(--text-muted)" }} />
                                <span className="text-sm font-bold" style={{ color: liked ? "#EF4444" : "var(--text-muted)" }}>
                                    {likeCount}
                                </span>
                            </button>

                            {/* Add to Shelf */}
                            <div className="relative">
                                <button onClick={() => setShowAddToShelf((s) => !s)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                                    style={{ background: "rgba(25,227,209,0.08)", border: "1px solid rgba(25,227,209,0.2)" }}>
                                    <BookPlus className="w-4 h-4" style={{ color: "var(--primary)" }} />
                                    <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>Add</span>
                                </button>
                                {showAddToShelf && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="absolute top-full right-0 mt-1 rounded-2xl overflow-hidden z-10 min-w-44"
                                        style={{ background: "rgba(14,27,36,0.97)", border: "1px solid var(--glass-border)" }}
                                    >
                                        {STATUS_OPTIONS.map((opt) => (
                                            <button key={opt.value} onClick={() => handleAddToShelf(opt.value)}
                                                disabled={addingToShelf}
                                                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                                                style={{ color: "var(--text-secondary)" }}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="mb-4" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "16px" }}>
                        <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                            {comments.length} Comment{comments.length !== 1 ? "s" : ""}
                        </h3>

                        {/* Comment Input */}
                        <form onSubmit={handleComment} className="flex gap-2 mb-5">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                                style={{ border: "1.5px solid rgba(25,227,209,0.3)" }}>
                                {user?.profileImage ? (
                                    <Image src={user.profileImage} alt={user.username} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black"
                                        style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}>
                                        {user?.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex gap-2">
                                <input
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="input-field text-sm flex-1 py-2"
                                    placeholder="Add a comment..."
                                />
                                <button type="submit" disabled={commenting || !comment.trim()}
                                    className="btn-primary py-2 px-3 text-sm flex items-center gap-1">
                                    {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>

                        {/* Comments List */}
                        <div className="space-y-3">
                            {comments.map((c: any) => (
                                <div key={c._id} className="flex gap-3">
                                    <Link href={`/profile/${c.user?._id}`} className="flex-shrink-0">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden"
                                            style={{ border: "1px solid rgba(25,227,209,0.2)" }}>
                                            {c.user?.profileImage ? (
                                                <Image src={c.user.profileImage} alt={c.user.username} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-black"
                                                    style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}>
                                                    {c.user?.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <Link href={`/profile/${c.user?._id}`}>
                                                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                                    {c.user?.username}
                                                </span>
                                            </Link>
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                {formatDate(c.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{c.comment}</p>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                                    Be the first to comment!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
