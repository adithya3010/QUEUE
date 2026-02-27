const express     = require("express");
const router      = express.Router();
const { auth }    = require("../middleware/authMiddleware");
const Appointment = require("../models/Appointment");
const User        = require("../models/User");
const Organization = require("../models/Organization");
const logger      = require("../utils/logger");
const { generateSlots, formatTimeStr } = require("../utils/slotGenerator");

async function assertAppointmentsEnabledForOrgId(orgId) {
    const org = await Organization.findById(orgId).select("industry settings.allowAppointments");
    if (!org) return { ok: false, status: 404, message: "Organization not found" };

    const allowAppointments = org.settings?.allowAppointments !== false;
    const isSalon = org.industry === "salon";
    if (!allowAppointments || isSalon) {
        return { ok: false, status: 403, message: "Appointments are disabled for this organization" };
    }

    return { ok: true };
}

const AGENT_ROLES = ["AGENT", "DOCTOR"]; // support legacy data where staff were stored as DOCTOR

// ─── PUBLIC routes (no auth — for kiosk/self-service use) ────────────────────

// GET /appointments/public/:orgId/agents?locationId=
// Returns available agents for a given organization (and optionally location)
router.get("/public/:orgId/agents", async (req, res) => {
    try {
        const { orgId } = req.params;
        const { locationId } = req.query;

        const policy = await assertAppointmentsEnabledForOrgId(orgId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const filter = {
            organizationId: orgId,
            role:           { $in: AGENT_ROLES },
            availability:   "Available"
        };
        if (locationId) filter.locationId = locationId;

        const agents = await User.find(filter)
            .select("name serviceCategory avgSessionDuration schedule availability")
            .populate("serviceId", "name category");

        res.json({ success: true, agents });
    } catch (err) {
        logger.error("Public Agents Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /appointments/public/:orgId/slots/:agentId?date=YYYY-MM-DD
// Returns available time slots for an agent on the given date
router.get("/public/:orgId/slots/:agentId", async (req, res) => {
    try {
        const { orgId, agentId } = req.params;
        const { date } = req.query;

        const policy = await assertAppointmentsEnabledForOrgId(orgId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

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

        const agent = await User.findOne({ _id: agentId, organizationId: orgId, role: { $in: AGENT_ROLES } })
            .select("name avgSessionDuration schedule");
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        const dayStart = new Date(date + "T00:00:00");
        const dayEnd   = new Date(date + "T23:59:59");

        const booked = await Appointment.find({
            agentId,
            organizationId: orgId,
            scheduledAt:    { $gte: dayStart, $lte: dayEnd },
            status:         { $in: ["scheduled", "arrived"] }
        }).select("scheduledAt");

        const bookedSlots = booked.map(a => formatTimeStr(new Date(a.scheduledAt)));
        const slots       = generateSlots(agent, date, bookedSlots);

        res.json({
            success:        true,
            date,
            agent:          { name: agent.name, avgSessionDuration: agent.avgSessionDuration },
            slots,
            totalAvailable: slots.length
        });
    } catch (err) {
        logger.error("Get Slots Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// POST /appointments/public/:orgId/book
// Book an appointment (public, no auth needed — kiosk / self-service)
router.post("/public/:orgId/book", async (req, res) => {
    try {
        const { orgId } = req.params;
        const { agentId, clientName, clientPhone, clientEmail, date, time, notes, serviceId } = req.body;

        // Backwards-compat for older kiosk payloads
        const resolvedAgentId = agentId || req.body.doctorId;
        const resolvedClientName = clientName || req.body.patientName;
        const resolvedClientPhone = clientPhone || req.body.phone;
        const resolvedClientEmail = clientEmail || req.body.email;

        const policy = await assertAppointmentsEnabledForOrgId(orgId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        if (!resolvedAgentId || !resolvedClientName || !date || !time) {
            return res.status(400).json({ message: "agentId, clientName, date, and time are required" });
        }

        const agent = await User.findOne({ _id: resolvedAgentId, organizationId: orgId, role: { $in: AGENT_ROLES } })
            .select("name avgSessionDuration schedule locationId");
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        const scheduledAt = new Date(`${date}T${time}:00`);
        if (isNaN(scheduledAt.getTime()))    return res.status(400).json({ message: "Invalid date/time format" });
        if (scheduledAt < new Date())        return res.status(400).json({ message: "Cannot book a slot in the past" });

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        if (scheduledAt > maxDate) return res.status(400).json({ message: "Can only book up to 7 days in advance" });

        const existing = await Appointment.findOne({
            agentId: resolvedAgentId,
            organizationId: orgId,
            scheduledAt,
            status: { $in: ["scheduled", "arrived"] }
        });
        if (existing) return res.status(409).json({ message: "This slot was just taken. Please choose another." });

        const appointment = await Appointment.create({
            organizationId: orgId,
            locationId:     agent.locationId,
            agentId:        resolvedAgentId,
            serviceId:      serviceId || agent.serviceId,
            clientName:     resolvedClientName.trim(),
            clientPhone:    resolvedClientPhone?.trim() || "",
            clientEmail:    resolvedClientEmail?.trim() || "",
            scheduledAt,
            notes:          notes?.trim() || "",
            status:         "scheduled"
        });

        logger.info("Appointment booked via public endpoint", { appointmentId: appointment._id, agentId: resolvedAgentId, scheduledAt });

        res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointment: {
                id:        appointment._id,
                agentName: agent.name,
                doctorName: agent.name,
                serviceName: agent.name,
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

// ─── Authenticated routes ─────────────────────────────────────────────────────

// POST /appointments/book — book via authenticated staff (operator / agent)
router.post("/book", auth, async (req, res) => {
    try {
        const { agentId, clientName, clientPhone, clientEmail, scheduledAt, notes, serviceId } = req.body;
        const organizationId = req.user.organizationId;
        const locationId     = req.user.locationId;

        const policy = await assertAppointmentsEnabledForOrgId(organizationId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const agent = await User.findOne({ _id: agentId, organizationId, role: { $in: AGENT_ROLES } });
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        const appointment = await Appointment.create({
            organizationId,
            locationId:  locationId || agent.locationId,
            agentId,
            serviceId:   serviceId || agent.serviceId,
            clientName,
            clientPhone: clientPhone || "",
            clientEmail: clientEmail || "",
            scheduledAt,
            notes:       notes || "",
            status:      "scheduled"
        });

        res.status(201).json({ message: "Appointment booked successfully", appointment });
    } catch (err) {
        logger.error("Book Appointment Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /appointments/agent/:agentId/today — today's appointments for an agent
router.get("/agent/:agentId/today", auth, async (req, res) => {
    try {
        const { agentId }    = req.params;
        const organizationId = req.user.organizationId;

        const policy = await assertAppointmentsEnabledForOrgId(organizationId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            agentId,
            organizationId,
            scheduledAt: { $gte: startOfDay, $lte: endOfDay },
            status:      { $in: ["scheduled", "arrived"] }
        }).sort({ scheduledAt: 1 });

        res.json(appointments);
    } catch (err) {
        logger.error("Get Appointments Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /appointments/agent/:agentId/upcoming — next 7 days
router.get("/agent/:agentId/upcoming", auth, async (req, res) => {
    try {
        const { agentId }    = req.params;
        const organizationId = req.user.organizationId;

        const policy = await assertAppointmentsEnabledForOrgId(organizationId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const now            = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        sevenDaysLater.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            agentId,
            organizationId,
            scheduledAt: { $gte: now, $lte: sevenDaysLater },
            status:      { $in: ["scheduled", "arrived"] }
        }).sort({ scheduledAt: 1 });

        res.json(appointments);
    } catch (err) {
        logger.error("Get Upcoming Appointments Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /appointments/:id/arrive — mark appointment arrived
router.put("/:id/arrive", auth, async (req, res) => {
    try {
        const policy = await assertAppointmentsEnabledForOrgId(req.user.organizationId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            { status: "arrived" },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        res.json({ message: "Client arrived", appointment });
    } catch (err) {
        logger.error("Appointment Arrival Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /appointments/:id/cancel — cancel appointment
router.put("/:id/cancel", auth, async (req, res) => {
    try {
        const policy = await assertAppointmentsEnabledForOrgId(req.user.organizationId);
        if (!policy.ok) return res.status(policy.status).json({ message: policy.message });

        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            { status: "cancelled" },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        res.json({ message: "Appointment cancelled", appointment });
    } catch (err) {
        logger.error("Appointment Cancel Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── Backward-compat aliases for old /doctor/:doctorId routes ─────────────────
router.get("/doctor/:doctorId/today",    auth, (req, res, next) => {
    req.params.agentId = req.params.doctorId;
    next("route");
});
router.get("/doctor/:doctorId/upcoming", auth, (req, res, next) => {
    req.params.agentId = req.params.doctorId;
    next("route");
});

module.exports = router;
