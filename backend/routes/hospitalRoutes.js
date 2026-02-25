const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const ApiKey = require("../models/ApiKey");
const Webhook = require("../models/Webhook");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");
const Admin = require("../models/Admin");

// All these routes require a logged-in admin
router.use(adminAuthMiddleware);

// Middleware to resolve the hospital ID from the logged-in admin
const resolveHospital = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.adminId);
        if (!admin || !admin.hospitalId) {
            return res.status(403).json({ success: false, message: "Hospital association not found" });
        }
        req.hospitalId = admin.hospitalId;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error resolving hospital" });
    }
};

router.use(resolveHospital);

// ---------------------------------------------------------
// API Keys Management
// ---------------------------------------------------------

router.get("/keys", async (req, res) => {
    try {
        const keys = await ApiKey.find({ hospitalId: req.hospitalId }).select('-keyHash').sort({ createdAt: -1 });
        res.json({ success: true, data: keys });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/keys", async (req, res) => {
    try {
        const { name, isLive } = req.body;
        if (!name) return res.status(400).json({ message: "Key name is required" });

        const prefix = isLive ? "sq_live_" : "sq_test_";
        const rawSecret = crypto.randomBytes(32).toString('hex');

        // We will just generate a MongoDB ID, and use its base64 as the public identifier
        const newKeyDoc = new ApiKey({
            hospitalId: req.hospitalId,
            name,
            prefix,
            keyHash: await bcrypt.hash(rawSecret, 10),
            status: "Active"
        });

        const keyIdBase64 = Buffer.from(newKeyDoc._id.toString(), 'utf8').toString('base64');
        const fullRawKey = `${prefix}${keyIdBase64}_${rawSecret}`;

        await newKeyDoc.save();

        res.status(201).json({
            success: true,
            message: "Key generated successfully. This will only be shown once.",
            key: fullRawKey,
            keyRecord: {
                id: newKeyDoc._id,
                name: newKeyDoc.name,
                prefix: newKeyDoc.prefix,
                createdAt: newKeyDoc.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error generating key" });
    }
});

router.delete("/keys/:id", async (req, res) => {
    try {
        await ApiKey.findOneAndUpdate({ _id: req.params.id, hospitalId: req.hospitalId }, { status: "Revoked" });
        res.json({ success: true, message: "API Key revoked" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// Webhooks Management
// ---------------------------------------------------------

router.get("/webhooks", async (req, res) => {
    try {
        const webhooks = await Webhook.find({ hospitalId: req.hospitalId }).sort({ createdAt: -1 });
        res.json({ success: true, data: webhooks });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/webhooks", async (req, res) => {
    try {
        const { url, events } = req.body;
        if (!url || !events || !events.length) {
            return res.status(400).json({ message: "URL and events are required" });
        }

        const secret = crypto.randomBytes(24).toString('hex');

        const webhook = new Webhook({
            hospitalId: req.hospitalId,
            url,
            secret,
            events,
            isActive: true
        });

        await webhook.save();
        res.status(201).json({ success: true, data: webhook });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error creating webhook" });
    }
});

router.delete("/webhooks/:id", async (req, res) => {
    try {
        await Webhook.findOneAndDelete({ _id: req.params.id, hospitalId: req.hospitalId });
        res.json({ success: true, message: "Webhook deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// API Usage Management
// ---------------------------------------------------------

router.get("/usage", async (req, res) => {
    try {
        const admin = await Admin.findById(req.adminId).populate('hospitalId');
        const hospitalPlan = admin.hospitalId.subscriptionPlan || "Basic";

        const planLimits = {
            "Basic": 1000,
            "Pro": 10000,
            "Enterprise": null
        };
        const maxLimit = planLimits[hospitalPlan];

        const currentMonth = new Date().toISOString().slice(0, 7);
        const ApiUsage = require("../models/ApiUsage");

        const usage = await ApiUsage.findOne({ hospitalId: req.hospitalId, yearMonth: currentMonth });

        res.json({
            success: true,
            data: {
                used: usage ? usage.requestCount : 0,
                limit: maxLimit,
                plan: hospitalPlan,
                month: currentMonth
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// Team / Doctor Management
// ---------------------------------------------------------

router.get("/doctors", async (req, res) => {
    try {
        const doctors = await User.find({ hospitalId: req.hospitalId, role: "DOCTOR" }).select('-password -refreshToken -resetPasswordToken');
        res.json({ success: true, data: doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/doctors", async (req, res) => {
    try {
        const { name, email, specialization, password } = req.body;

        if (!name || !email || !specialization || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const doctor = new User({
            hospitalId: req.hospitalId,
            role: "DOCTOR",
            name,
            email,
            specialization,
            password: hashedPassword
        });

        await doctor.save();

        res.status(201).json({
            success: true,
            message: "Doctor provisioned successfully",
            doctor: {
                id: doctor._id,
                name: doctor.name,
                email: doctor.email,
                specialization: doctor.specialization
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error creating doctor" });
    }
});

router.delete("/doctors/:id", async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, hospitalId: req.hospitalId, role: "DOCTOR" });
        res.json({ success: true, message: "Doctor removed from hospital" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// Analytics & Reporting
// ---------------------------------------------------------

router.get("/analytics", async (req, res) => {
    try {
        const Patient = require("../models/Patient");
        const { hospitalId } = req;

        // Define date ranges (Last 30 Days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);

        // 1. Overview Metrics (Total, Completed, Cancelled/NoShow)
        const overviewOps = await Patient.aggregate([
            {
                $match: {
                    hospitalId: new mongoose.Types.ObjectId(hospitalId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalVisits: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } }
                }
            }
        ]);

        const overview = overviewOps[0] || { totalVisits: 0, completed: 0, cancelled: 0 };
        const dropOffRate = overview.totalVisits > 0 ? ((overview.cancelled / overview.totalVisits) * 100).toFixed(1) : 0;

        // 2. Volume by Doctor
        const volumeByDoctor = await Patient.aggregate([
            {
                $match: {
                    hospitalId: new mongoose.Types.ObjectId(hospitalId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$doctorId",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "doctorInfo"
                }
            },
            { $unwind: "$doctorInfo" },
            {
                $project: {
                    _id: 0,
                    doctorName: "$doctorInfo.name",
                    patientCount: "$count"
                }
            },
            { $sort: { patientCount: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalVisits: overview.totalVisits,
                completed: overview.completed,
                dropOffRate: dropOffRate,
                volumeByDoctor
            }
        });

    } catch (err) {
        console.error("Analytics fetch error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
