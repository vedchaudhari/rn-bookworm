"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Image as ImageIcon, Star, Loader2, X, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [caption, setCaption] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

            await apiClient.post("/api/books", formData);
            toast.success("Book shared successfully! 📚");
            router.push("/feed");
        } catch (error: any) {
            toast.error(error.message || "Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-y-auto">
            <div className="sticky top-0 z-20 px-4 pt-6 pb-4"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
                <h1 className="section-header mb-1">Share a Book</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Recommend a book to the community</p>
            </div>

            <div className="px-4 py-6 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                            Book Cover *
                        </label>
                        <label className="block cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            <motion.div
                                whileHover={{ borderColor: "rgba(25,227,209,0.5)" }}
                                className="relative w-full h-48 rounded-2xl overflow-hidden flex items-center justify-center"
                                style={{
                                    border: "2px dashed rgba(25,227,209,0.2)",
                                    background: imagePreview ? "transparent" : "rgba(255,255,255,0.02)",
                                }}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(null); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full"
                                            style={{ background: "rgba(0,0,0,0.6)" }}
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--primary)" }} />
                                        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
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
                            placeholder="Enter the book title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* Caption */}
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
                                    className="transition-transform hover:scale-125"
                                >
                                    <Star
                                        className={`w-8 h-8 transition-all ${star <= (hoverRating || rating) ? "star-filled fill-current" : "star-empty"}`}
                                    />
                                </button>
                            ))}
                            {rating > 0 && (
                                <span className="ml-2 text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                                    {["", "Poor", "Fair", "Good", "Great", "Amazing"][rating]}
                                </span>
                            )}
                        </div>
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
