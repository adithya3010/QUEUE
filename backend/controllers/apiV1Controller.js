const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
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

        const newPatient = new Patient({
            hospitalId,
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

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId }).select('availability avgConsultationTime');
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
