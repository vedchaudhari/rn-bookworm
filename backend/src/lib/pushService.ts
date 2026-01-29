import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from '../models/User';

// Create a new Expo SDK client
const expo = new Expo();

interface PushOptions {
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
}

/**
 * Send a push notification to a specific user
 */
export const sendPushNotification = async (userId: string, options: PushOptions) => {
    try {
        const user = await User.findById(userId).select('expoPushToken notificationsEnabled');

        if (!user || !user.expoPushToken || !user.notificationsEnabled) {
            // console.log(`[Push] Skipping push: User ${userId} has no token or notifications disabled.`);
            return;
        }

        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`[Push] Invalid Expo push token for user ${userId}: ${user.expoPushToken}`);
            return;
        }

        const message: ExpoPushMessage = {
            to: user.expoPushToken,
            sound: options.sound || 'default',
            title: options.title,
            body: options.body,
            data: options.data,
            channelId: 'default', // Essential for Android to show notification properly
        };

        const chunks = expo.chunkPushNotifications([message]);

        // Send the chunks - we only have one message here but keeping it robust
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                // console.log('[Push] Notification ticket:', ticketChunk);
            } catch (error) {
                console.error('[Push] Error sending chunk:', error);
            }
        }
    } catch (error) {
        console.error('[Push] Fatal error in sendPushNotification:', error);
    }
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
    NEW_POST: (username: string, bookTitle: string) => ({
        title: '📚 New Post Alert!',
        body: `${username} just added "${bookTitle}" to their bookshelf!`,
    }),
};

