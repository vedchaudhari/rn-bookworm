import express, { Request, Response } from "express";
import protectRoute from "../middleware/auth.middleware";
import BookContent, { IChapter } from "../models/BookContent";
import Book from "../models/Book";

const router = express.Router();

interface UpdateContentBody {
    content?: string;
    chapters?: IChapter[];
}

interface AddChapterBody {
    title: string;
    content: string;
}

// Get book content
router.get("/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;

        // Check if book exists
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        let bookContent = await BookContent.findOne({ book: bookId });

        if (!bookContent) {
            // Create empty content if doesn't exist
            bookContent = new BookContent({
                book: bookId,
                content: "",
                chapters: [],
            });
            await bookContent.save();
        }

        // Increment read count
        bookContent.readCount += 1;
        await bookContent.save();

        res.json(bookContent);
    } catch (error) {
        console.error("Error fetching book content:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update book content (only book owner)
router.put("/:bookId", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { content, chapters } = req.body as UpdateContentBody;
        const userId = req.user!._id;

        // Check if book exists and user is owner
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (book.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to edit this book" });
        }

        let bookContent = await BookContent.findOne({ book: bookId });

        if (!bookContent) {
            bookContent = new BookContent({ book: bookId });
        }

        if (content !== undefined) {
            bookContent.content = content;
        }

        if (chapters !== undefined) {
            bookContent.chapters = chapters;
        }

        await bookContent.save();

        res.json(bookContent);
    } catch (error) {
        console.error("Error updating book content:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Add chapter
router.post("/:bookId/chapter", protectRoute, async (req: Request, res: Response) => {
    try {
        const { bookId } = req.params;
        const { title, content } = req.body as AddChapterBody;
        const userId = req.user!._id;

        // Check if book exists and user is owner
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (book.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to edit this book" });
        }

        let bookContent = await BookContent.findOne({ book: bookId });

        if (!bookContent) {
            bookContent = new BookContent({ book: bookId });
        }

        const newChapter: IChapter = {
            title,
            content,
            order: bookContent.chapters.length + 1,
        };

        bookContent.chapters.push(newChapter);
        await bookContent.save();

        res.status(201).json(newChapter);
    } catch (error) {
        console.error("Error adding chapter:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
