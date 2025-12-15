// routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import User from "../models/User.js";
import Otp from "../models/Otp.js";

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ---------------- EMAIL SENDER (nodemailer) ----------------

const transporter = nodemailer.createTransport({
  service: "gmail", // ya custom SMTP
  auth: {
    user: "mpankajmandall@gmail.com",
    pass:"angl cjaz ixzr pssz",
  },
});

// Simple OTP generator
const generateOtpCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 6 digit
};

// ---------------- STEP 1: SEND OTP ----------------
// POST /api/auth/send-otp
// body: { email }
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email is already registered. Please login." });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Remove previous OTPs for this email (optional but clean)
    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt,
    });

    // Send email
    await transporter.sendMail({
      from: `"VibeChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your VibeChat verification code",
      text: `Your OTP is ${otpCode}. It will expire in 10 minutes.`,
      html: `<p>Your OTP is <b>${otpCode}</b>. It will expire in 10 minutes.</p>`,
    });

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ---------------- STEP 2: VERIFY OTP + REGISTER ----------------
// POST /api/auth/register
/*
  body:
  {
    email,
    otp,
    username,
    firstName,
    lastName,
    password,
    avatar,  // optional from static frontend list
    status   // optional
  }
*/
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      otp,
      username,
      firstName,
      lastName,
      password,
      avatar,
      status,
    } = req.body;

    if (!email || !otp || !username || !firstName || !lastName || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // again check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already in use" });
    }

    // Find latest OTP for this email
    const otpEntry = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!otpEntry) {
      return res.status(400).json({ message: "OTP not found. Please resend." });
    }

    if (otpEntry.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please resend." });
    }

    // OTP valid → create user
    const user = await User.create({
      email,
      username,
      firstName,
      lastName,
      password, // will be hashed in pre-save hook
      avatar: avatar || undefined,
      status: status || undefined,
      isEmailVerified: true,
    });

    // clean OTPs for that email
    await Otp.deleteMany({ email });

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Error in register:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------------- LOGIN ----------------
// POST /api/auth/login
// body: { emailOrUsername, password }
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    console.log(emailOrUsername, password)
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    console.log(user)
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Email not verified. Please complete signup." });
    }

    return res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
