"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Droplets, Gift, Loader2, CheckCircle, Lock, Trophy, Star } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function RewardsPage() {
    const { user, refreshUser } = useAuthStore();
    const [rewards, setRewards] = useState<any[]>([]);
    const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const data = await apiClient.get<any>("/api/gamification/rewards");
                setRewards(data.available || data.rewards || []);
                setClaimedRewards(data.claimed || []);
            } catch (e) {
                console.error("Rewards fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, []);

    const handleClaim = async (rewardId: string) => {
        setClaiming(rewardId);
        try {
            await apiClient.post<any>(`/api/gamification/rewards/${rewardId}/claim`);
            toast.success("Reward claimed! 🎉");
            // Refresh rewards and user balance
            const [data] = await Promise.all([
                apiClient.get<any>("/api/gamification/rewards"),
                refreshUser?.(),
            ]);
            setRewards(data.available || data.rewards || []);
            setClaimedRewards(data.claimed || []);
        } catch (e: any) {
            toast.error(e?.message || "Could not claim reward");
        } finally {
            setClaiming(null);
        }
    };

    const inkDrops = user?.inkDrops || 0;
    const points = user?.points || 0;

    return (
        <div className="h-screen overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full pb-20 lg:pb-0">
                {/* Header */}
                <div
                    className="sticky top-0 z-20 px-4 pt-6 pb-4"
                    style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
                >
                    <h1 className="section-header mb-1">Rewards</h1>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redeem your points for exclusive rewards</p>
                </div>

                <div className="px-4 py-6 space-y-6">
                    {/* Balance Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-4 text-center"
                            style={{ borderColor: "rgba(25,227,209,0.3)" }}
                        >
                            <Droplets className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--primary)" }} />
                            <p className="text-3xl font-black mb-0.5" style={{ color: "var(--primary)" }}>
                                {inkDrops}
                            </p>
                            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>
                                InkDrops
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="glass-card p-4 text-center"
                            style={{ borderColor: "rgba(255,215,0,0.25)" }}
                        >
                            <Trophy className="w-7 h-7 mx-auto mb-2" style={{ color: "#FFD700" }} />
                            <p className="text-3xl font-black mb-0.5" style={{ color: "#FFD700" }}>
                                {points}
                            </p>
                            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>
                                Total Points
                            </p>
                        </motion.div>
                    </div>

                    {/* How to earn */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-4"
                    >
                        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                            How to Earn InkDrops
                        </p>
                        <div className="space-y-2">
                            {[
                                { action: "📖 Read for 30 minutes", drops: "+5" },
                                { action: "📝 Post a book review", drops: "+10" },
                                { action: "🔥 Maintain 7-day streak", drops: "+20" },
                                { action: "❤️ Get 10 likes on a post", drops: "+15" },
                            ].map(({ action, drops }) => (
                                <div key={action} className="flex items-center justify-between">
                                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{action}</p>
                                    <span className="text-sm font-black" style={{ color: "var(--primary)" }}>{drops}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Available Rewards */}
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                            🎁 Available Rewards
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
                            </div>
                        ) : rewards.length === 0 ? (
                            <div className="glass-card p-8 text-center">
                                <Gift className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                                <p className="font-bold mb-1" style={{ color: "var(--text-secondary)" }}>No rewards available yet</p>
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keep reading to unlock rewards!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rewards.map((reward: any, i: number) => {
                                    const canClaim = inkDrops >= (reward.cost || 0);
                                    return (
                                        <motion.div
                                            key={reward._id || i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="glass-card p-4 flex items-center gap-4"
                                        >
                                            <div
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                                style={{ background: canClaim ? "rgba(25,227,209,0.1)" : "rgba(255,255,255,0.04)" }}
                                            >
                                                {reward.icon || "🎁"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
                                                    {reward.name || reward.title}
                                                </p>
                                                {reward.description && (
                                                    <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                                                        {reward.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Droplets className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                                                    <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                                                        {reward.cost || 0} InkDrops
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleClaim(reward._id)}
                                                disabled={!canClaim || claiming === reward._id}
                                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${canClaim ? "btn-primary py-2 px-4" : "opacity-40 cursor-not-allowed"}`}
                                                style={!canClaim ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" } : {}}
                                            >
                                                {claiming === reward._id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : canClaim ? (
                                                    "Claim"
                                                ) : (
                                                    <Lock className="w-4 h-4" />
                                                )}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Claimed Rewards */}
                    {claimedRewards.length > 0 && (
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                                ✅ Claimed
                            </h2>
                            <div className="space-y-2">
                                {claimedRewards.map((reward: any, i: number) => (
                                    <div key={reward._id || i} className="glass-card p-4 flex items-center gap-3 opacity-60">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                                            style={{ background: "rgba(16,185,129,0.1)" }}>
                                            {reward.icon || "✅"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>
                                                {reward.name || reward.title}
                                            </p>
                                        </div>
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#10B981" }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
