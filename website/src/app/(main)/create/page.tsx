"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Image as ImageIcon, Star, Loader2, X, Upload, Tag, User as AuthorIcon, Hash } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [caption, setCaption] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image must be under 10MB");
            return;
        }
        setImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        }
    };

    const addTag = () => {
        const cleaned = tagInput.trim().replace(/^#+/, "").toLowerCase();
        if (cleaned && !tags.includes(cleaned) && tags.length < 10) {
            setTags((prev) => [...prev, cleaned]);
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return toast.error("Title is required");
        if (!caption.trim()) return toast.error("Caption is required");
        if (rating === 0) return toast.error("Please select a rating");
        if (!image) return toast.error("Please select a book cover image");

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("caption", caption.trim());
            formData.append("rating", rating.toString());
            formData.append("image", image);
            if (author.trim()) formData.append("author", author.trim());
            tags.forEach((tag) => formData.append("tags[]", tag));

            await apiClient.post("/api/books", formData);
            toast.success("Book shared successfully! 📚");
            router.push("/feed");
        } catch (error: any) {
            toast.error(error.message || "Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Amazing"];

    return (
        <div className="h-screen overflow-y-auto">
            <div
                className="sticky top-0 z-20 px-4 pt-6 pb-4"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
            >
                <h1 className="section-header mb-1">Share a Book</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Recommend a book to the community</p>
            </div>

            <div className="px-4 py-6 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Book Cover *
                        </label>
                        <label className="block cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            <motion.div
                                whileHover={{ borderColor: "rgba(25,227,209,0.5)" }}
                                className="relative w-full h-52 rounded-2xl overflow-hidden flex items-center justify-center"
                                style={{
                                    border: "2px dashed rgba(25,227,209,0.2)",
                                    background: imagePreview ? "transparent" : "rgba(255,255,255,0.02)",
                                    transition: "border-color 0.2s",
                                }}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(null); }}
                                            className="absolute top-3 right-3 p-1.5 rounded-full shadow-lg"
                                            style={{ background: "rgba(0,0,0,0.65)" }}
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                                            style={{ background: "rgba(25,227,209,0.1)" }}
                                        >
                                            <Upload className="w-6 h-6" style={{ color: "var(--primary)" }} />
                                        </div>
                                        <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                                            Click to upload cover image
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                            PNG, JPG up to 10MB
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </label>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Book Title *
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. The Midnight Library"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* Author */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Author
                        </label>
                        <div className="relative">
                            <AuthorIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                            <input
                                type="text"
                                className="input-field pl-11"
                                placeholder="Author name"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* Caption / Review */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Your Review *
                        </label>
                        <textarea
                            className="input-field min-h-32 resize-none"
                            placeholder="Share your thoughts about this book..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            maxLength={1000}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>
                            {caption.length}/1000
                        </p>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                            Your Rating *
                        </label>
                        <div className="flex items-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition-transform hover:scale-125 active:scale-110"
                                >
                                    <Star
                                        className={`w-9 h-9 transition-all ${star <= (hoverRating || rating) ? "star-filled fill-current" : "star-empty"}`}
                                    />
                                </button>
                            ))}
                            {(hoverRating || rating) > 0 && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-sm font-bold"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {RATING_LABELS[hoverRating || rating]}
                                </motion.span>
                            )}
                        </div>
                    </div>

                    {/* Tags / Hashtags */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Tags <span style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                        </label>

                        {/* Tag pills */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <AnimatePresence>
                                    {tags.map((tag) => (
                                        <motion.span
                                            key={tag}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                            style={{
                                                background: "rgba(25,227,209,0.1)",
                                                border: "1px solid rgba(25,227,209,0.25)",
                                                color: "var(--primary)",
                                            }}
                                        >
                                            #{tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.span>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--primary)" }} />
                            <input
                                type="text"
                                className="input-field pl-11 pr-14"
                                placeholder="e.g. fiction, mystery (press Enter)"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                disabled={tags.length >= 10}
                            />
                            {tagInput.trim() && (
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg"
                                    style={{ background: "rgba(25,227,209,0.15)", color: "var(--primary)" }}
                                >
                                    Add
                                </button>
                            )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            Press Enter or comma to add · {tags.length}/10
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <ImageIcon className="w-5 h-5" />
                                Share Book
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
