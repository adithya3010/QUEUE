const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to check if user is logged in
const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token
      || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    req.user = {
      id:             decoded.userId,
      role:           decoded.role,
      organizationId: decoded.organizationId || decoded.hospitalId  // support legacy tokens
    };

    // Convenience shorthand for AGENT role (was: req.doctorId for DOCTOR)
    req.agentId = decoded.role === "AGENT" ? decoded.userId : null;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Middleware to restrict access to specific roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "User role not identified. Please login again." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
    }

    next();
  };
};

module.exports = { auth, requireRole };
