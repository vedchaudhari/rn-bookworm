"use client";

import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

export default function AppDownloadBadge() {
    return (
        <motion.a
            href="https://expo.dev/accounts/vedchaudhari/projects/readsphere/builds/e5f355c7-15b4-46e3-97c7-6a2c3c8e07f9" // Placeholder
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 backdrop-blur-md group transition-all"
            style={{
                boxShadow: "0 8px 32px rgba(25, 227, 209, 0.15)",
            }}
        >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Available on
                </span>
                <span className="text-sm font-black text-text-primary">
                    Expo Go
                </span>
            </div>
        </motion.a>
    );
}
