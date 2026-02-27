const express      = require("express");
const router       = express.Router();
const mongoose     = require("mongoose");
const Organization = require("../models/Organization");
const Service      = require("../models/Service");
const User         = require("../models/User");
const QueueEntry   = require("../models/QueueEntry");
const { v4: uuidv4 } = require("uuid");
const { sendQueueConfirmation } = require("../utils/notificationService");
const logger = require("../utils/logger");

// ─── Helper: resolve organization by slug or MongoDB ID ──────────────────────
async function resolveOrg(slugOrId) {
    if (mongoose.isValidObjectId(slugOrId)) {
        const byId = await Organization.findById(slugOrId);
        if (byId) return byId;
    }
    return Organization.findOne({ slug: slugOrId });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /kiosk/:slug/services
// Returns active services for the organization with queue length + wait times
// (Replaces: GET /kiosk/:hospitalId/doctors)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:slug/services", async (req, res) => {
    try {
        const org = await resolveOrg(req.params.slug);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const services = await Service.find({ organizationId: org._id, isActive: true });

        const servicesWithQueues = await Promise.all(services.map(async (svc) => {
            const queueCount = await QueueEntry.countDocuments({ serviceId: svc._id, status: "waiting" });
            return {
                _id:                svc._id,
                name:               svc.name,
                description:        svc.description,
                category:           svc.category,
                avgSessionDuration: svc.avgSessionDuration,
                currentQueueLength: queueCount,
                estimatedWaitMins:  queueCount * (svc.avgSessionDuration || 5)
            };
        }));

        res.json({
            success: true,
            organization: {
                id: org._id,
                name: org.name,
                slug: org.slug,
                industry: org.industry,
                settings: {
                    allowAppointments: org.settings?.allowAppointments,
                    allowWalkIn: org.settings?.allowWalkIn,
                    kioskEnabled: org.settings?.kioskEnabled,
                },
            },
            data: servicesWithQueues,
        });
    } catch (err) {
        logger.error("Kiosk Services fetch error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Backward-compat alias: old /doctors path → new /services path
router.get("/:slug/doctors", async (req, res) => {
    try {
        const org = await resolveOrg(req.params.slug);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        // Return agents in old format for backward compat
        const agents = await User.find({ organizationId: org._id, role: { $in: ["AGENT", "DOCTOR"] }, availability: "Available" })
            .select("name serviceCategory avgSessionDuration");

        const data = await Promise.all(agents.map(async (agent) => {
            const queueCount = await QueueEntry.countDocuments({ agentId: agent._id, status: "waiting" });
            return {
                _id:                agent._id,
                name:               agent.name,
                specialization:     agent.serviceCategory,   // compat alias
                serviceCategory:    agent.serviceCategory,
                avgConsultationTime: agent.avgSessionDuration, // compat alias
                avgSessionDuration:  agent.avgSessionDuration,
                currentQueueLength:  queueCount,
                estimatedWaitMins:   queueCount * (agent.avgSessionDuration || 5)
            };
        }));

        res.json({ success: true, data });
    } catch (err) {
        logger.error("Kiosk Agents (compat) fetch error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /kiosk/:slug/agents?serviceId=
// Returns available agents for a service (for agent-based queue selection)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:slug/agents", async (req, res) => {
    try {
        const org = await resolveOrg(req.params.slug);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const { serviceId } = req.query;
        const filter = { organizationId: org._id, role: { $in: ["AGENT", "DOCTOR"] }, availability: "Available" };
        if (serviceId) filter.serviceId = serviceId;

        const agents = await User.find(filter).select("name serviceCategory avgSessionDuration serviceId");

        const data = await Promise.all(agents.map(async (agent) => {
            const queueCount = await QueueEntry.countDocuments({ agentId: agent._id, status: "waiting" });
            return {
                _id:                agent._id,
                name:               agent.name,
                serviceCategory:    agent.serviceCategory,
                avgSessionDuration: agent.avgSessionDuration,
                currentQueueLength: queueCount,
                estimatedWaitMins:  queueCount * (agent.avgSessionDuration || 5)
            };
        }));

        res.json({ success: true, data });
    } catch (err) {
        logger.error("Kiosk Agents fetch error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /kiosk/:slug/enqueue
// Self check-in via kiosk
// (Replaces: POST /kiosk/:hospitalId/enqueue)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:slug/enqueue", async (req, res) => {
    try {
        const org = await resolveOrg(req.params.slug);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        // Support both new and legacy field names
        const {
            serviceId,
            agentId,
            doctorId,                 // compat alias for agentId
            clientName, name,         // clientName preferred; name is compat alias
            clientPhone, phone,       // clientPhone preferred; phone is compat alias
            notes, description        // notes preferred; description is compat alias
        } = req.body;

        const resolvedClientName  = clientName || name;
        const resolvedClientPhone = clientPhone || phone || "";
        const resolvedClientEmail = req.body.clientEmail || req.body.email || "";
        const resolvedNotes       = notes || description || "Self check-in via Kiosk";
        const resolvedAgentId     = agentId || doctorId || null;

        if (!resolvedClientName) {
            return res.status(400).json({ message: "clientName is required" });
        }

        // If no serviceId, try to resolve from agentId
        let resolvedServiceId = serviceId;
        if (!resolvedServiceId && resolvedAgentId) {
            const agent = await User.findOne({ _id: resolvedAgentId, organizationId: org._id });
            if (agent?.serviceId) resolvedServiceId = agent.serviceId;
        }
        if (!resolvedServiceId) {
            return res.status(400).json({ message: "serviceId is required" });
        }

        const service = await Service.findOne({ _id: resolvedServiceId, organizationId: org._id, isActive: true });
        if (!service) return res.status(404).json({ message: "Service not found" });

        // Validate agentId belongs to this org
        if (resolvedAgentId) {
            const agentCheck = await User.findOne({ _id: resolvedAgentId, organizationId: org._id, role: { $in: ["AGENT", "DOCTOR"] } });
            if (!agentCheck) return res.status(404).json({ message: "Agent not found" });
        }

        const count       = await QueueEntry.countDocuments({ serviceId: resolvedServiceId, status: "waiting" });
        const tokenNumber  = count + 1;
        const uniqueLinkId = uuidv4();

        const entry = await QueueEntry.create({
            organizationId: org._id,
            locationId:     org.locations?.[0]?._id,
            serviceId:      resolvedServiceId,
            agentId:        resolvedAgentId,
            clientName:     resolvedClientName.trim(),
            clientPhone:    resolvedClientPhone.trim(),
            clientEmail:    resolvedClientEmail.trim(),
            notes:          resolvedNotes,
            tokenNumber,
            sortOrder:      tokenNumber,
            uniqueLinkId,
            status:         "waiting"
        });

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${resolvedServiceId}`).emit("queue.updated");
            io.to(`org_${org._id}`).emit("queue.updated");
            if (resolvedAgentId) io.to(`agent_${resolvedAgentId}`).emit("queue.updated");
        }

        const trackingUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/status/${uniqueLinkId}`
            : `http://localhost:3000/status/${uniqueLinkId}`;

        if (resolvedClientEmail) {
            sendQueueConfirmation(resolvedClientEmail, resolvedClientName, tokenNumber, trackingUrl, service.name);
        }

        res.status(201).json({
            success:    true,
            message:    "Added to queue successfully",
            tokenNumber,
            uniqueLinkId,
            statusLink: `/api/queue/status/${entry.uniqueLinkId}`
        });
    } catch (err) {
        logger.error("Kiosk enqueue error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /kiosk/:slug/display
// Display board: current queue state for all active agents/services
// (Replaces: GET /kiosk/:hospitalId/display)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:slug/display", async (req, res) => {
    try {
        const org = await resolveOrg(req.params.slug);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const agents = await User.find({
            organizationId: org._id,
            role:           "AGENT"
        }).select("name serviceCategory availability statusMessage serviceId");

        const displayData = await Promise.all(agents.map(async (agent) => {
            const upcoming = await QueueEntry.find({
                agentId: agent._id,
                status:  "waiting"
            }).select("tokenNumber clientName").sort({ sortOrder: 1, tokenNumber: 1 }).limit(4);

            const currentlyServing = upcoming.length > 0 ? upcoming[0] : null;
            const nextTokens       = upcoming.slice(1).map(e => e.tokenNumber);

            return {
                agentId:         agent._id,
                agentName:       agent.name,
                doctorId:        agent._id,        // compat alias
                doctorName:      agent.name,       // compat alias
                serviceCategory: agent.serviceCategory,
                specialization:  agent.serviceCategory, // compat alias
                availability:    agent.availability,
                statusMessage:   agent.statusMessage || "",
                servingToken:    currentlyServing ? currentlyServing.tokenNumber : "---",
                nextTokens
            };
        }));

        res.json({ success: true, organization: { name: org.name }, data: displayData });
    } catch (err) {
        logger.error("Display fetch error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
