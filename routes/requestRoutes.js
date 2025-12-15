import express from "express";
import ChatRequest from "../models/ChatRequest.js";
import Chat from "../models/Chat.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ---------------- SEND REQUEST ---------------- */
router.post("/send", protect, async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroup: false,
      users: { $all: [req.user._id, receiverId] },
    });
    if (existingChat) {
      return res.status(400).json({ message: "Chat already exists." });
    }

    const request = await ChatRequest.create({
      sender: req.user._id,
      receiver: receiverId,
    });

    res.json({ message: "Request sent!", request });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Request already pending." });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- GET INCOMING REQUESTS ---------------- */
router.get("/incoming", protect, async (req, res) => {
  try {
    const requests = await ChatRequest.find({
      receiver: req.user._id,
      status: "pending",
    }).populate("sender", "username firstName lastName avatar status");

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- ACCEPT / REJECT ---------------- */
router.post("/respond", protect, async (req, res) => {
  try {
    const { requestId, action } = req.body;

    const request = await ChatRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      return res.json({ message: "Request rejected" });
    }

    // ACCEPT → Create Chat Room
    request.status = "accepted";
    await request.save();

    const chat = await Chat.create({
      users: [request.sender, request.receiver],
      isGroup: false,
    });

    res.json({ message: "Request accepted!", chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
