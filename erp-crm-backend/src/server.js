const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDatabase } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  "https://mini-erp-crm-operations-portal-git-main-manoj-codes-02.vercel.app",
  "https://mini-erp-crm-operations-portal-h6hxvr9gg-manoj-codes-02.vercel.app",
  "https://mini-erp-crm-operations-portal-hd2balwn2-manoj-codes-02.vercel.app",
  "https://mini-erp-crm-operations-portal-manoj-codes-02.vercel.app",
  "https://mini-erp-crm-portal.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // Postman, server-to-server, mobile apps, etc.
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost development
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Allow explicitly registered Vercel URLs
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel deployment URLs for this project
    const vercelRegex =
      /^https:\/\/mini-erp-crm-operations-portal(-[a-z0-9-]+)?-manoj-codes(-02|02)?\.vercel\.app$/;

    if (vercelRegex.test(origin)) {
      return callback(null, true);
    }

    // Generic project Vercel deployment pattern
    const projectVercelRegex =
      /^https:\/\/mini-erp-crm-operations-portal(-[a-z0-9-]+)?\.vercel\.app$/;

    if (projectVercelRegex.test(origin)) {
      return callback(null, true);
    }

    console.log("CORS blocked origin:", origin);

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: false,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// ============================================================
// CORS MIDDLEWARE
// ============================================================

app.use(cors(corsOptions));

// Explicitly handle ALL OPTIONS preflight requests
app.options(/.*/, cors(corsOptions));

// ============================================================
// BODY PARSER
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
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/challans", challanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ============================================================
// HEALTH CHECK
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
    console.log("MySQL database connected successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
});