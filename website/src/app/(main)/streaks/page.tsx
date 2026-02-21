"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Flame, Trophy, Target, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

export default function StreaksPage() {
    const { user, refreshUser } = useAuthStore();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingToday, setLoggingToday] = useState(false);
    const [todayLogged, setTodayLogged] = useState(false);

    useEffect(() => {
        const fetchStreaks = async () => {
            try {
                const data = await apiClient.get<any>("/api/streaks/leaderboard");
                setLeaderboard(data.leaderboard || data || []);
            } catch { }
            setLoading(false);
        };
        fetchStreaks();
    }, []);

    const handleLogToday = async () => {
        setLoggingToday(true);
        try {
            await apiClient.post("/api/reading-sessions", { duration: 30 });
            setTodayLogged(true);
            toast.success("Reading session logged! 🔥 Streak updated");
            await refreshUser?.();
        } catch (e: any) {
            toast.error(e?.message || "Could not log session");
        } finally {
            setLoggingToday(false);
        }
    };

    const currentStreak = user?.currentStreak || 0;
    const longestStreak = user?.longestStreak || 0;
    const points = user?.points || 0;
    const level = user?.level || 1;

    const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                <div
                    className="sticky top-0 z-20 px-4 pt-6 pb-4"
                    style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
                >
                    <h1 className="section-header mb-0.5">Streaks & Progress</h1>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keep reading every day</p>
                </div>

                <div className="px-4 py-6 space-y-6">
                    {/* Current Streak Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 text-center"
                        style={{ borderColor: currentStreak > 0 ? "rgba(255,149,0,0.35)" : undefined }}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-7xl mb-3"
                        >
                            🔥
                        </motion.div>
                        <p className="text-6xl font-black mb-1" style={{ color: "var(--primary)" }}>
                            {currentStreak}
                        </p>
                        <p className="text-lg font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
                            Day{currentStreak !== 1 ? "s" : ""} 🔥 Streak
                        </p>
                        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                            Longest streak: <strong style={{ color: "var(--text-primary)" }}>{longestStreak} days</strong>
                        </p>

                        {/* Log Today Button */}
                        {todayLogged ? (
                            <div
                                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Logged for today!
                            </div>
                        ) : (
                            <button
                                onClick={handleLogToday}
                                disabled={loggingToday}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loggingToday ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <BookOpen className="w-5 h-5" />
                                        Log Reading Today (+30 min)
                                    </>
                                )}
                            </button>
                        )}
                    </motion.div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/reading-stats" className="glass-card p-4 text-center hover:border-primary/30 transition-all">
                            <Trophy className="w-6 h-6 mx-auto mb-2" style={{ color: "#FFD700" }} />
                            <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{points}</p>
                            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Points</p>
                        </Link>
                        <Link href="/reading-stats" className="glass-card p-4 text-center hover:border-primary/30 transition-all">
                            <Target className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--primary)" }} />
                            <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Lv.{level}</p>
                            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Current Level</p>
                        </Link>
                    </div>

                    {/* Level Progress */}
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Level {level}</p>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Level {level + 1}</p>
                        </div>
                        <div className="progress-bar h-3 mb-2">
                            <div className="progress-fill" style={{ width: `${(points % 100)}%` }} />
                        </div>
                        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                            {100 - (points % 100)} points to next level
                        </p>
                    </div>

                    {/* Streak Milestones */}
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                            Streak Milestones
                        </h2>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {STREAK_MILESTONES.map((milestone, i) => {
                                const achieved = longestStreak >= milestone;
                                return (
                                    <motion.div
                                        key={milestone}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        whileHover={{ scale: 1.08 }}
                                        className="glass-card p-3 text-center aspect-square flex flex-col items-center justify-center"
                                        style={achieved ? {
                                            background: "rgba(25,227,209,0.1)",
                                            borderColor: "rgba(25,227,209,0.4)",
                                        } : {}}
                                    >
                                        <p className="text-lg mb-0.5">{achieved ? "🏆" : "🔒"}</p>
                                        <p className="text-xs font-black" style={{ color: achieved ? "var(--primary)" : "var(--text-muted)" }}>
                                            {milestone}d
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    {!loading && leaderboard.length > 0 && (
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                                🏆 Streak Leaderboard
                            </h2>
                            <div className="space-y-2">
                                {leaderboard.slice(0, 10).map((entry: any, i: number) => (
                                    <Link key={entry._id || i} href={`/profile/${entry.user?._id || entry._id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="glass-card flex items-center gap-3 p-3 transition-all hover:border-primary/30 cursor-pointer"
                                            style={i === 0 ? { borderColor: "rgba(255,215,0,0.4)" } : i === 1 ? { borderColor: "rgba(192,192,192,0.3)" } : i === 2 ? { borderColor: "rgba(205,127,50,0.3)" } : {}}
                                        >
                                            <div className="w-8 text-center">
                                                <span className="text-lg">{["🥇", "🥈", "🥉"][i] || `${i + 1}.`}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                                    {entry.username || entry.user?.username}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Flame className="w-4 h-4" style={{ color: "#FF9500" }} />
                                                <p className="text-sm font-black" style={{ color: "#FF9500" }}>
                                                    {entry.currentStreak || entry.streak}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
