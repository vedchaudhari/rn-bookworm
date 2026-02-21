"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Compass, Bell, User, PlusCircle } from "lucide-react";

// Primary 5 tabs for mobile - keep it clean and Instagram-like
const PRIMARY_TABS = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/create", icon: PlusCircle, label: "Create", primary: true },
    { href: "/notifications", icon: Bell, label: "Alerts" },
    { href: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
            style={{
                background: "rgba(11,15,20,0.97)",
                borderTop: "1px solid var(--glass-border)",
                backdropFilter: "blur(24px)",
            }}
        >
            <div className="flex items-center justify-around px-2 pt-2 pb-safe" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
                {PRIMARY_TABS.map(({ href, icon: Icon, label, primary }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1"
                        >
                            {primary ? (
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-6 shadow-lg"
                                    style={{
                                        background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                                        boxShadow: "0 0 20px rgba(25,227,209,0.45)",
                                    }}
                                >
                                    <Icon className="w-6 h-6 text-[#0B0F14]" />
                                </div>
                            ) : (
                                <div className="relative">
                                    <Icon
                                        className={`w-6 h-6 transition-colors ${isActive ? "text-primary" : "text-text-muted"}`}
                                    />
                                    {isActive && (
                                        <span
                                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                                            style={{ background: "var(--primary)" }}
                                        />
                                    )}
                                </div>
                            )}
                            {!primary && (
                                <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-primary" : "text-text-muted"}`}>
                                    {label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
