const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
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

/**
 * @swagger
 * /admin/signup:
 *   post:
 *     summary: Register a new hospital admin
 *     description: Creates a Hospital Admin account and provisions a new Hospital with a default "Main Branch". Step 1 of the admin onboarding flow.
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hospitalName, name, email, password]
 *             properties:
 *               hospitalName:
 *                 type: string
 *                 example: City General Hospital
 *               name:
 *                 type: string
 *                 example: John Admin
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@citygeneral.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin signup successful
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     hospitalId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
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
            email: email,
            branches: [{ name: "Main Branch", address: "Local Branch" }]
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await User.create({
            hospitalId: hospital._id,
            branchId: hospital.branches[0]._id, // Assign admin to the default branch
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

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticates a Hospital Admin. The response contains an `accessToken` — copy it and click **Authorize → AdminBearerAuth** in the Swagger UI to unlock protected endpoints.
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@citygeneral.com
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful — copy the accessToken from the response body and use it as a Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin login successful
 *                 accessToken:
 *                   type: string
 *                   description: Copy this value → click Authorize (🔒) → paste under AdminBearerAuth
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     hospitalId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 */
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
            hospitalId: admin.hospitalId,
            branchId: admin.branchId
        });

        admin.refreshToken = refreshToken;
        admin.refreshTokenExpiry = refreshTokenExpiry;
        await admin.save();

        res.cookie("adminToken", accessToken, accessTokenCookieOptions);

        logger.info("Admin logged in successfully", { adminId: admin._id });

        res.json({
            message: "Admin login successful",
            accessToken,
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

/**
 * @swagger
 * /admin/logout:
 *   post:
 *     summary: Admin logout
 *     description: Clears the adminToken cookie. Also works when called with a Bearer token.
 *     tags: [Admin Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", async (req, res) => {
    try {
        // Clear both adminToken and token cookies for flexibility
        res.clearCookie("adminToken", {
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction
        });
        res.clearCookie("token", {
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction
        });
        res.json({ message: "Admin logout successful" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /admin/info:
 *   get:
 *     summary: Get admin profile
 *     description: Returns the current admin's profile and hospitalId.
 *     tags: [Admin Auth]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 *       401:
 *         description: Not authenticated
 */
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

/**
 * @swagger
 * /admin/staff/doctor:
 *   post:
 *     summary: Add a doctor to the hospital
 *     description: Creates a DOCTOR account under the admin's hospital. Requires admin authentication — complete the login flow first and authorize with AdminBearerAuth.
 *     tags: [Admin — Staff]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, specialization, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Sarah Chen
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sarah@citygeneral.com
 *               specialization:
 *                 type: string
 *                 example: Cardiology
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Doctor created — use the returned id as doctorId in B2B queue endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Doctor created successfully
 *                 doctor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Use this as doctorId in B2B queue/appointment endpoints
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     specialization:
 *                       type: string
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 */
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

        // Get the default branch
        const hospital = await Hospital.findById(admin.hospitalId);
        const branchId = hospital.branches[0]._id;

        const newDoctor = await User.create({
            hospitalId: admin.hospitalId,
            branchId: branchId,
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

/**
 * @swagger
 * /admin/staff/receptionist:
 *   post:
 *     summary: Add a receptionist to the hospital
 *     description: Creates a RECEPTIONIST account assigned to one or more doctors.
 *     tags: [Admin — Staff]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Receptionist
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@citygeneral.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *               assignedDoctors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of doctor ObjectIds from POST /admin/staff/doctor responses. Must be real IDs from your hospital — get them via GET /admin/staff.
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       200:
 *         description: Receptionist created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
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
            const validIds = assignedDoctors.filter(id => mongoose.isValidObjectId(id));
            if (validIds.length !== assignedDoctors.length) {
                return res.status(400).json({ message: "One or more assignedDoctors IDs are not valid ObjectIds" });
            }
            const doctors = await User.find({
                _id: { $in: validIds },
                hospitalId: admin.hospitalId,
                role: "DOCTOR"
            });
            validDoctors.push(...doctors.map(d => d._id));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Get the default branch
        const hospital = await Hospital.findById(admin.hospitalId);
        const branchId = hospital.branches[0]._id;

        const newReceptionist = await User.create({
            hospitalId: admin.hospitalId,
            branchId: branchId,
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

// Update a doctor's schedule
router.put("/staff/:id/schedule", adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { schedule } = req.body;

        const admin = await User.findById(req.adminId);
        if (!admin || admin.role !== "HOSPITAL_ADMIN") {
            return res.status(403).json({ message: "Forbidden. Not an admin." });
        }

        const doctor = await User.findOne({ _id: id, hospitalId: admin.hospitalId, role: "DOCTOR" });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found or not in your hospital" });
        }

        doctor.schedule = schedule;
        await doctor.save();

        res.json({ message: "Schedule updated successfully", schedule: doctor.schedule });
    } catch (err) {
        logger.error("Update Schedule Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /admin/staff:
 *   get:
 *     summary: List all staff
 *     description: Returns all doctors and receptionists under the admin's hospital.
 *     tags: [Admin — Staff]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: Array of staff members
 *       401:
 *         description: Not authenticated
 */
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
        }).populate("assignedDoctors", "name email specialization availability").select("-password -refreshToken -resetPasswordToken");

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

        res.json(doctors);
    } catch (err) {
        logger.error("Reception doctors fetch err", err);
        res.status(500).json({ message: "Server error" });
    }
});

// [NEW] Get hospital analytics dashboard data
router.get("/analytics", adminAuth, async (req, res) => {
    try {
        const admin = await User.findById(req.adminId);
        if (!admin || admin.role !== "HOSPITAL_ADMIN") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const hospitalId = admin.hospitalId;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // 1. Daily patient volume (last 30 days)
        const dailyVolume = await Patient.aggregate([
            {
                $match: {
                    hospitalId: hospitalId,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Doctor performance (all time or last 30 days)
        const doctorPerformance = await Patient.aggregate([
            {
                $match: {
                    hospitalId: hospitalId,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: "$doctorId",
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    total: { $sum: 1 },
                    // Calculate wait time: completedAt - createdAt in minutes
                    avgWaitTime: {
                        $avg: {
                            $cond: [
                                { $eq: ["$status", "completed"] },
                                { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 60000] },
                                null
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "doctor"
                }
            },
            {
                $unwind: "$doctor"
            },
            {
                $project: {
                    doctorName: "$doctor.name",
                    completed: 1,
                    cancelled: 1,
                    total: 1,
                    avgWaitTime: { $round: ["$avgWaitTime", 0] }
                }
            }
        ]);

        // 3. Heatmap Data (Day of week vs Hour of day)
        const heatmapRaw = await Patient.aggregate([
            {
                $match: {
                    hospitalId: hospitalId,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $project: {
                    dayOfWeek: { $dayOfWeek: "$createdAt" }, // 1 (Sunday) to 7 (Saturday)
                    hourOfDay: { $hour: "$createdAt" }
                }
            },
            {
                $group: {
                    _id: { dayOfWeek: "$dayOfWeek", hourOfDay: "$hourOfDay" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const heatmap = heatmapRaw.map(item => ({
            dayOfWeek: item._id.dayOfWeek - 1, // Convert to 0 (Sun) - 6 (Sat)
            hourOfDay: item._id.hourOfDay,
            count: item.count
        }));

        res.json({
            dailyVolume: dailyVolume.map(v => ({ date: v._id, count: v.count })),
            doctorPerformance,
            heatmap
        });

    } catch (err) {
        logger.error("Analytics fetch err", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
