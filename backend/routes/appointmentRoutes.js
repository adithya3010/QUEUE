const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const logger = require("../utils/logger");
const { generateSlots, formatTimeStr } = require("../utils/slotGenerator");

// ─── PUBLIC routes (no auth — for kiosk use) ──────────────────────────────────

// GET /appointments/public/:hospitalId/:branchId/doctors
// Returns available doctors for a given branch
router.get("/public/:hospitalId/:branchId/doctors", async (req, res) => {
    try {
        const { hospitalId, branchId } = req.params;
        const doctors = await User.find({
            hospitalId,
            branchId,
            role: "DOCTOR",
            availability: "Available"
        }).select("name specialization avgConsultationTime schedule availability");

        res.json({ success: true, doctors });
    } catch (err) {
        logger.error("Public Doctors Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /appointments/public/:hospitalId/:branchId/slots/:doctorId?date=YYYY-MM-DD
// Returns available time slots for a doctor on the given date
router.get("/public/:hospitalId/:branchId/slots/:doctorId", async (req, res) => {
    try {
        const { hospitalId, branchId, doctorId } = req.params;
        const { date } = req.query;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
        }

        // Reject dates more than 7 days in the future
        const requestedDate = new Date(date + "T00:00:00");
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        if (requestedDate > maxDate) {
            return res.status(400).json({ message: "Can only book up to 7 days in advance" });
        }

        const doctor = await User.findOne({ _id: doctorId, hospitalId, branchId, role: "DOCTOR" })
            .select("name avgConsultationTime schedule");
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        // Get already booked slots for this day
        const dayStart = new Date(date + "T00:00:00");
        const dayEnd = new Date(date + "T23:59:59");

        const booked = await Appointment.find({
            doctorId,
            hospitalId,
            scheduledAt: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ["scheduled", "arrived"] }
        }).select("scheduledAt");

        const bookedSlots = booked.map(a => formatTimeStr(new Date(a.scheduledAt)));

        const slots = generateSlots(doctor, date, bookedSlots);

        res.json({
            success: true,
            date,
            doctor: { name: doctor.name, avgConsultationTime: doctor.avgConsultationTime },
            slots,
            totalAvailable: slots.length
        });
    } catch (err) {
        logger.error("Get Slots Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// POST /appointments/public/:hospitalId/:branchId/book
// Book an appointment (public, no auth needed — kiosk use)
router.post("/public/:hospitalId/:branchId/book", async (req, res) => {
    try {
        const { hospitalId, branchId } = req.params;
        const { doctorId, patientName, phone, date, time, notes } = req.body;

        if (!doctorId || !patientName || !date || !time) {
            return res.status(400).json({ message: "doctorId, patientName, date, and time are required" });
        }

        const doctor = await User.findOne({ _id: doctorId, hospitalId, branchId, role: "DOCTOR" })
            .select("name avgConsultationTime schedule");
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        // Construct the scheduledAt datetime
        const scheduledAt = new Date(`${date}T${time}:00`);
        if (isNaN(scheduledAt.getTime())) {
            return res.status(400).json({ message: "Invalid date/time format" });
        }
        if (scheduledAt < new Date()) {
            return res.status(400).json({ message: "Cannot book a slot in the past" });
        }

        // Check if this slot is still available (prevent race conditions)
        const existing = await Appointment.findOne({
            doctorId,
            hospitalId,
            scheduledAt,
            status: { $in: ["scheduled", "arrived"] }
        });
        if (existing) {
            return res.status(409).json({ message: "This slot was just taken. Please choose another." });
        }

        const appointment = await Appointment.create({
            hospitalId,
            branchId,
            doctorId,
            patientName: patientName.trim(),
            phone: phone?.trim() || "",
            scheduledAt,
            notes: notes?.trim() || "",
            status: "scheduled"
        });

        logger.info("Appointment booked via kiosk", { appointmentId: appointment._id, doctorId, scheduledAt });

        res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointment: {
                id: appointment._id,
                doctorName: doctor.name,
                date,
                time,
                scheduledAt
            }
        });
    } catch (err) {
        logger.error("Public Book Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── Simpler public routes for kiosk (hospitalId only, branchId resolved server-side) ─

// GET /appointments/public/:hospitalId/slots/:doctorId?date=YYYY-MM-DD
router.get("/public/:hospitalId/slots/:doctorId", async (req, res) => {
    try {
        const { hospitalId, doctorId } = req.params;
        const { date } = req.query;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
        }

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        if (new Date(date + "T00:00:00") > maxDate) {
            return res.status(400).json({ message: "Can only book up to 7 days in advance" });
        }

        const doctor = await User.findOne({ _id: doctorId, hospitalId, role: "DOCTOR" })
            .select("name avgConsultationTime schedule");
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        const dayStart = new Date(date + "T00:00:00");
        const dayEnd = new Date(date + "T23:59:59");
        const booked = await Appointment.find({
            doctorId, hospitalId,
            scheduledAt: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ["scheduled", "arrived"] }
        }).select("scheduledAt");

        const bookedSlots = booked.map(a => formatTimeStr(new Date(a.scheduledAt)));
        const slots = generateSlots(doctor, date, bookedSlots);

        res.json({ success: true, date, doctor: { name: doctor.name, avgConsultationTime: doctor.avgConsultationTime }, slots, totalAvailable: slots.length });
    } catch (err) {
        logger.error("Get Slots Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// POST /appointments/public/:hospitalId/book
router.post("/public/:hospitalId/book", async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { doctorId, patientName, phone, date, time, notes } = req.body;

        if (!doctorId || !patientName || !date || !time) {
            return res.status(400).json({ message: "doctorId, patientName, date, and time are required" });
        }

        const doctor = await User.findOne({ _id: doctorId, hospitalId, role: "DOCTOR" })
            .select("name avgConsultationTime schedule branchId");
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        // Resolve branchId from doctor or hospital
        let branchId = doctor.branchId;
        if (!branchId) {
            const Hospital = require("../models/Hospital");
            const hospital = await Hospital.findById(hospitalId);
            branchId = hospital?.branches?.[0]?._id;
        }
        if (!branchId) return res.status(400).json({ message: "No branch found for this hospital" });

        const scheduledAt = new Date(`${date}T${time}:00`);
        if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
            return res.status(400).json({ message: "Invalid or past date/time" });
        }

        const existing = await Appointment.findOne({
            doctorId, hospitalId, scheduledAt,
            status: { $in: ["scheduled", "arrived"] }
        });
        if (existing) return res.status(409).json({ message: "This slot was just taken. Please choose another." });

        const appointment = await Appointment.create({
            hospitalId, branchId, doctorId,
            patientName: patientName.trim(),
            phone: phone?.trim() || "",
            scheduledAt,
            notes: notes?.trim() || "",
            status: "scheduled"
        });

        logger.info("Appointment booked via kiosk", { appointmentId: appointment._id, doctorId, scheduledAt });

        res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointment: { id: appointment._id, doctorName: doctor.name, date, time, scheduledAt }
        });
    } catch (err) {
        logger.error("Public Book Error (hospitalId only)", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});


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

// GET /appointments/doctor/:doctorId/upcoming
// Returns next 7 days of appointments for a doctor (used by doctor, receptionist, admin)
router.get("/doctor/:doctorId/upcoming", auth, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const hospitalId = req.user.hospitalId;

        const now = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        sevenDaysLater.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            doctorId,
            hospitalId,
            scheduledAt: { $gte: now, $lte: sevenDaysLater },
            status: { $in: ["scheduled", "arrived"] }
        }).sort({ scheduledAt: 1 });

        res.json(appointments);
    } catch (err) {
        logger.error("Get Upcoming Appointments Error", { error: err.message });
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
