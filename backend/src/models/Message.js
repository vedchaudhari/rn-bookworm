import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    { timestamps: true }
);

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });

// Generate conversation ID from two user IDs (always in same order)
messageSchema.statics.getConversationId = function (userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `${ids[0]}_${ids[1]}`;
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
