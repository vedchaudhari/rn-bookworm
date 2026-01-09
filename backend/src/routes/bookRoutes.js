import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import Follow from "../models/Follow.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image, genre, author, tags } = req.body;

    if (!image || !title || !caption || !rating) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // upload the image to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    // save to the database
    const newBook = new Book({
      title,
      caption,
      rating,
      image: imageUrl,
      user: req.user._id,
      genre: genre || "General",
      author: author || "",
      tags: tags || [],
    });

    await newBook.save();

    // Check achievements after creating book
    const { checkAchievements } = await import("../lib/achievementService.js");
    const bookCount = await Book.countDocuments({ user: req.user._id });

    if (bookCount === 1) await checkAchievements(req.user._id, "FIRST_POST");
    if (bookCount === 5) await checkAchievements(req.user._id, "BOOK_LOVER_5");
    if (bookCount === 10) await checkAchievements(req.user._id, "BOOK_LOVER_10");
    if (bookCount === 25) await checkAchievements(req.user._id, "BOOK_LOVER_25");
    if (bookCount === 50) await checkAchievements(req.user._id, "BOOK_LOVER_50");

    res.status(201).json(newBook);
  } catch (error) {
    console.log("Error creating book", error);
    res.status(500).json({ message: error.message });
  }
});

// pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
  // example call from react native - frontend
  // const response = await fetch("http://localhost:3000/api/books?page=1&limit=5");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const books = await Book.find()
      .sort({ createdAt: -1 }) // desc
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage level");

    // Add like and comment counts
    const { default: Like } = await import("../models/Like.js");
    const { default: Comment } = await import("../models/Comment.js");

    const booksWithCounts = await Promise.all(
      books.map(async (book) => {
        const likeCount = await Like.countDocuments({ book: book._id });
        const commentCount = await Comment.countDocuments({ book: book._id });
        const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

        return {
          ...book.toObject(),
          likeCount,
          commentCount,
          isLiked: !!isLiked,
        };
      })
    );

    const totalBooks = await Book.countDocuments();

    res.send({
      books: booksWithCounts,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.log("Error in get all books route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/following", protectRoute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Get the list of users followed by the current user
    const following = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = following.map((f) => f.following);

    if (followingIds.length === 0) {
      return res.send({
        books: [],
        currentPage: page,
        totalBooks: 0,
        totalPages: 0,
      });
    }

    // 2. Find books created by those users
    const books = await Book.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage level");

    // 3. Add like and comment counts
    const { default: Like } = await import("../models/Like.js");
    const { default: Comment } = await import("../models/Comment.js");

    const booksWithCounts = await Promise.all(
      books.map(async (book) => {
        const likeCount = await Like.countDocuments({ book: book._id });
        const commentCount = await Comment.countDocuments({ book: book._id });
        const isLiked = await Like.findOne({ user: req.user._id, book: book._id });

        return {
          ...book.toObject(),
          likeCount,
          commentCount,
          isLiked: !!isLiked,
        };
      })
    );

    const totalBooks = await Book.countDocuments({ user: { $in: followingIds } });

    res.send({
      books: booksWithCounts,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.log("Error in get following books route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get recommended books by the logged in user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    console.error("Get user books error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if user is the creator of the book
    if (book.user.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Unauthorized" });

    // https://res.cloudinary.com/de1rm4uto/image/upload/v1741568358/qyup61vejflxxw8igvi0.png
    // delete image from cloduinary as well
    if (book.image && book.image.includes("cloudinary")) {
      try {
        const publicId = book.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.log("Error deleting image from cloudinary", deleteError);
      }
    }

    await book.deleteOne();

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.log("Error deleting book", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
