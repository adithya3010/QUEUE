const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const logger = require("../utils/logger");

// Book an appointment
router.post("/book", auth, async (req, res) => {
    try {
        const { doctorId, patientName, phone, scheduledAt, notes } = req.body;
        const hospitalId = req.user.hospitalId;
        const branchId = req.user.branchId;

        const doctor = await User.findOne({ _id: doctorId, hospitalId, branchId, role: "DOCTOR" });
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        const appointment = new Appointment({
            hospitalId,
            branchId,
            doctorId,
            patientName,
            phone,
            scheduledAt,
            notes,
            status: "scheduled"
        });

        await appointment.save();
        res.status(201).json({ message: "Appointment booked successfully", appointment });
    } catch (err) {
        logger.error("Book Appointment Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// Get today's appointments for a doctor
router.get("/doctor/:doctorId/today", auth, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const hospitalId = req.user.hospitalId;
        const branchId = req.user.branchId;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            doctorId,
            hospitalId,
            branchId,
            scheduledAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["scheduled", "arrived"] }
        }).sort({ scheduledAt: 1 });

        res.json(appointments);
    } catch (err) {
        logger.error("Get Appointments Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// Mark appointment as arrived (moves to walk-in queue logic ideally)
router.put("/:id/arrive", auth, async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, hospitalId: req.user.hospitalId, branchId: req.user.branchId },
            { status: "arrived" },
            { new: true }
        );

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        res.json({ message: "Patient arrived", appointment });
    } catch (err) {
        logger.error("Appointment Arrival Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
