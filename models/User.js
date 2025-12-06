// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },       // ✅ new
    lastName:  { type: String, required: true },       // ✅ new
    username:  { type: String, required: true, unique: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    avatar:    { type: String },                       // value from frontend (static options)
    status:    { type: String, default: "Hey there! I’m using VibeChat" },
    isEmailVerified: { type: Boolean, default: false }, // ✅ new
  },
  { timestamps: true }
);

// password hash pre-save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
