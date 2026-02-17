import { format, isToday, isYesterday, isSameYear } from 'date-fns';

/**
 * Format a date for display in chat messages
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - This year: "Feb 15"
 * - Previous years: "Feb 15, 2025"
 */
export const formatMessageDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isToday(dateObj)) {
        return 'Today';
    }

    if (isYesterday(dateObj)) {
        return 'Yesterday';
    }

    if (isSameYear(dateObj, new Date())) {
        return format(dateObj, 'MMM d');
    }

    return format(dateObj, 'MMM d, yyyy');
};

/**
 * Get the date key for grouping messages
 * Returns date in YYYY-MM-DD format for grouping
 */
export const getDateKey = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return getDateKey(d1) === getDateKey(d2);
};
