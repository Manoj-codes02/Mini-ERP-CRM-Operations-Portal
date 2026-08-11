const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/database");
const { authenticateToken } = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  try {
    // Check if user exists
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const user = rows[0];

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "erp_crm_secret_2026",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login authentication error:", {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
    });
    res.status(500).json({
      success: false,
      message: "An error occurred during login. Please try again.",
    });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, username, role, created_at FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching user profile.",
    });
  }
});

module.exports = router;
