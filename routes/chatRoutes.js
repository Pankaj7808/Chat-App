// routes/chatRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  res.json({ message: "chats route working" });
});

export default router;
