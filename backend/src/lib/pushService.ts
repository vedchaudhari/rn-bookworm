/*
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from '../models/User';

// Create a new Expo SDK client
const expo = new Expo();
*/

interface PushOptions {
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
}

/**
 * Send a push notification to a specific user
 * [DISABLED] - Commented out to remove push functionality
 */
export const sendPushNotification = async (userId: string, options: PushOptions) => {
    // console.log(`[Push] Skipping push notification for user ${userId} (Service Disabled)`);
    return;

    /*
    try {
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled');
        ... existing logic ...
    } catch (error) {
        console.error('[Push] Fatal error in sendPushNotification:', error);
    }
    */
};

/**
 * "Fun" notification message generators
 */
export const NOTIF_TEMPLATES = {
    LIKE: (username: string, bookTitle: string) => ({
        title: '❤️ Love on your shelf!',
        body: `${username} just liked your book "${bookTitle}". Your stories are making waves!`,
    }),
    COMMENT: (username: string, bookTitle: string) => ({
        title: '💬 New conversation started!',
        body: `${username} left a comment on "${bookTitle}". Go see what they said!`,
    }),
    FOLLOW: (username: string) => ({
        title: '🆕 New Fan Alert!',
        body: `${username} is now following your reading journey!`,
    }),
    STREAK: (days: number) => ({
        title: '🔥 Don\'t let it go cold!',
        body: `You're on a ${days}-day reading streak! Spend 5 minutes reading today to keep it alive.`,
    }),
    ACHIEVEMENT: (name: string) => ({
        title: '🏆 Trophy Unlocked!',
        body: `Congratulations! You just earned the "${name}" achievement!`,
    }),
};

