import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMessage {
    sender: mongoose.Types.ObjectId;
    receiver: mongoose.Types.ObjectId;
    text?: string;
    image?: string;
    read: boolean;
    conversationId: string;
    // New fields for management
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean; // Delete for everyone
    deletedFor: mongoose.Types.ObjectId[]; // List of user IDs who deleted for themselves
}

export interface IMessageDocument extends IMessage, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

interface IMessageModel extends Model<IMessageDocument> {
    getConversationId(userId1: string | mongoose.Types.ObjectId, userId2: string | mongoose.Types.ObjectId): string;
}

const messageSchema = new Schema<IMessageDocument>(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: false,
            maxlength: 1000,
        },
        image: {
            type: String, // Base64 or URL
            required: false,
        },
        read: {
            type: Boolean,
            default: false,
        },
        conversationId: {
            type: String,
            required: true,
            index: true,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedFor: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { timestamps: true }
);

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 }); // Optimize "last message" aggregation
messageSchema.index({ conversationId: 1, deletedFor: 1 });     // Optimize filtering deleted messages

// Generate conversation ID from two user IDs (always in same order)
messageSchema.statics.getConversationId = function (
    userId1: string | mongoose.Types.ObjectId,
    userId2: string | mongoose.Types.ObjectId
): string {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `${ids[0]}_${ids[1]}`;
};

const Message = mongoose.model<IMessageDocument, IMessageModel>("Message", messageSchema);

export default Message;
