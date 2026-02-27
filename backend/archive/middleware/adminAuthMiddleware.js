const jwt = require("jsonwebtoken");
const User = require("../models/User");

const adminAuth = async (req, res, next) => {
    try {
        // Check for adminToken (from /api/admin/login) or token (from /api/auth/login)
        const token = req.cookies.adminToken || req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // We expect { adminId: ... } in the token based on backwards compatibility
        const adminId = decoded.adminId || decoded.userId;
        const admin = await User.findOne({ _id: adminId, role: "HOSPITAL_ADMIN" });

        if (!admin) {
            return res.status(401).json({ message: "Invalid token or admin not found" });
        }

        req.adminId = admin._id;
        req.user = admin;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = adminAuth;
