const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Webhook = require('../models/Webhook');
const { Types } = require('mongoose');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { generateSlots, formatTimeStr } = require('../utils/slotGenerator');

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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — DISCOVERY LAYER
// ─────────────────────────────────────────────────────────────────────────────

// GET /v1/info
// Returns the hospital profile and subscription plan for the API key holder
exports.getHospitalInfo = async (req, res) => {
    try {
        const hospital = req.hospital;
        res.json({
            success: true,
            data: {
                id: hospital._id,
                name: hospital.name,
                email: hospital.email,
                subscriptionPlan: hospital.subscriptionPlan,
                status: hospital.status,
                branchCount: hospital.branches ? hospital.branches.length : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// GET /v1/branches
// Lists all branches of the hospital tied to this API key
exports.getBranches = async (req, res) => {
    try {
        const hospital = req.hospital;
        const branches = (hospital.branches || []).map(b => ({
            id: b._id,
            name: b.name,
            address: b.address || null,
            isActive: b.isActive
        }));
        res.json({ success: true, data: branches, total: branches.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// GET /v1/doctors
// Lists doctors in the hospital. Optional query filters:
//   ?branchId=   filter by branch
//   ?specialty=  filter by specialization (case-insensitive partial match)
//   ?availability= Available | Not Available
exports.getDoctors = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { branchId, specialty, availability } = req.query;

        const filter = { hospitalId, role: 'DOCTOR' };
        if (branchId) {
            if (!Types.ObjectId.isValid(branchId))
                return res.status(400).json({ success: false, error: 'Invalid branchId' });
            filter.branchId = branchId;
        }
        if (specialty) {
            filter.specialization = { $regex: specialty, $options: 'i' };
        }
        if (availability) {
            if (!['Available', 'Not Available'].includes(availability))
                return res.status(400).json({ success: false, error: 'availability must be "Available" or "Not Available"' });
            filter.availability = availability;
        }

        const doctors = await Doctor.find(filter)
            .select('name specialization availability avgConsultationTime branchId pauseMessage schedule');

        const data = doctors.map(d => ({
            id: d._id,
            name: d.name,
            specialization: d.specialization,
            availability: d.availability,
            avgConsultationTime: d.avgConsultationTime,
            branchId: d.branchId,
            pauseMessage: d.availability === 'Not Available' ? (d.pauseMessage || null) : null,
            workingDays: (d.schedule || []).map(s => s.day)
        }));

        res.json({ success: true, data, total: data.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// GET /v1/doctors/:doctorId/slots?date=YYYY-MM-DD
// Returns available appointment slots for a doctor on a given date
exports.getDoctorSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(doctorId))
            return res.status(400).json({ success: false, error: 'Invalid doctorId' });
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
            return res.status(400).json({ success: false, error: 'date query param required (YYYY-MM-DD)' });

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        if (new Date(date + 'T00:00:00') > maxDate)
            return res.status(400).json({ success: false, error: 'Can only query up to 7 days in advance' });

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId, role: 'DOCTOR' })
            .select('name specialization avgConsultationTime schedule availability');
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        const dayStart = new Date(date + 'T00:00:00');
        const dayEnd = new Date(date + 'T23:59:59');
        const booked = await Appointment.find({
            doctorId,
            hospitalId,
            scheduledAt: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ['scheduled', 'arrived'] }
        }).select('scheduledAt');

        const bookedSlots = booked.map(a => formatTimeStr(new Date(a.scheduledAt)));
        const slots = generateSlots(doctor, date, bookedSlots);

        res.json({
            success: true,
            data: {
                doctorId: doctor._id,
                doctorName: doctor.name,
                specialization: doctor.specialization,
                availability: doctor.availability,
                date,
                slots,
                totalAvailable: slots.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — RICHER QUEUE CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

// GET /v1/queue
// Lists queue entries for the hospital. Optional filters:
//   ?doctorId=  filter by doctor
//   ?branchId=  filter by branch
//   ?status=    waiting | completed | cancelled  (default: waiting)
exports.listQueue = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { doctorId, branchId, status = 'waiting' } = req.query;

        const validStatuses = ['waiting', 'completed', 'cancelled'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ success: false, error: 'status must be waiting, completed, or cancelled' });

        const filter = { hospitalId, status };
        if (doctorId) {
            if (!Types.ObjectId.isValid(doctorId))
                return res.status(400).json({ success: false, error: 'Invalid doctorId' });
            filter.doctorId = doctorId;
        }
        if (branchId) {
            if (!Types.ObjectId.isValid(branchId))
                return res.status(400).json({ success: false, error: 'Invalid branchId' });
            filter.branchId = branchId;
        }

        const queue = await Patient.find(filter)
            .sort({ sortOrder: 1, tokenNumber: 1 })
            .select('externalPatientId name tokenNumber status doctorId branchId uniqueLinkId createdAt description');

        const data = queue.map((p, index) => ({
            id: p._id,
            externalPatientId: p.externalPatientId || null,
            name: p.name || null,
            tokenNumber: p.tokenNumber,
            position: index + 1,
            status: p.status,
            doctorId: p.doctorId,
            branchId: p.branchId,
            description: p.description || null,
            trackingUrl: `${process.env.FRONTEND_URL}/status/${p.uniqueLinkId}`,
            createdAt: p.createdAt
        }));

        res.json({ success: true, data, total: data.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// PUT /v1/queue/:uniqueLinkId/priority
// Moves a waiting patient to the front of their doctor's queue
exports.prioritizeQueueEntry = async (req, res) => {
    try {
        const { uniqueLinkId } = req.params;
        const hospitalId = req.hospital._id;

        const patient = await Patient.findOne({ uniqueLinkId, hospitalId, status: 'waiting' });
        if (!patient) return res.status(404).json({ success: false, error: 'Waiting queue entry not found' });

        // Find minimum sortOrder in this doctor's queue and place patient before it
        const topPatient = await Patient.findOne({ doctorId: patient.doctorId, hospitalId, status: 'waiting' })
            .sort({ sortOrder: 1, tokenNumber: 1 });

        const newSortOrder = topPatient
            ? (topPatient.sortOrder != null ? topPatient.sortOrder - 1 : topPatient.tokenNumber - 1)
            : 0;

        patient.sortOrder = newSortOrder;
        await patient.save();

        const io = global.io;
        if (io) {
            io.to(patient.doctorId.toString()).emit('queueUpdated');
            io.to(`hospital_${hospitalId}`).emit('queueUpdated');
        }

        await dispatchWebhook(hospitalId, 'queue.updated', {
            id: patient._id,
            externalPatientId: patient.externalPatientId,
            doctorId: patient.doctorId,
            tokenNumber: patient.tokenNumber,
            action: 'prioritized'
        });

        res.json({ success: true, message: 'Patient moved to front of queue', tokenNumber: patient.tokenNumber });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// PUT /v1/queue/:uniqueLinkId/notes
// Attaches or updates a clinical note on a queue entry
exports.updateQueueNotes = async (req, res) => {
    try {
        const { uniqueLinkId } = req.params;
        const { notes } = req.body;
        const hospitalId = req.hospital._id;

        if (typeof notes !== 'string' || notes.trim().length === 0)
            return res.status(400).json({ success: false, error: 'notes (string) is required' });

        const patient = await Patient.findOneAndUpdate(
            { uniqueLinkId, hospitalId },
            { notes: notes.trim() },
            { new: true }
        );
        if (!patient) return res.status(404).json({ success: false, error: 'Queue entry not found' });

        res.json({ success: true, message: 'Notes updated', id: patient._id });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// POST /v1/queue/bulk
// Adds multiple patients to a doctor's queue in a single request
// Body: { doctorId, patients: [{ externalPatientId?, name?, description?, number? }, ...] }
exports.bulkCreateQueueEntries = async (req, res) => {
    try {
        const { doctorId, patients } = req.body;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(doctorId))
            return res.status(400).json({ success: false, error: 'Invalid doctorId' });
        if (!Array.isArray(patients) || patients.length === 0)
            return res.status(400).json({ success: false, error: 'patients array is required and must not be empty' });
        if (patients.length > 50)
            return res.status(400).json({ success: false, error: 'Maximum 50 patients per bulk request' });

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId, role: 'DOCTOR' });
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        let branchId = doctor.branchId;
        if (!branchId && req.hospital.branches && req.hospital.branches.length > 0)
            branchId = req.hospital.branches[0]._id;

        // Get current max token number for this doctor
        const lastPatient = await Patient.findOne({ doctorId }).sort({ tokenNumber: -1 });
        let nextToken = lastPatient ? lastPatient.tokenNumber + 1 : 1;

        const crypto = require('crypto');
        const docs = patients.map(p => ({
            hospitalId,
            branchId,
            doctorId,
            externalPatientId: p.externalPatientId || undefined,
            name: p.name || undefined,
            description: p.description || undefined,
            number: p.number || undefined,
            tokenNumber: nextToken++,
            uniqueLinkId: crypto.randomUUID(),
            status: 'waiting'
        }));

        const created = await Patient.insertMany(docs);

        const io = global.io;
        if (io) {
            io.to(doctorId.toString()).emit('queueUpdated');
            io.to(`hospital_${hospitalId}`).emit('queueUpdated');
        }

        await dispatchWebhook(hospitalId, 'queue.created', {
            bulk: true,
            doctorId,
            count: created.length
        });

        res.status(201).json({
            success: true,
            message: `${created.length} patients added to queue`,
            data: created.map(p => ({
                id: p._id,
                externalPatientId: p.externalPatientId || null,
                tokenNumber: p.tokenNumber,
                trackingUrl: `${process.env.FRONTEND_URL}/status/${p.uniqueLinkId}`
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

// GET /v1/queue/stats
// Returns live queue statistics across all doctors (or a specific doctor via ?doctorId=)
exports.getQueueStats = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { doctorId } = req.query;

        const matchFilter = { hospitalId };
        if (doctorId) {
            if (!Types.ObjectId.isValid(doctorId))
                return res.status(400).json({ success: false, error: 'Invalid doctorId' });
            matchFilter.doctorId = new Types.ObjectId(doctorId);
        }

        // Aggregate counts grouped by doctor
        const grouped = await Patient.aggregate([
            { $match: { ...matchFilter, status: 'waiting' } },
            {
                $group: {
                    _id: '$doctorId',
                    waitingCount: { $sum: 1 }
                }
            }
        ]);

        // Fetch relevant doctors for avg consultation time
        const doctorIds = grouped.map(g => g._id);
        const doctors = await Doctor.find({ _id: { $in: doctorIds }, hospitalId })
            .select('name availability avgConsultationTime');

        const doctorMap = {};
        doctors.forEach(d => { doctorMap[d._id.toString()] = d; });

        const perDoctor = grouped.map(g => {
            const doc = doctorMap[g._id.toString()];
            const avgTime = doc ? doc.avgConsultationTime : 8;
            return {
                doctorId: g._id,
                doctorName: doc ? doc.name : null,
                availability: doc ? doc.availability : null,
                waitingCount: g.waitingCount,
                estimatedClearTimeMinutes: g.waitingCount * avgTime
            };
        });

        const totalWaiting = perDoctor.reduce((sum, d) => sum + d.waitingCount, 0);
        const activeDoctors = perDoctor.filter(d => d.availability === 'Available').length;

        res.json({
            success: true,
            data: {
                totalWaiting,
                activeDoctors,
                perDoctor
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — APPOINTMENT LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// GET /v1/appointments
// Lists appointments. Optional filters:
//   ?doctorId=   filter by doctor
//   ?date=       YYYY-MM-DD — filter by scheduled date
//   ?status=     scheduled | arrived | completed | cancelled
exports.listAppointments = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { doctorId, date, status } = req.query;

        const filter = { hospitalId };
        if (doctorId) {
            if (!Types.ObjectId.isValid(doctorId))
                return res.status(400).json({ success: false, error: 'Invalid doctorId' });
            filter.doctorId = doctorId;
        }
        if (status) {
            const validStatuses = ['scheduled', 'arrived', 'completed', 'cancelled'];
            if (!validStatuses.includes(status))
                return res.status(400).json({ success: false, error: 'Invalid status value' });
            filter.status = status;
        }
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
                return res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
            filter.scheduledAt = {
                $gte: new Date(date + 'T00:00:00'),
                $lte: new Date(date + 'T23:59:59')
            };
        }

        const appointments = await Appointment.find(filter)
            .sort({ scheduledAt: 1 })
            .select('patientName phone scheduledAt status doctorId branchId notes tokenNumber createdAt');

        res.json({ success: true, data: appointments, total: appointments.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// PUT /v1/appointments/:id/arrive
// Marks an appointment as arrived and creates a live queue token for the patient
exports.arriveAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(id))
            return res.status(400).json({ success: false, error: 'Invalid appointment id' });

        const appointment = await Appointment.findOne({ _id: id, hospitalId, status: 'scheduled' });
        if (!appointment) return res.status(404).json({ success: false, error: 'Scheduled appointment not found' });

        appointment.status = 'arrived';
        await appointment.save();

        // Create a walk-in queue token for this arrived patient
        const doctor = await Doctor.findOne({ _id: appointment.doctorId, hospitalId }).select('branchId avgConsultationTime');

        let branchId = appointment.branchId || doctor?.branchId;
        if (!branchId && req.hospital.branches && req.hospital.branches.length > 0)
            branchId = req.hospital.branches[0]._id;

        const lastPatient = await Patient.findOne({ doctorId: appointment.doctorId }).sort({ tokenNumber: -1 });
        const tokenNumber = lastPatient ? lastPatient.tokenNumber + 1 : 1;
        const uniqueLinkId = require('crypto').randomUUID();

        const queueEntry = await Patient.create({
            hospitalId,
            branchId,
            doctorId: appointment.doctorId,
            name: appointment.patientName,
            number: appointment.phone,
            description: appointment.notes || 'Scheduled appointment',
            tokenNumber,
            uniqueLinkId,
            status: 'waiting'
        });

        // Update appointment with the assigned token
        appointment.tokenNumber = tokenNumber;
        await appointment.save();

        const io = global.io;
        if (io) {
            io.to(appointment.doctorId.toString()).emit('queueUpdated');
            io.to(`hospital_${hospitalId}`).emit('queueUpdated');
        }

        await dispatchWebhook(hospitalId, 'queue.created', {
            id: queueEntry._id,
            doctorId: queueEntry.doctorId,
            tokenNumber: queueEntry.tokenNumber,
            source: 'appointment_arrival',
            appointmentId: appointment._id
        });

        res.json({
            success: true,
            message: 'Patient arrived and added to live queue',
            data: {
                appointmentId: appointment._id,
                queueEntryId: queueEntry._id,
                tokenNumber,
                trackingUrl: `${process.env.FRONTEND_URL}/status/${uniqueLinkId}`
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
};

// PUT /v1/appointments/:id/cancel
// Cancels a scheduled appointment
exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = req.hospital._id;

        if (!Types.ObjectId.isValid(id))
            return res.status(400).json({ success: false, error: 'Invalid appointment id' });

        const appointment = await Appointment.findOneAndUpdate(
            { _id: id, hospitalId, status: { $in: ['scheduled', 'arrived'] } },
            { status: 'cancelled' },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ success: false, error: 'Active appointment not found' });

        res.json({ success: true, message: 'Appointment cancelled', id: appointment._id });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

// GET /v1/analytics/summary?period=today|week|month
// Returns patient volume, completion rate, and average wait time for a period
exports.getAnalyticsSummary = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { period = 'today' } = req.query;

        const validPeriods = ['today', 'week', 'month'];
        if (!validPeriods.includes(period))
            return res.status(400).json({ success: false, error: 'period must be today, week, or month' });

        const now = new Date();
        let from;
        if (period === 'today') {
            from = new Date(now); from.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
        } else {
            from = new Date(now); from.setDate(1); from.setHours(0, 0, 0, 0);
        }

        const [stats] = await Patient.aggregate([
            { $match: { hospitalId: new Types.ObjectId(hospitalId), createdAt: { $gte: from } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
                    avgWaitMs: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                                { $subtract: ['$completedAt', '$createdAt'] },
                                null
                            ]
                        }
                    }
                }
            }
        ]);

        const result = stats || { total: 0, completed: 0, cancelled: 0, waiting: 0, avgWaitMs: null };
        const completionRate = result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;
        const avgWaitMinutes = result.avgWaitMs ? Math.round(result.avgWaitMs / 60000) : null;

        res.json({
            success: true,
            data: {
                period,
                from: from.toISOString(),
                to: now.toISOString(),
                total: result.total,
                completed: result.completed,
                cancelled: result.cancelled,
                waiting: result.waiting,
                completionRate: `${completionRate}%`,
                avgWaitMinutes
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// GET /v1/analytics/doctor/:doctorId
// Returns detailed throughput and wait time metrics for a single doctor
exports.getDoctorAnalytics = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const hospitalId = req.hospital._id;
        const { period = 'today' } = req.query;

        if (!Types.ObjectId.isValid(doctorId))
            return res.status(400).json({ success: false, error: 'Invalid doctorId' });

        const doctor = await Doctor.findOne({ _id: doctorId, hospitalId, role: 'DOCTOR' })
            .select('name specialization availability avgConsultationTime metrics');
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        const now = new Date();
        let from;
        if (period === 'week') {
            from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            from = new Date(now); from.setDate(1); from.setHours(0, 0, 0, 0);
        } else {
            from = new Date(now); from.setHours(0, 0, 0, 0);
        }

        const [stats] = await Patient.aggregate([
            {
                $match: {
                    hospitalId: new Types.ObjectId(hospitalId),
                    doctorId: new Types.ObjectId(doctorId),
                    createdAt: { $gte: from }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
                    avgWaitMs: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                                { $subtract: ['$completedAt', '$createdAt'] },
                                null
                            ]
                        }
                    }
                }
            }
        ]);

        const result = stats || { total: 0, completed: 0, cancelled: 0, waiting: 0, avgWaitMs: null };

        res.json({
            success: true,
            data: {
                doctorId: doctor._id,
                name: doctor.name,
                specialization: doctor.specialization,
                availability: doctor.availability,
                avgConsultationTime: doctor.avgConsultationTime,
                period,
                total: result.total,
                completed: result.completed,
                cancelled: result.cancelled,
                waiting: result.waiting,
                avgWaitMinutes: result.avgWaitMs ? Math.round(result.avgWaitMs / 60000) : null,
                allTimePatientsSeen: doctor.metrics ? doctor.metrics.totalPatientsSeen : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// GET /v1/analytics/wait-times?date=YYYY-MM-DD
// Returns hourly patient volume for a given date (defaults to today)
// Useful for identifying peak hours and staffing decisions
exports.getWaitTimeAnalytics = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { date } = req.query;

        let dateStr;
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
                return res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
            dateStr = date;
        } else {
            dateStr = new Date().toISOString().slice(0, 10);
        }

        const dayStart = new Date(dateStr + 'T00:00:00');
        const dayEnd = new Date(dateStr + 'T23:59:59');

        const hourlyData = await Patient.aggregate([
            {
                $match: {
                    hospitalId: new Types.ObjectId(hospitalId),
                    createdAt: { $gte: dayStart, $lte: dayEnd }
                }
            },
            {
                $group: {
                    _id: { hour: { $hour: '$createdAt' } },
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    avgWaitMs: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                                { $subtract: ['$completedAt', '$createdAt'] },
                                null
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.hour': 1 } }
        ]);

        // Fill all 24 hours so integrators get a consistent shape
        const hours = Array.from({ length: 24 }, (_, hour) => {
            const found = hourlyData.find(h => h._id.hour === hour);
            return {
                hour,
                label: `${String(hour).padStart(2, '0')}:00`,
                total: found ? found.total : 0,
                completed: found ? found.completed : 0,
                avgWaitMinutes: found && found.avgWaitMs ? Math.round(found.avgWaitMs / 60000) : null
            };
        });

        const peakHour = hours.reduce((max, h) => h.total > max.total ? h : max, hours[0]);

        res.json({
            success: true,
            data: {
                date: dateStr,
                peakHour: peakHour.total > 0 ? peakHour.label : null,
                hours
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — DEVELOPER TOOLING
// ─────────────────────────────────────────────────────────────────────────────

// POST /v1/webhooks/test
// Fires a simulated webhook event to all registered endpoints for the given event type.
// Body: { event: "queue.created" | "queue.updated" | "queue.completed" | "queue.cancelled" | "doctor.status_changed" }
exports.testWebhook = async (req, res) => {
    try {
        const hospitalId = req.hospital._id;
        const { event } = req.body;

        const validEvents = ['queue.created', 'queue.updated', 'queue.completed', 'queue.cancelled', 'doctor.status_changed'];
        if (!event || !validEvents.includes(event))
            return res.status(400).json({
                success: false,
                error: `event is required. Valid values: ${validEvents.join(', ')}`
            });

        const endpoints = await Webhook.find({ hospitalId, isActive: true, events: { $in: [event] } });
        if (endpoints.length === 0)
            return res.status(404).json({
                success: false,
                error: `No active webhooks registered for event "${event}"`
            });

        const mockPayloads = {
            'queue.created': { id: 'test_patient_id', externalPatientId: 'ext_123', doctorId: 'test_doctor_id', tokenNumber: 99, status: 'waiting' },
            'queue.updated': { id: 'test_patient_id', externalPatientId: 'ext_123', doctorId: 'test_doctor_id', tokenNumber: 99, action: 'prioritized' },
            'queue.completed': { id: 'test_patient_id', externalPatientId: 'ext_123', doctorId: 'test_doctor_id', tokenNumber: 99, status: 'completed' },
            'queue.cancelled': { id: 'test_patient_id', externalPatientId: 'ext_123', doctorId: 'test_doctor_id', tokenNumber: 99, status: 'cancelled' },
            'doctor.status_changed': { doctorId: 'test_doctor_id', availability: 'Not Available', pauseMessage: 'On lunch break' }
        };

        await dispatchWebhook(hospitalId, event, { ...mockPayloads[event], _test: true });

        res.json({
            success: true,
            message: `Test "${event}" event dispatched to ${endpoints.length} endpoint(s)`,
            endpoints: endpoints.map(e => ({ url: e.url, id: e._id }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
