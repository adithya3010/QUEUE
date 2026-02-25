const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Patient = require("../models/Patient");

// Kiosk: Fetch all doctors and their active queue lengths for a given hospital
router.get("/:hospitalId/doctors", async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const doctors = await User.find({ hospitalId, role: "DOCTOR", availability: "Available" }).select('name specialization avgConsultationTime');

        // Let's get the active queue length for each doctor
        const doctorsWithQueues = await Promise.all(doctors.map(async (doc) => {
            const queueCount = await Patient.countDocuments({
                doctorId: doc._id,
                status: { $in: ["Waiting", "In Progress"] },
                date: {
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999)
                }
            });
            return {
                _id: doc._id,
                name: doc.name,
                specialization: doc.specialization,
                avgConsultationTime: doc.avgConsultationTime,
                currentQueueLength: queueCount,
                estimatedWaitMins: queueCount * doc.avgConsultationTime
            };
        }));

        res.json({ success: true, data: doctorsWithQueues });
    } catch (err) {
        console.error("Kiosk Doctor fetch error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Kiosk: Create a new queue entry (Self check-in)
router.post("/:hospitalId/enqueue", async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { doctorId, name, phone, description } = req.body;

        if (!doctorId || !name) {
            return res.status(400).json({ message: "Doctor and Name are required" });
        }

        // Get today's start and end for token number calculation
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Calculate token number
        const lastPatient = await Patient.findOne({
            doctorId,
            date: { $gte: startOfDay, $lt: endOfDay }
        }).sort({ tokenNumber: -1 });

        const tokenNumber = lastPatient ? lastPatient.tokenNumber + 1 : 1;

        // Create Patient
        const patient = new Patient({
            hospitalId,
            doctorId,
            name,
            phone: phone || "Walk-in",
            description: description || "Self check-in via Kiosk",
            tokenNumber,
            status: "Waiting",
            date: new Date()
        });

        await patient.save();

        // Emit WebSocket updates to the hospital broadcast room and the specific doctor
        const io = req.app.get("io");
        if (io) {
            io.to(`doctor_${doctorId}`).emit("queueUpdated");
            io.to(doctorId.toString()).emit("queueUpdated"); // Legacy
            io.to(`hospital_${hospitalId}`).emit("queueUpdated"); // Multi-tenant
        }

        res.status(201).json({
            success: true,
            message: "Added to queue successfully",
            tokenNumber
        });
    } catch (err) {
        console.error("Kiosk enqueue error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Display Board: Fetch the currently serving token for every available doctor in the hospital
router.get("/:hospitalId/display", async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const doctors = await User.find({ hospitalId, role: "DOCTOR", availability: { $in: ["Available", "Not Available"] } }).select('name specialization');

        // Get today's start and end bounds
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const displayData = await Promise.all(doctors.map(async (doc) => {
            // "In Progress" is currently serving, if none, maybe the next "Waiting"
            const currentlyServing = await Patient.findOne({
                doctorId: doc._id,
                status: "In Progress",
                date: { $gte: startOfDay, $lt: endOfDay }
            }).select('tokenNumber name').sort({ tokenNumber: 1 });

            return {
                doctorId: doc._id,
                doctorName: doc.name,
                specialization: doc.specialization,
                servingToken: currentlyServing ? currentlyServing.tokenNumber : "---"
            };
        }));

        res.json({ success: true, data: displayData });
    } catch (err) {
        console.error("Display fetch error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
