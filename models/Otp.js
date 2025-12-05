import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// optional: email + latest otp ke liye index
otpSchema.index({ email: 1, createdAt: -1 });

const otpModel = mongoose.model("Otp", otpSchema);

export default otpModel;
