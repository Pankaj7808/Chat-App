// routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
  GET /api/users/search?query=…
  protected route → user must be logged in
*/
router.get("/search", protect, async (req, res) => {
  try {
    const query = req.query.query;

    if (!query || query.trim() === "") {
      return res.json([]); // empty search
    }

    // Search by username, firstName, lastName, email (partial match)
    const users = await User.find(
      {
        _id: { $ne: req.user._id }, // exclude self
        $or: [
          { username: { $regex: query, $options: "i" } },
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
      "username firstName lastName avatar status email"
    );

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
