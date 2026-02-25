const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Hospital = require("../models/Hospital");
const { adminSignupSchema, adminLoginSchema, addDoctorSchema, addReceptionistSchema } = require("../validators/admin_validator");
const logger = require("../utils/logger");
const { generateTokenPair } = require("../utils/tokenUtils");
const adminAuth = require("../middleware/adminAuthMiddleware");
const { requireRole } = require("../middleware/authMiddleware");

const isProduction = process.env.NODE_ENV === 'production';

const accessTokenCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000  // 15 minutes
};

const adminLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { message: "Too many authentication attempts, please try again after 15 minutes" },
        standardHeaders: true,
        legacyHeaders: false,
    });

router.post("/signup", adminLimiter, async (req, res) => {
    try {
        const validatedData = adminSignupSchema.parse(req.body);
        const { name, email, password, hospitalName } = validatedData;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Admin email already exists" });
        }

        // Provision Hospital
        const hospital = await Hospital.create({
            name: hospitalName,
            email: email
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await User.create({
            hospitalId: hospital._id,
            role: "HOSPITAL_ADMIN",
            name,
            email,
            password: hashedPassword,
        });

        res.json({
            message: "Admin signup successful",
            admin: {
                id: admin._id,
                hospitalId: admin.hospitalId,
                role: admin.role,
                name: admin.name,
                email: admin.email,
            },
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field: e.path?.join('.') || 'unknown',
                    message: e.message
                }))
            });
        }
        logger.error("Admin Signup Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", adminLimiter, async (req, res) => {
    try {
        const validatedData = adminLoginSchema.parse(req.body);
        const { email, password } = validatedData;

        const admin = await User.findOne({ email, role: "HOSPITAL_ADMIN" });
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials or not an Admin" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
            adminId: admin._id, // Backwards compatible for `adminAuth` middleware
            userId: admin._id,
            role: admin.role,
            hospitalId: admin.hospitalId
        });

        admin.refreshToken = refreshToken;
        admin.refreshTokenExpiry = refreshTokenExpiry;
        await admin.save();

        res.cookie("adminToken", accessToken, accessTokenCookieOptions);

        logger.info("Admin logged in successfully", { adminId: admin._id });

        res.json({
            message: "Admin login successful",
            admin: {
                id: admin._id,
                hospitalId: admin.hospitalId,
                role: admin.role,
                name: admin.name,
                email: admin.email,
            },
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed"
            });
        }
        logger.error("Admin Login Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/logout", async (req, res) => {
    try {
        res.clearCookie("adminToken", {
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction
        });
        res.json({ message: "Admin logout successful" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/info", adminAuth, async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.adminId, role: "HOSPITAL_ADMIN" }).select('-password');
        if (!admin) return res.status(404).json({ message: "Admin not found" });
        return res.json(admin);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ----------------------------------------------------------------------
// Staff Provisioning (Protected by adminAuth)
// ----------------------------------------------------------------------

// Add a Doctor under the current Admin's Hospital
router.post("/staff/doctor", adminAuth, async (req, res) => {
    try {
        const validatedData = addDoctorSchema.parse(req.body);
        const { name, email, specialization, password } = validatedData;

        // Ensure Admin exists to extract Hospital ID
        const admin = await User.findById(req.adminId);
        if (!admin || admin.role !== "HOSPITAL_ADMIN") {
            return res.status(403).json({ message: "Forbidden. Not an admin." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newDoctor = await User.create({
            hospitalId: admin.hospitalId,
            role: "DOCTOR",
            name,
            email,
            specialization,
            password: hashedPassword
        });

        res.json({
            message: "Doctor created successfully",
            doctor: {
                id: newDoctor._id,
                name: newDoctor.name,
                email: newDoctor.email,
                specialization: newDoctor.specialization
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field: e.path?.join('.') || 'unknown',
                    message: e.message
                }))
            });
        }
        logger.error("Create Doctor Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// Add a Receptionist under the current Admin's Hospital
router.post("/staff/receptionist", adminAuth, async (req, res) => {
    try {
        const validatedData = addReceptionistSchema.parse(req.body);
        const { name, email, password, assignedDoctors } = validatedData;

        const admin = await User.findById(req.adminId);
        if (!admin || admin.role !== "HOSPITAL_ADMIN") {
            return res.status(403).json({ message: "Forbidden. Not an admin." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        // Verify the assigned doctors actually belong to this hospital and are indeed DOCTORs
        const validDoctors = [];
        if (assignedDoctors && assignedDoctors.length > 0) {
            const doctors = await User.find({
                _id: { $in: assignedDoctors },
                hospitalId: admin.hospitalId,
                role: "DOCTOR"
            });
            validDoctors.push(...doctors.map(d => d._id));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newReceptionist = await User.create({
            hospitalId: admin.hospitalId,
            role: "RECEPTIONIST",
            name,
            email,
            password: hashedPassword,
            assignedDoctors: validDoctors
        });

        res.json({
            message: "Receptionist created successfully",
            receptionist: {
                id: newReceptionist._id,
                name: newReceptionist.name,
                email: newReceptionist.email,
                assignedDoctors: newReceptionist.assignedDoctors
            }
        });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field: e.path?.join('.') || 'unknown',
                    message: e.message
                }))
            });
        }
        logger.error("Create Receptionist Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// Get all staff for the admin's hospital
router.get("/staff", adminAuth, async (req, res) => {
    try {
        const admin = await User.findById(req.adminId);
        if (!admin || admin.role !== "HOSPITAL_ADMIN") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const staff = await User.find({
            hospitalId: admin.hospitalId,
            role: { $in: ["DOCTOR", "RECEPTIONIST"] }
        }).select("-password -refreshToken -resetPasswordToken");

        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// [NEW] Get assigned doctors for a receptionist
router.get("/reception/doctors", async (req, res) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.role !== "RECEPTIONIST") {
            return res.status(403).json({ message: "Only Receptionists can access this route" });
        }

        // Fetch full doctor profiles based on the assigned doctor IDs
        const doctors = await User.find({
            _id: { $in: user.assignedDoctors },
            role: "DOCTOR"
        }).select('name specialization avgConsultationTime availability');

        res.json({ success: true, data: doctors });
    } catch (err) {
        logger.error("Reception doctors fetch err", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
