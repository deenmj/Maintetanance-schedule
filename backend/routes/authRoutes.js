const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const mechanicOnly = require("../middleware/mechanicOnly");

const router = express.Router();

/* ===============================
   REGISTER (Mechanic Only)
================================ */
router.post("/register", auth, mechanicOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      createdBy: req.user.userId
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});


/* ===============================
   LOGIN
================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});


/* ===============================
   CHANGE PASSWORD (Auth Req)
================================ */
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to change password" });
  }
});


/* ===============================
   FORGOT PASSWORD
================================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    await user.save();

    const origin = req.get('referer') ? new URL(req.get('referer')).origin : `http://${req.get('host')}`;
    const resetUrl = `${origin}/reset-password.html?token=${resetToken}`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🔧 ABC Fleet Maintenance</h1>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="padding: 32px; background: white;">
          <p style="color: #334155; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">You are receiving this email because you (or someone else) has requested the reset of a password. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetUrl}" style="display: inline-block; background: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser: <br><a href="${resetUrl}" style="color: #38bdf8;">${resetUrl}</a></p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      </div>
`;

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("⚠️  Email not configured. Token is: ", resetToken);
      console.log("Reset URL:", resetUrl);
      return res.json({ message: "Password reset link generated (Check server console since email is not configured)" });
    }

    await transporter.sendMail({
      from: `"ABC Fleet Maintenance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: emailHtml
    });

    res.json({ message: "Password reset email sent" });

  } catch (err) {
    console.error(err);
    const user = await User.findOne({ email: req.body.email });
    if(user) {
       user.resetPasswordToken = undefined;
       user.resetPasswordExpire = undefined;
       await user.save();
    }
    res.status(500).json({ message: "Email could not be sent" });
  }
});


/* ===============================
   RESET PASSWORD
================================ */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
       return res.status(400).json({ message: "Password is required" });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password successfully reset" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

module.exports = router;
