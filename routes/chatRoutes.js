// routes/chatRoutes.js
import express from "express";
import Chat from "../models/Chat.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all chats of logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $in: [req.user._id] },
    })
      .populate("users", "username firstName lastName avatar status")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error("Chat list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
