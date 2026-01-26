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

        if (!user) {
            console.error(`[Push Debug] User not found: ${userId}`);
            return;
        }

        if (!user.expoPushToken) {
            console.warn(`[Push Debug] User ${userId} has no Expo Push Token. Did they register?`);
            return;
        }

        if (!user.notificationsEnabled) {
            console.warn(`[Push Debug] Notifications are disabled for user ${userId}`);
            return;
        }

        console.log(`[Push Debug] Attempting to send to token: ${user.expoPushToken}`);

        // Check that all your push tokens appear to be valid Expo push tokens
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`[Push Debug] Token ${user.expoPushToken} is NOT a valid Expo push token`);
            // Optionally clear the invalid token
            await User.findByIdAndUpdate(userId, { expoPushToken: null });
            return;
        }

        const message: ExpoPushMessage = {
            to: user.expoPushToken,
            sound: options.sound || 'default',
            title: options.title,
            body: options.body,
            data: options.data,
            priority: 'high',
            channelId: 'default', // Match the channel created in mobile/lib/pushNotifications.ts
        };

        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('[Push] Error sending chunk:', error);
            }
        }

        // Handle tickets (in a real app, you might want to do this in a separate worker)
        for (let ticket of tickets) {
            // NOTE: Not all tickets have IDs; some may have errors immediately
            if (ticket.status === 'error') {
                console.error(`[Push] Error sending notification: ${ticket.message}`);
                if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                    console.log(`[Push] Clearing invalid token for user ${userId}`);
                    await User.findByIdAndUpdate(userId, { expoPushToken: null });
                }
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
};
