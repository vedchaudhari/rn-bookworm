import { Platform } from 'react-native';

export function resolveImageUrl(url: string): string {
    if (!url) return '';
    if (typeof url !== 'string') return url;

    let resolvedUrl = url;

    // If it's a relative path, prefix it with API_URL
    if (!resolvedUrl.startsWith('http')) {
        const { API_URL } = require('../constants/api');
        resolvedUrl = `${API_URL}${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
    }

    // On Android Emulator, localhost must be replaced with 10.0.2.2
    if (Platform.OS === 'android' && resolvedUrl.includes('localhost')) {
        resolvedUrl = resolvedUrl.replace('localhost', '10.0.2.2');
    }

    // Also handle 127.0.0.1
    if (Platform.OS === 'android' && resolvedUrl.includes('127.0.0.1')) {
        resolvedUrl = resolvedUrl.replace('127.0.0.1', '10.0.2.2');
    }

    return resolvedUrl;
}

// this function will convert the createdAt to this format: "May 2023"
export function formatMemberSince(dateString: string | Date): string {
    const date = new Date(dateString);
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${month} ${year}`;
}

// this function will convert the createdAt to this format: "May 15, 2023"
export function formatPublishDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}

export function formatLastSeen(dateString: string | Date): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays < 7) return `Active ${diffDays}d ago`;
    return `Last seen ${date.toLocaleDateString()}`;
}
