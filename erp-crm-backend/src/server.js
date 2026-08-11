const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDatabase } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// CORS
// ============================================================

// Reflect the requesting origin.
// This supports localhost, Vercel production, Vercel previews, etc.
app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

// ============================================================
// IMPORT ROUTES
// ============================================================

const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const challanRoutes = require("./routes/challans");
const dashboardRoutes = require("./routes/dashboard");

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/challans", challanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ============================================================
// HEALTH CHECKS
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mini ERP + CRM Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An internal server error occurred.",
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    await testDatabase();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
});
