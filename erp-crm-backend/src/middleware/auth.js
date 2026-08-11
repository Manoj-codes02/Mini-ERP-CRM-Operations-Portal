const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing. Please log in.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || "erp_crm_secret_2026", (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access is restricted to roles: [${allowedRoles.join(", ")}]. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
