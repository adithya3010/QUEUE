const jwt = require("jsonwebtoken");
const User = require("../models/User");

const orgAuth = async (req, res, next) => {
    try {
        // Accept token from org cookie, generic token cookie, or Authorization header
        const token = req.cookies.orgToken
            || req.cookies.adminToken  // backward compat during transition
            || req.cookies.token
            || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Support both orgAdminId (new) and adminId/userId (legacy)
        const userId = decoded.orgAdminId || decoded.adminId || decoded.userId;
        const admin = await User.findOne({ _id: userId, role: "ORG_ADMIN" });

        if (!admin) {
            return res.status(401).json({ message: "Invalid token or organization admin not found" });
        }

        req.orgAdminId    = admin._id;
        req.organizationId = admin.organizationId;
        req.user          = admin;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = orgAuth;
