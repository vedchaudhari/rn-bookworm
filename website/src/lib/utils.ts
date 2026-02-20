export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });
}

export function formatMemberSince(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getRatingStars(rating: number): { filled: number; empty: number } {
    const filled = Math.round(rating);
    return { filled, empty: 5 - filled };
}

export function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        currently_reading: "Reading",
        completed: "Completed",
        want_to_read: "Want to Read",
        paused: "Paused",
        dropped: "Dropped",
    };
    return map[status] || status;
}

export function getStatusClass(status: string): string {
    const map: Record<string, string> = {
        currently_reading: "status-reading",
        completed: "status-completed",
        want_to_read: "status-wantread",
        paused: "status-paused",
        dropped: "status-dropped",
    };
    return map[status] || "status-wantread";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(" ");
}

export function truncate(str: string, n: number): string {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function getLevelTitle(level: number): string {
    if (level < 5) return "Bookworm";
    if (level < 10) return "Avid Reader";
    if (level < 20) return "Bibliophile";
    if (level < 35) return "Literary Scholar";
    if (level < 50) return "Grand Archivist";
    return "Legendary Reader";
}
