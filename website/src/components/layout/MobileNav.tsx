"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Home, BookOpen, Compass, Bell, User, PlusCircle, MessageSquare, Flame } from "lucide-react";
import AppDownloadBadge from "@/components/ui/AppDownloadBadge";

const NAV_ITEMS = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/bookshelf", icon: BookOpen, label: "Shelf" },
    { href: "/create", icon: PlusCircle, label: "Create" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/notifications", icon: Bell, label: "Alerts" },
    { href: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-2 pb-2 bg-background/95 border-t border-glass-border backdrop-blur-3xl">
            <div className="flex items-center justify-around pt-2">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link key={href} href={href}
                            className="flex flex-col items-center gap-0.5 px-2 py-2 min-w-0 transition-colors"
                        >
                            <Icon
                                className={`w-6 h-6 ${isActive ? "text-primary" : "text-text-muted"}`}
                            />
                            <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-text-muted"}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
            <div className="px-4 py-2">
                <AppDownloadBadge />
            </div>
        </nav>
    );
}
