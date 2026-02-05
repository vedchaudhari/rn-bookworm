
import { Message } from '../store/messageStore';

export interface DateSeparator {
    _id: string;
    type: 'date-separator';
    date: string;
}

export type GroupPosition = 'start' | 'middle' | 'end' | 'single';

export interface ProcessedItemExtras {
    showAvatar?: boolean;
    positionInGroup?: GroupPosition;
}

export type ProcessedItem = (Message & ProcessedItemExtras) | DateSeparator;

export const processMessagesWithDates = (messages: Message[], currentUserId: string): ProcessedItem[] => {
    if (!messages || messages.length === 0) return [];

    const processed: ProcessedItem[] = [];
    let lastDate: string | null = null;

    // Assuming messages are ordered Newest first (index 0) to Oldest (index N)
    // because chat is usually inverted.
    // If we want date headers to appear "above" a group of messages from the same day:
    // In an inverted list:
    // [Newest Msg, ..., Older Msg, DATE HEADER, Even Older Msg...]
    //
    // So iterating from Newest (0) to Oldest (N):
    // If msg[i] date != msg[i+1] date, then insert header at i+1?

    // Let's iterate backwards (Oldest to Newest) to conceptually understand:
    // Oldest (N): Date A -> Insert Header A, then Msg N.
    // Next (N-1): Date A -> Msg N-1.
    // ...
    // Msg K: Date B -> Insert Header B, then Msg K.
    //
    // Now map this to inverted list (Newest..Oldest):
    // [Msg K (Date B), ..., Msg N-1 (Date A), Msg N (Date A)]
    //
    // We want:
    // [Msg K, Header B, Msg N-1, Msg N, Header A]

    // So when we switch from Date A to Date B (going from Oldest N to Newest 0), we insert Header B *before* Msg K (which means *after* Msg K in inverted array? No).
    // Inverted array:
    // Index 0: Msg K (Date B).
    // Index 1: Header B.
    // Index 2: Msg N-1 (Date A).

    // Algorithm:
    // Iterate through messages.
    // For each message, check date.
    // If current msg date is different from *next* message's date (which is OLDER in inverted list), insert Header.
    // Also, usually need a header for the very last item (=oldest message).

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgDate = new Date(msg.createdAt);
        const currentDate = msgDate.toDateString();
        const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
        const isMe = senderId === currentUserId || senderId === 'me';

        const nextMsg = messages[i + 1];
        const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : null;
        const nextSenderId = nextMsg ? (typeof nextMsg.sender === 'object' ? nextMsg.sender._id : nextMsg.sender) : null;

        const prevMsg = messages[i - 1];
        const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
        const prevSenderId = prevMsg ? (typeof prevMsg.sender === 'object' ? prevMsg.sender._id : prevMsg.sender) : null;

        // Visual "Above" is older (i+1)
        const isSameAbove = nextMsg && nextSenderId === senderId && nextDate === currentDate;
        // Visual "Below" is newer (i-1)
        const isSameBelow = prevMsg && prevSenderId === senderId && prevDate === currentDate;

        let positionInGroup: GroupPosition = 'single';
        if (isSameAbove && isSameBelow) positionInGroup = 'middle';
        else if (isSameAbove) positionInGroup = 'end'; // Bottom of group
        else if (isSameBelow) positionInGroup = 'start'; // Top of group

        let showAvatar = false;
        if (!isMe && !isSameBelow) {
            showAvatar = true;
        }

        processed.push({ ...msg, showAvatar, positionInGroup });

        if (currentDate !== nextDate) {
            let label = currentDate;
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);

            if (currentDate === now.toDateString()) {
                label = 'Today';
            } else if (currentDate === yesterday.toDateString()) {
                label = 'Yesterday';
            } else {
                // Format: "Feb 5, 2026"
                label = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            processed.push({
                _id: `date-${currentDate}`,
                type: 'date-separator',
                date: label
            });
        }
    }

    return processed;
};
