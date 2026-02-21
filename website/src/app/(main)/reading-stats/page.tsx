"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { BarChart2, BookOpen, Clock, Flame, Loader2, Calendar, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function ReadingStatsPage() {
    const [stats, setStats] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsData, sessionData] = await Promise.all([
                    apiClient.get<any>("/api/reading-sessions/stats"),
                    apiClient.get<any>("/api/reading-sessions", { limit: 30 }),
                ]);
                setStats(statsData.stats || statsData);
                setSessions(sessionData.sessions || []);
            } catch (e) {
                console.error("Stats fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Build last-7-days reading map for calendar
    const buildWeeklyData = () => {
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            return {
                label: d.toLocaleDateString("en", { weekday: "short" }),
                date: d.toISOString().split("T")[0],
                minutes: 0,
            };
        });
        sessions.forEach((s: any) => {
            const date = new Date(s.createdAt).toISOString().split("T")[0];
            const day = days.find((d) => d.date === date);
            if (day) day.minutes += s.duration || 0;
        });
        return days;
    };

    const weeklyData = buildWeeklyData();
    const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 1);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    const totalMinutes = stats?.totalReadingTime || 0;
    const totalHours = Math.floor(totalMinutes / 60);
    const totalSessions = stats?.totalSessions || sessions.length;
    const booksRead = stats?.booksCompleted || 0;
    const avgSessionMins = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Header */}
                <div
                    className="sticky top-0 z-20 px-4 pt-6 pb-4"
                    style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
                >
                    <h1 className="section-header mb-1">Reading Stats</h1>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Your reading journey at a glance</p>
                </div>

                <div className="px-4 py-6 space-y-6">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Clock, label: "Hours Read", value: totalHours, color: "var(--primary)", unit: "hrs" },
                            { icon: BookOpen, label: "Books Completed", value: booksRead, color: "#10B981", unit: "" },
                            { icon: BarChart2, label: "Sessions", value: totalSessions, color: "#FFD700", unit: "" },
                            { icon: Target, label: "Avg. Session", value: avgSessionMins, color: "var(--accent)", unit: "min" },
                        ].map(({ icon: Icon, label, value, color, unit }, i) => (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="glass-card p-4 text-center"
                            >
                                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color }} />
                                <p className="text-2xl font-black" style={{ color }}>
                                    {value}{unit && <span className="text-sm font-bold ml-0.5">{unit}</span>}
                                </p>
                                <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Weekly Reading Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.24 }}
                        className="glass-card p-5"
                    >
                        <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                            📅 Last 7 Days
                        </p>
                        <div className="flex items-end gap-2 h-28">
                            {weeklyData.map((day, i) => {
                                const pct = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
                                const isToday = i === 6;
                                return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                            {day.minutes > 0 ? `${day.minutes}m` : ""}
                                        </div>
                                        <div className="w-full rounded-t-lg relative" style={{ height: "80px" }}>
                                            <div
                                                className="absolute bottom-0 inset-x-0 rounded-t-lg transition-all duration-700"
                                                style={{
                                                    height: `${Math.max(pct, day.minutes > 0 ? 8 : 2)}%`,
                                                    background: isToday
                                                        ? "linear-gradient(to top, #19E3D1, #00C2FF)"
                                                        : day.minutes > 0
                                                            ? "rgba(25,227,209,0.35)"
                                                            : "rgba(255,255,255,0.05)",
                                                    boxShadow: isToday && day.minutes > 0 ? "0 0 10px rgba(25,227,209,0.4)" : "none",
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold" style={{ color: isToday ? "var(--primary)" : "var(--text-muted)" }}>
                                            {day.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Recent Sessions */}
                    {sessions.length > 0 && (
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                                Recent Sessions
                            </h2>
                            <div className="space-y-2">
                                {sessions.slice(0, 10).map((session: any, i: number) => (
                                    <motion.div
                                        key={session._id || i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="glass-card flex items-center gap-4 p-4"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(25,227,209,0.1)" }}
                                        >
                                            <BookOpen className="w-5 h-5" style={{ color: "var(--primary)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                                {session.bookId?.title || "Reading Session"}
                                            </p>
                                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                {new Date(session.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Clock className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                                            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                                {session.duration || 0}m
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sessions.length === 0 && (
                        <div className="glass-card p-8 text-center">
                            <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                            <p className="font-bold mb-1" style={{ color: "var(--text-secondary)" }}>No sessions yet</p>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                Log your first reading session from the Bookshelf
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
