import mongoose from "mongoose";

const bookContentSchema = new mongoose.Schema(
    {
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
            unique: true,
        },
        content: {
            type: String,
            default: "",
        },
        chapters: [
            {
                title: String,
                content: String,
                order: Number,
            },
        ],
        totalPages: {
            type: Number,
            default: 0,
        },
        readCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Index for efficient queries
bookContentSchema.index({ book: 1 });

const BookContent = mongoose.model("BookContent", bookContentSchema);

export default BookContent;
