const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { Types } = require('mongoose');
// Removed invalid import
const { dispatchWebhook } = require('../utils/webhookDispatcher');

exports.createQueueEntry = async (req, res) => {
    try {
        const { doctorId, externalPatientId, name, description, number } = req.body;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ success: false, error: 'Invalid doctorId' });
        }

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId });
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found for your API key context' });
        }

        // Get max token number
        const lastPatient = await Patient.findOne({ doctorId }).sort({ tokenNumber: -1 });
        const tokenNumber = lastPatient ? lastPatient.tokenNumber + 1 : 1;
        const uniqueLinkId = require('crypto').randomUUID();

        // Resolve branch ID
        let branchId = doctor?.branchId;
        if (!branchId && req.hospital) {
            if (req.hospital.branches && req.hospital.branches.length > 0) {
                branchId = req.hospital.branches[0]._id;
            } else {
                // Auto-create default branch for legacy hospitals
                req.hospital.branches = [{ name: "Main Branch", address: "Legacy Auto-Created" }];
                await req.hospital.save();
                branchId = req.hospital.branches[0]._id;
            }
        }

        const newPatient = new Patient({
            hospitalId,
            branchId,
            doctorId,
            externalPatientId, // Zero PII mapping
            name,  // Optional
            description, // Optional
            number, // Optional
            tokenNumber,
            uniqueLinkId,
            status: "waiting"
        });

        await newPatient.save();

        // Broadcast UI Socket to both doctor and the centralized hospital dashboard
        const io = global.io;
        if (io) {
            io.to(`doctor_${doctorId}`).emit("queueUpdated");
            // Note: internal legacy UI binds to doctorId string, let's keep it safe
            io.to(doctorId.toString()).emit("queueUpdated");
            // New QaaS B2B Multi-tenancy Emission
            io.to(`hospital_${hospitalId}`).emit("queueUpdated");
        }

        // Fire B2B Webhook
        await dispatchWebhook(hospitalId, 'queue.created', {
            id: newPatient._id,
            externalPatientId: newPatient.externalPatientId,
            doctorId: newPatient.doctorId,
            tokenNumber: newPatient.tokenNumber,
            status: newPatient.status
        });

        res.status(201).json({
            success: true,
            data: {
                id: newPatient._id,
                externalPatientId: newPatient.externalPatientId,
                tokenNumber: newPatient.tokenNumber,
                trackingUrl: `${process.env.FRONTEND_URL}/status/${newPatient.uniqueLinkId}`
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message || 'Server error creating queue' });
    }
};

exports.getDoctorStatus = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const hospitalId = req.hospital._id;

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId, role: "DOCTOR" }).select('availability avgConsultationTime');
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.getQueueStatus = async (req, res) => {
    try {
        const patient = await Patient.findOne({ uniqueLinkId: req.params.uniqueLinkId, hospitalId: req.hospital._id });
        if (!patient) return res.status(404).json({ success: false, error: 'Queue entry not found' });

        if (patient.status === 'completed' || patient.status === 'cancelled') {
            return res.json({ success: true, data: { status: patient.status } });
        }

        const queue = await Patient.find({ doctorId: patient.doctorId, status: 'waiting' }).sort({ tokenNumber: 1 });
        const position = queue.findIndex(p => p._id.toString() === patient._id.toString()) + 1;

        res.json({
            success: true,
            data: {
                status: patient.status,
                tokenNumber: patient.tokenNumber,
                position: position > 0 ? position : null,
                estimatedWaitTimeMinutes: position > 0 ? position * 5 : null // Using default 5 mins for API brevity
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.deleteQueueEntry = async (req, res) => {
    try {
        const patient = await Patient.findOneAndUpdate(
            { uniqueLinkId: req.params.uniqueLinkId, hospitalId: req.hospital._id },
            { status: 'cancelled' },
            { new: true }
        );

        if (!patient) return res.status(404).json({ success: false, error: 'Queue entry not found' });

        // Broadcast UI Socket
        const io = global.io;
        if (io) io.to(patient.doctorId.toString()).emit("queueUpdated");

        // Fire B2B Webhook
        await dispatchWebhook(req.hospital._id, 'queue.cancelled', {
            id: patient._id,
            externalPatientId: patient.externalPatientId,
            doctorId: patient.doctorId,
            tokenNumber: patient.tokenNumber,
            status: patient.status
        });

        res.json({ success: true, message: "Queue entry cancelled" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.getDoctorQueue = async (req, res) => {
    try {
        const queue = await Patient.find({ doctorId: req.params.doctorId, hospitalId: req.hospital._id, status: 'waiting' })
            .sort({ tokenNumber: 1 })
            .select('externalPatientId tokenNumber status createdAt');

        res.json({ success: true, data: queue });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.bookApiAppointment = async (req, res) => {
    try {
        const { doctorId, patientName, phone, scheduledAt, notes } = req.body;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ success: false, error: 'Invalid doctorId' });
        }

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId, role: "DOCTOR" });
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found for your API key context' });
        }

        // Resolve branch ID
        let branchId = doctor?.branchId;
        if (!branchId && req.hospital) {
            if (req.hospital.branches && req.hospital.branches.length > 0) {
                branchId = req.hospital.branches[0]._id;
            } else {
                // Auto-create default branch for legacy hospitals
                req.hospital.branches = [{ name: "Main Branch", address: "Legacy Auto-Created" }];
                await req.hospital.save();
                branchId = req.hospital.branches[0]._id;
            }
        }

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

        res.status(201).json({
            success: true,
            data: {
                id: appointment._id,
                scheduledAt: appointment.scheduledAt,
                status: appointment.status
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message || 'Server error booking appointment' });
    }
};
