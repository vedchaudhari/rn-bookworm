"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Camera, Lock, Loader2, Eye, EyeOff, Save, Target, Bell, Trash2, BarChart2, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

export default function SettingsPage() {
    const { user, updateUser } = useAuthStore();
    const router = useRouter();

    const [bio, setBio] = useState(user?.bio || "");
    const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
    const [saving, setSaving] = useState(false);

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const [dailyGoal, setDailyGoal] = useState(30);
    const [savingGoal, setSavingGoal] = useState(false);

    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            setIsPrivate(user.isPrivate || false);
        }
    }, [user]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const { uploadUrl, finalUrl } = await apiClient.get<any>(
            `/api/users/presigned-url/profile-image?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
        );
        await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
        });
        return finalUrl;
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            let profileImageUrl: string | undefined;
            if (imageFile) {
                setUploadingImage(true);
                try {
                    profileImageUrl = await uploadImage(imageFile);
                } finally {
                    setUploadingImage(false);
                }
            }

            const payload: any = { bio };
            if (profileImageUrl) payload.profileImage = profileImageUrl;

            const res = await apiClient.put<any>("/api/users/profile", payload);
            if (res.user) updateUser(res.user);
            setImageFile(null);
            setImagePreview(null);
            toast.success("Profile updated!");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) return toast.error("Fill in both password fields");
        if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
        setChangingPassword(true);
        try {
            await apiClient.put<any>("/api/auth/change-password", { currentPassword, newPassword });
            toast.success("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSaveGoal = async () => {
        setSavingGoal(true);
        try {
            await apiClient.put<any>("/api/reading-sessions/goal", { dailyGoalMinutes: dailyGoal });
            toast.success("Reading goal updated!");
        } catch (e: any) {
            toast.error("Could not save goal");
        } finally {
            setSavingGoal(false);
        }
    };

    const currentAvatar = imagePreview || user?.profileImage;

    return (
        <div className="h-screen overflow-y-auto">
            {/* Header */}
            <div
                className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-4 pb-3"
                style={{ background: "rgba(11,15,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}
            >
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                >
                    <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </button>
                <h1 className="font-black text-lg" style={{ color: "var(--text-primary)" }}>Settings</h1>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

                {/* Quick Stats Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4"
                >
                    <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                        Account Summary
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>Lv.{user?.level || 1}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Level</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black" style={{ color: "#FFD700" }}>{user?.points || 0}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Points</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>💧{user?.inkDrops || 0}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>InkDrops</p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <Link href="/reading-stats" className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5" />Reading Stats
                        </Link>
                        <Link href="/rewards" className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5" />Rewards
                        </Link>
                    </div>
                </motion.div>

                {/* Profile Image */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 }}
                    className="glass-card p-6"
                >
                    <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                        Profile Photo
                    </p>
                    <div className="flex items-center gap-6">
                        <div
                            className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 cursor-pointer group"
                            style={{ border: "3px solid rgba(25,227,209,0.3)" }}
                            onClick={() => imageInputRef.current?.click()}
                        >
                            {currentAvatar ? (
                                <Image src={currentAvatar} alt="avatar" fill className="object-cover" unoptimized />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-2xl font-black"
                                    style={{ background: "linear-gradient(135deg, #19E3D1, #00C2FF)", color: "#0B0F14" }}
                                >
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: "rgba(0,0,0,0.5)" }}
                            >
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="btn-secondary text-sm px-4 py-2"
                            >
                                Change Photo
                            </button>
                            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                                JPG, PNG, or WebP · Max 5MB
                            </p>
                        </div>
                    </div>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                </motion.div>

                {/* Profile Details */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="glass-card p-6 space-y-4"
                >
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                        Profile Details
                    </p>

                    <div>
                        <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>
                            Username
                        </label>
                        <div className="input-field text-sm opacity-50 cursor-not-allowed select-none">
                            @{user?.username}
                        </div>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Username cannot be changed</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>
                            Email
                        </label>
                        <div className="input-field text-sm opacity-50 cursor-not-allowed select-none">
                            {user?.email}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>
                            Bio
                        </label>
                        <textarea
                            className="input-field text-sm resize-none"
                            rows={3}
                            placeholder="Tell people about yourself..."
                            value={bio}
                            maxLength={200}
                            onChange={(e) => setBio(e.target.value)}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>
                            {bio.length}/200
                        </p>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={saving || uploadingImage}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {saving || uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {uploadingImage ? "Uploading..." : saving ? "Saving..." : "Save Profile"}
                    </button>
                </motion.div>

                {/* Daily Reading Goal */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="glass-card p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4" style={{ color: "var(--primary)" }} />
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                            Daily Reading Goal
                        </p>
                    </div>
                    <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                        Set your daily reading goal in minutes
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min={5}
                            max={480}
                            step={5}
                            className="input-field text-center w-24 flex-shrink-0 text-lg font-black"
                            value={dailyGoal}
                            onChange={(e) => setDailyGoal(Number(e.target.value))}
                            style={{ color: "var(--primary)" }}
                        />
                        <div className="flex-1">
                            <input
                                type="range"
                                min={5}
                                max={120}
                                step={5}
                                value={dailyGoal}
                                onChange={(e) => setDailyGoal(Number(e.target.value))}
                                className="w-full"
                                style={{ accentColor: "var(--primary)" }}
                            />
                            <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                <span>5 min</span>
                                <span>120 min</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveGoal}
                        disabled={savingGoal}
                        className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
                    >
                        {savingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                        {savingGoal ? "Saving..." : "Save Goal"}
                    </button>
                </motion.div>

                {/* Privacy */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 }}
                    className="glass-card p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-4 h-4" style={{ color: "var(--primary)" }} />
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Privacy</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Private Account</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                Only approved followers can see your posts
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                const newVal = !isPrivate;
                                setIsPrivate(newVal);
                                try {
                                    await apiClient.put<any>("/api/users/profile", { isPrivate: newVal });
                                    toast.success(newVal ? "Account set to Private" : "Account set to Public");
                                } catch {
                                    setIsPrivate(!newVal);
                                    toast.error("Failed to update privacy");
                                }
                            }}
                            className="relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4"
                            style={{
                                background: isPrivate ? "linear-gradient(135deg, #19E3D1, #00C2FF)" : "rgba(255,255,255,0.1)",
                            }}
                        >
                            <span
                                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                                style={{ left: isPrivate ? "calc(100% - 22px)" : "2px" }}
                            />
                        </button>
                    </div>
                </motion.div>

                {/* Change Password */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.20 }}
                    className="glass-card p-6 space-y-4"
                >
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                        Change Password
                    </p>

                    <div>
                        <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>Current Password</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                className="input-field text-sm pr-12 w-full"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                {showCurrent ? <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>New Password</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                className="input-field text-sm pr-12 w-full"
                                placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                {showNew ? <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {changingPassword ? "Updating..." : "Change Password"}
                    </button>
                </motion.div>

                <div className="h-8" />
            </div>
        </div>
    );
}
