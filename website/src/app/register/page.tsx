"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Mail, Lock, Eye, EyeOff, User, BookOpen, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { register, isLoading } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !username || !password) {
            toast.error("All fields are required");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (username.length < 3) {
            toast.error("Username must be at least 3 characters");
            return;
        }
        const result = await register(email.trim().toLowerCase(), username.trim(), password);
        if (result.success) {
            toast.success("Account created! Welcome to Bookworm 📚");
            router.push("/feed");
        } else {
            toast.error(result.error || "Registration failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                    style={{ background: "radial-gradient(circle, rgba(0,194,255,0.4), transparent)" }} />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
                    style={{ background: "radial-gradient(circle, rgba(25,227,209,0.4), transparent)" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4"
                        style={{
                            background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                            boxShadow: "0 0 40px rgba(25,227,209,0.4)",
                        }}
                    >
                        <BookOpen className="w-10 h-10 text-[#0B0F14]" />
                    </motion.div>
                    <h1 className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
                        Start Your Journey 📚
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        Create your account and join the community
                    </p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--primary)" }} />
                                <input
                                    type="text"
                                    className="input-field pl-12"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--primary)" }} />
                                <input
                                    type="email"
                                    className="input-field pl-12"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--primary)" }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input-field pl-12 pr-12"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: "var(--text-muted)" }}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Already have an account?{" "}
                        </span>
                        <Link
                            href="/login"
                            className="text-sm font-bold transition-colors hover:opacity-80"
                            style={{ color: "var(--primary)" }}
                        >
                            Sign In
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
                    Bookworm — Reading reimagined
                </p>
            </motion.div>
        </div>
    );
}
