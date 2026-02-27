/**
 * SmartQueue B2B External API — Version 2
 *
 * All routes require:
 *   x-api-key: <your-api-key>
 *
 * Base path: /api/v2
 *
 * Changelog from v1:
 *  - Organization replaces Hospital (terminolgy + model)
 *  - Services replaces Doctors
 *  - Agents replaces Doctors (personnel)
 *  - Locations replaces Branches
 *  - QueueEntry replaces Patient model
 *  - clientName/clientPhone replaces name/number
 *  - agent.status_changed replaces doctor.status_changed (webhook event)
 */

const express      = require("express");
const router       = express.Router();
const mongoose     = require("mongoose");
const Organization = require("../models/Organization");
const Service      = require("../models/Service");
const User         = require("../models/User");
const QueueEntry   = require("../models/QueueEntry");
const Appointment  = require("../models/Appointment");
const { v4: uuidv4 } = require("uuid");
const { requireApiKey } = require("../middleware/apiAuth");
const { dispatchWebhook } = require("../utils/webhookDispatcher");
const { generateSlots }   = require("../utils/slotGenerator");
const logger = require("../utils/logger");

// Every v2 endpoint requires a valid API key
router.use(requireApiKey);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve agent by ID, scoped to the caller's organization */
async function resolveAgent(agentId, organizationId) {
    if (!mongoose.isValidObjectId(agentId)) return null;
    return User.findOne({ _id: agentId, organizationId, role: { $in: ["AGENT", "DOCTOR"] } });
}

/** Resolve service by ID, scoped to the caller's organization */
async function resolveService(serviceId, organizationId) {
    if (!mongoose.isValidObjectId(serviceId)) return null;
    return Service.findOne({ _id: serviceId, organizationId, isActive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v2/info:
 *   get:
 *     summary: Get organization profile
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Organization profile returned
 */
router.get("/info", async (req, res) => {
    try {
        const org = await Organization.findById(req.organizationId)
            .select("name email industry slug subscriptionPlan status locations settings createdAt");
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        res.json({
            success: true,
            organization: {
                id:               org._id,
                name:             org.name,
                email:            org.email,
                industry:         org.industry,
                slug:             org.slug,
                subscriptionPlan: org.subscriptionPlan,
                status:           org.status,
                locations:        org.locations,
                settings:         org.settings,
                createdAt:        org.createdAt,
            }
        });
    } catch (err) {
        logger.error("v2 /info error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/locations:
 *   get:
 *     summary: List all locations for the organization
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/locations", async (req, res) => {
    try {
        const org = await Organization.findById(req.organizationId).select("locations");
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        res.json({ success: true, data: org.locations || [], total: (org.locations || []).length });
    } catch (err) {
        logger.error("v2 /locations error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/services:
 *   get:
 *     summary: List all active services
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 */
router.get("/services", async (req, res) => {
    try {
        const { locationId, category } = req.query;
        const filter = { organizationId: req.organizationId, isActive: true };
        if (locationId) filter.locationId = locationId;
        if (category)   filter.category   = { $regex: category, $options: "i" };

        const services = await Service.find(filter).sort({ name: 1 });

        const data = await Promise.all(services.map(async (svc) => {
            const waiting  = await QueueEntry.countDocuments({ serviceId: svc._id, status: "waiting" });
            const agents   = await User.countDocuments({ serviceId: svc._id, organizationId: req.organizationId, role: { $in: ["AGENT","DOCTOR"] } });
            return {
                id:                   svc._id,
                name:                 svc.name,
                description:          svc.description,
                category:             svc.category,
                avgSessionDuration:   svc.avgSessionDuration,
                maxCapacity:          svc.maxCapacity,
                currentQueueLength:   waiting,
                estimatedWaitMins:    waiting * (svc.avgSessionDuration || 5),
                totalAgents:          agents,
                locationId:           svc.locationId,
                schedule:             svc.schedule,
            };
        }));

        res.json({ success: true, data, total: data.length });
    } catch (err) {
        logger.error("v2 /services error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/services/{serviceId}/slots:
 *   get:
 *     summary: Get available appointment slots for a service on a date
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-15"
 */
router.get("/services/:serviceId/slots", async (req, res) => {
    try {
        const service = await resolveService(req.params.serviceId, req.organizationId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });

        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: "date query param is required (YYYY-MM-DD)" });

        // Use the first available agent for this service to generate slots
        const agent = await User.findOne({ serviceId: service._id, organizationId: req.organizationId, role: { $in: ["AGENT","DOCTOR"] }, availability: "Available" });

        const existingAppts = await Appointment.find({
            organizationId: req.organizationId,
            serviceId:      service._id,
            scheduledAt: {
                $gte: new Date(`${date}T00:00:00.000Z`),
                $lt:  new Date(`${date}T23:59:59.999Z`),
            },
            status: { $nin: ["cancelled"] }
        });

        const slots = generateSlots(
            date,
            service.schedule || (agent?.schedule) || [],
            existingAppts,
            service.avgSessionDuration || agent?.avgSessionDuration || 15
        );

        res.json({ success: true, serviceId: service._id, date, slots, total: slots.length });
    } catch (err) {
        logger.error("v2 /services/:id/slots error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/agents/{agentId}/status:
 *   get:
 *     summary: Get an agent's current availability status
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/agents/:agentId/status", async (req, res) => {
    try {
        const agent = await resolveAgent(req.params.agentId, req.organizationId);
        if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

        const waiting = await QueueEntry.countDocuments({ agentId: agent._id, status: "waiting" });

        res.json({
            success:          true,
            agentId:          agent._id,
            name:             agent.name,
            serviceCategory:  agent.serviceCategory,
            availability:     agent.availability,
            statusMessage:    agent.statusMessage || "",
            currentQueueLength: waiting,
            estimatedWaitMins:  waiting * (agent.avgSessionDuration || 5),
        });
    } catch (err) {
        logger.error("v2 /agents/:id/status error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/agents/{agentId}/queue:
 *   get:
 *     summary: Get all waiting queue entries for a specific agent
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/agents/:agentId/queue", async (req, res) => {
    try {
        const agent = await resolveAgent(req.params.agentId, req.organizationId);
        if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

        const entries = await QueueEntry.find({ agentId: agent._id, status: "waiting" })
            .sort({ sortOrder: 1, tokenNumber: 1 })
            .select("-__v");

        res.json({ success: true, agentId: agent._id, data: entries, total: entries.length });
    } catch (err) {
        logger.error("v2 /agents/:id/queue error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v2/queue:
 *   get:
 *     summary: List queue entries
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, serving, completed, cancelled, no-show]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get("/queue", async (req, res) => {
    try {
        const { serviceId, agentId, status, limit = 50 } = req.query;
        const filter = { organizationId: req.organizationId };
        if (serviceId) filter.serviceId = serviceId;
        if (agentId)   filter.agentId   = agentId;
        if (status)    filter.status    = status;

        const entries = await QueueEntry.find(filter)
            .sort({ sortOrder: 1, tokenNumber: 1, createdAt: 1 })
            .limit(Number(limit))
            .populate("serviceId", "name category")
            .populate("agentId", "name serviceCategory")
            .select("-__v");

        res.json({ success: true, data: entries, total: entries.length });
    } catch (err) {
        logger.error("v2 GET /queue error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue:
 *   post:
 *     summary: Add a single client to the queue
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - clientName
 *             properties:
 *               serviceId:
 *                 type: string
 *               agentId:
 *                 type: string
 *               clientName:
 *                 type: string
 *               clientPhone:
 *                 type: string
 *               notes:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [NORMAL, HIGH, EMERGENCY]
 *                 default: NORMAL
 *               externalClientId:
 *                 type: string
 */
router.post("/queue", async (req, res) => {
    try {
        const { serviceId, agentId, clientName, clientPhone, notes, priority = "NORMAL", externalClientId } = req.body;

        if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });
        if (!clientName) return res.status(400).json({ success: false, message: "clientName is required" });

        const service = await resolveService(serviceId, req.organizationId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });

        if (agentId) {
            const agentCheck = await resolveAgent(agentId, req.organizationId);
            if (!agentCheck) return res.status(404).json({ success: false, message: "Agent not found" });
        }

        // Check max capacity
        if (service.maxCapacity) {
            const currentCount = await QueueEntry.countDocuments({ serviceId: service._id, status: "waiting" });
            if (currentCount >= service.maxCapacity) {
                return res.status(409).json({ success: false, message: "Queue is at maximum capacity" });
            }
        }

        const count       = await QueueEntry.countDocuments({ serviceId: service._id, status: "waiting" });
        const tokenNumber  = count + 1;
        const uniqueLinkId = uuidv4();

        const org = await Organization.findById(req.organizationId).select("locations");

        const entry = await QueueEntry.create({
            organizationId:  req.organizationId,
            locationId:      org.locations?.[0]?._id,
            serviceId:       service._id,
            agentId:         agentId || null,
            clientName:      clientName.trim(),
            clientPhone:     (clientPhone || "").trim(),
            notes:           notes || "",
            tokenNumber,
            sortOrder:       tokenNumber,
            uniqueLinkId,
            status:          "waiting",
            priority:        priority || "NORMAL",
            externalClientId: externalClientId || undefined,
        });

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${service._id}`).emit("queue.updated");
            io.to(`org_${req.organizationId}`).emit("queue.updated");
            if (agentId) io.to(`agent_${agentId}`).emit("queue.updated");
        }

        dispatchWebhook(req.organizationId, "queue.created", {
            queueEntryId: entry._id,
            tokenNumber,
            uniqueLinkId,
            clientName:  entry.clientName,
            serviceId:   service._id,
            serviceName: service.name,
        });

        res.status(201).json({
            success:     true,
            tokenNumber,
            uniqueLinkId,
            queueEntryId: entry._id,
            statusLink:   `/api/queue/status/${uniqueLinkId}`,
            estimatedWaitMins: count * (service.avgSessionDuration || 5),
        });
    } catch (err) {
        logger.error("v2 POST /queue error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/bulk:
 *   post:
 *     summary: Add up to 50 clients to the queue at once
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - clients
 *             properties:
 *               serviceId:
 *                 type: string
 *               agentId:
 *                 type: string
 *               clients:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [clientName]
 *                   properties:
 *                     clientName:
 *                       type: string
 *                     clientPhone:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     priority:
 *                       type: string
 *                       enum: [NORMAL, HIGH, EMERGENCY]
 *                     externalClientId:
 *                       type: string
 */
router.post("/queue/bulk", async (req, res) => {
    try {
        const { serviceId, agentId, clients } = req.body;

        if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });
        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return res.status(400).json({ success: false, message: "clients array is required and must be non-empty" });
        }
        if (clients.length > 50) {
            return res.status(400).json({ success: false, message: "Maximum 50 clients per bulk request" });
        }

        const service = await resolveService(serviceId, req.organizationId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });

        const org = await Organization.findById(req.organizationId).select("locations");
        const baseCount = await QueueEntry.countDocuments({ serviceId: service._id, status: "waiting" });

        const entries = [];
        for (let i = 0; i < clients.length; i++) {
            const c = clients[i];
            if (!c.clientName) continue;

            const tokenNumber  = baseCount + i + 1;
            const uniqueLinkId = uuidv4();

            entries.push({
                organizationId:   req.organizationId,
                locationId:       org.locations?.[0]?._id,
                serviceId:        service._id,
                agentId:          agentId || null,
                clientName:       c.clientName.trim(),
                clientPhone:      (c.clientPhone || "").trim(),
                notes:            c.notes || "",
                tokenNumber,
                sortOrder:        tokenNumber,
                uniqueLinkId,
                status:           "waiting",
                priority:         c.priority || "NORMAL",
                externalClientId: c.externalClientId || undefined,
            });
        }

        const created = await QueueEntry.insertMany(entries);

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${service._id}`).emit("queue.updated");
            io.to(`org_${req.organizationId}`).emit("queue.updated");
        }

        res.status(201).json({
            success: true,
            total:   created.length,
            data: created.map(e => ({ queueEntryId: e._id, tokenNumber: e.tokenNumber, uniqueLinkId: e.uniqueLinkId })),
        });
    } catch (err) {
        logger.error("v2 POST /queue/bulk error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/stats:
 *   get:
 *     summary: Get live queue statistics
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 */
router.get("/queue/stats", async (req, res) => {
    try {
        const { serviceId } = req.query;
        const filter = { organizationId: req.organizationId };
        if (serviceId) filter.serviceId = serviceId;

        const [waiting, serving, completed, cancelled] = await Promise.all([
            QueueEntry.countDocuments({ ...filter, status: "waiting" }),
            QueueEntry.countDocuments({ ...filter, status: "serving" }),
            QueueEntry.countDocuments({ ...filter, status: "completed" }),
            QueueEntry.countDocuments({ ...filter, status: "cancelled" }),
        ]);

        // Per-service breakdown
        const services = await Service.find({ organizationId: req.organizationId, isActive: true }).select("_id name avgSessionDuration");
        const serviceStats = await Promise.all(services.map(async (svc) => {
            const w = await QueueEntry.countDocuments({ serviceId: svc._id, status: "waiting" });
            return { serviceId: svc._id, name: svc.name, waiting: w, estimatedWaitMins: w * (svc.avgSessionDuration || 5) };
        }));

        res.json({
            success: true,
            totals: { waiting, serving, completed, cancelled, total: waiting + serving + completed + cancelled },
            byService: serviceStats,
        });
    } catch (err) {
        logger.error("v2 /queue/stats error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/{uniqueLinkId}:
 *   get:
 *     summary: Get a client's queue status and position
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/queue/:uniqueLinkId", async (req, res) => {
    try {
        const entry = await QueueEntry.findOne({ uniqueLinkId: req.params.uniqueLinkId, organizationId: req.organizationId })
            .populate("serviceId", "name category avgSessionDuration")
            .populate("agentId", "name serviceCategory availability statusMessage");

        if (!entry) return res.status(404).json({ success: false, message: "Queue entry not found" });

        let position = null;
        let estimatedWaitMins = null;
        if (entry.status === "waiting" || entry.status === "serving") {
            position = await QueueEntry.countDocuments({
                serviceId: entry.serviceId,
                status:    "waiting",
                sortOrder: { $lt: entry.sortOrder }
            }) + 1;
            const sessionDuration = entry.serviceId?.avgSessionDuration || 5;
            estimatedWaitMins = (position - 1) * sessionDuration;
        }

        res.json({
            success: true,
            data: {
                id:               entry._id,
                uniqueLinkId:     entry.uniqueLinkId,
                tokenNumber:      entry.tokenNumber,
                status:           entry.status,
                clientName:       entry.clientName,
                clientPhone:      entry.clientPhone,
                notes:            entry.notes,
                priority:         entry.priority,
                position,
                estimatedWaitMins,
                service:          entry.serviceId,
                agent:            entry.agentId,
                feedback:         entry.feedback,
                createdAt:        entry.createdAt,
                completedAt:      entry.completedAt,
            }
        });
    } catch (err) {
        logger.error("v2 GET /queue/:id error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/{uniqueLinkId}/priority:
 *   put:
 *     summary: Move a client to the front of their service queue
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.put("/queue/:uniqueLinkId/priority", async (req, res) => {
    try {
        const entry = await QueueEntry.findOne({ uniqueLinkId: req.params.uniqueLinkId, organizationId: req.organizationId });
        if (!entry) return res.status(404).json({ success: false, message: "Queue entry not found" });
        if (entry.status !== "waiting") return res.status(400).json({ success: false, message: "Entry is not in waiting status" });

        entry.sortOrder = 0;
        await entry.save();

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${entry.serviceId}`).emit("queue.updated");
            io.to(`org_${req.organizationId}`).emit("queue.updated");
            if (entry.agentId) io.to(`agent_${entry.agentId}`).emit("queue.updated");
        }

        res.json({ success: true, message: "Client moved to front of queue" });
    } catch (err) {
        logger.error("v2 PUT /queue/:id/priority error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/{uniqueLinkId}/notes:
 *   put:
 *     summary: Attach or update service notes for a queue entry
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 500
 */
router.put("/queue/:uniqueLinkId/notes", async (req, res) => {
    try {
        const { notes } = req.body;
        if (!notes || typeof notes !== "string") {
            return res.status(400).json({ success: false, message: "notes field is required" });
        }

        const entry = await QueueEntry.findOneAndUpdate(
            { uniqueLinkId: req.params.uniqueLinkId, organizationId: req.organizationId },
            { $set: { notes: notes.slice(0, 500) } },
            { new: true }
        );
        if (!entry) return res.status(404).json({ success: false, message: "Queue entry not found" });

        res.json({ success: true, message: "Notes updated", notes: entry.notes });
    } catch (err) {
        logger.error("v2 PUT /queue/:id/notes error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/queue/{uniqueLinkId}:
 *   delete:
 *     summary: Cancel a queue entry
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.delete("/queue/:uniqueLinkId", async (req, res) => {
    try {
        const entry = await QueueEntry.findOne({ uniqueLinkId: req.params.uniqueLinkId, organizationId: req.organizationId });
        if (!entry) return res.status(404).json({ success: false, message: "Queue entry not found" });
        if (entry.status === "completed") {
            return res.status(400).json({ success: false, message: "Cannot cancel a completed entry" });
        }

        entry.status = "cancelled";
        await entry.save();

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${entry.serviceId}`).emit("queue.updated");
            io.to(`${entry.uniqueLinkId}`).emit("queue.cancelled");
            if (entry.agentId) io.to(`agent_${entry.agentId}`).emit("queue.updated");
        }

        dispatchWebhook(req.organizationId, "queue.cancelled", {
            queueEntryId: entry._id,
            uniqueLinkId: entry.uniqueLinkId,
            tokenNumber:  entry.tokenNumber,
        });

        res.json({ success: true, message: "Queue entry cancelled" });
    } catch (err) {
        logger.error("v2 DELETE /queue/:id error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v2/appointments:
 *   get:
 *     summary: List appointments
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, arrived, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 */
router.get("/appointments", async (req, res) => {
    try {
        const { serviceId, agentId, status, date, limit = 100 } = req.query;
        const filter = { organizationId: req.organizationId };
        if (serviceId) filter.serviceId = serviceId;
        if (agentId)   filter.agentId   = agentId;
        if (status)    filter.status    = status;
        if (date) {
            filter.scheduledAt = {
                $gte: new Date(`${date}T00:00:00.000Z`),
                $lt:  new Date(`${date}T23:59:59.999Z`),
            };
        }

        const appointments = await Appointment.find(filter)
            .sort({ scheduledAt: 1 })
            .limit(Number(limit))
            .populate("serviceId", "name category")
            .populate("agentId", "name serviceCategory")
            .select("-__v");

        res.json({ success: true, data: appointments, total: appointments.length });
    } catch (err) {
        logger.error("v2 GET /appointments error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/appointments/book:
 *   post:
 *     summary: Book an appointment
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - clientName
 *               - scheduledAt
 *             properties:
 *               serviceId:
 *                 type: string
 *               agentId:
 *                 type: string
 *               clientName:
 *                 type: string
 *               clientPhone:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 */
router.post("/appointments/book", async (req, res) => {
    try {
        const { serviceId, agentId, clientName, clientPhone, scheduledAt, notes } = req.body;

        if (!serviceId)   return res.status(400).json({ success: false, message: "serviceId is required" });
        if (!clientName)  return res.status(400).json({ success: false, message: "clientName is required" });
        if (!scheduledAt) return res.status(400).json({ success: false, message: "scheduledAt is required" });

        const service = await resolveService(serviceId, req.organizationId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });

        if (agentId) {
            const agentCheck = await resolveAgent(agentId, req.organizationId);
            if (!agentCheck) return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const org = await Organization.findById(req.organizationId).select("locations");

        const appt = await Appointment.create({
            organizationId: req.organizationId,
            locationId:     org.locations?.[0]?._id,
            serviceId:      service._id,
            agentId:        agentId || null,
            clientName:     clientName.trim(),
            clientPhone:    (clientPhone || "").trim(),
            scheduledAt:    new Date(scheduledAt),
            notes:          notes || "",
            status:         "scheduled",
        });

        res.status(201).json({
            success:       true,
            appointmentId: appt._id,
            clientName:    appt.clientName,
            scheduledAt:   appt.scheduledAt,
            serviceName:   service.name,
        });
    } catch (err) {
        logger.error("v2 POST /appointments/book error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/appointments/{id}/arrive:
 *   put:
 *     summary: Mark a client as arrived and add to the live queue
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.put("/appointments/:id/arrive", async (req, res) => {
    try {
        const appt = await Appointment.findOne({ _id: req.params.id, organizationId: req.organizationId });
        if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
        if (appt.status !== "scheduled") {
            return res.status(400).json({ success: false, message: `Cannot mark as arrived — current status: ${appt.status}` });
        }

        appt.status = "arrived";
        await appt.save();

        const count        = await QueueEntry.countDocuments({ serviceId: appt.serviceId, status: "waiting" });
        const tokenNumber  = count + 1;
        const uniqueLinkId = uuidv4();
        const org          = await Organization.findById(req.organizationId).select("locations");

        const entry = await QueueEntry.create({
            organizationId: req.organizationId,
            locationId:     org.locations?.[0]?._id,
            serviceId:      appt.serviceId,
            agentId:        appt.agentId,
            clientName:     appt.clientName,
            clientPhone:    appt.clientPhone,
            notes:          `[Appointment] ${appt.notes || ""}`.trim(),
            tokenNumber,
            sortOrder:      tokenNumber,
            uniqueLinkId,
            status:         "waiting",
        });

        const io = req.app.get("io") || global.io;
        if (io) {
            io.to(`service_${appt.serviceId}`).emit("queue.updated");
            io.to(`org_${req.organizationId}`).emit("queue.updated");
            if (appt.agentId) io.to(`agent_${appt.agentId}`).emit("queue.updated");
        }

        res.json({
            success:     true,
            message:     "Client checked in and added to live queue",
            tokenNumber,
            uniqueLinkId,
            queueEntryId: entry._id,
        });
    } catch (err) {
        logger.error("v2 PUT /appointments/:id/arrive error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.put("/appointments/:id/cancel", async (req, res) => {
    try {
        const appt = await Appointment.findOne({ _id: req.params.id, organizationId: req.organizationId });
        if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
        if (appt.status === "completed") {
            return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment" });
        }

        appt.status = "cancelled";
        await appt.save();

        res.json({ success: true, message: "Appointment cancelled" });
    } catch (err) {
        logger.error("v2 PUT /appointments/:id/cancel error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v2/analytics/summary:
 *   get:
 *     summary: Organization-wide queue analytics summary
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 */
router.get("/analytics/summary", async (req, res) => {
    try {
        const { period = "today" } = req.query;
        const now  = new Date();
        let   from = new Date();

        if (period === "today") {
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === "week") {
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === "month") {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const filter = { organizationId: req.organizationId, createdAt: { $gte: from } };

        const [total, completed, cancelled, waiting] = await Promise.all([
            QueueEntry.countDocuments(filter),
            QueueEntry.countDocuments({ ...filter, status: "completed" }),
            QueueEntry.countDocuments({ ...filter, status: "cancelled" }),
            QueueEntry.countDocuments({ ...filter, status: "waiting" }),
        ]);

        // Average session duration from completed entries
        const completedEntries = await QueueEntry.find({ ...filter, status: "completed", completedAt: { $exists: true } })
            .select("createdAt completedAt");

        let avgSessionMins = 0;
        if (completedEntries.length > 0) {
            const totalMs = completedEntries.reduce((sum, e) => {
                return sum + (new Date(e.completedAt) - new Date(e.createdAt));
            }, 0);
            avgSessionMins = Math.round((totalMs / completedEntries.length) / 60000);
        }

        res.json({
            success: true,
            period,
            from:    from.toISOString(),
            to:      now.toISOString(),
            data: {
                total, completed, cancelled, waiting,
                inProgress: total - completed - cancelled - waiting,
                avgSessionMins,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            }
        });
    } catch (err) {
        logger.error("v2 /analytics/summary error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/analytics/service/{serviceId}:
 *   get:
 *     summary: Per-service analytics
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 */
router.get("/analytics/service/:serviceId", async (req, res) => {
    try {
        const service = await resolveService(req.params.serviceId, req.organizationId);
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });

        const [total, completed, cancelled, waiting] = await Promise.all([
            QueueEntry.countDocuments({ serviceId: service._id }),
            QueueEntry.countDocuments({ serviceId: service._id, status: "completed" }),
            QueueEntry.countDocuments({ serviceId: service._id, status: "cancelled" }),
            QueueEntry.countDocuments({ serviceId: service._id, status: "waiting" }),
        ]);

        res.json({
            success:   true,
            serviceId: service._id,
            name:      service.name,
            data: { total, completed, cancelled, waiting }
        });
    } catch (err) {
        logger.error("v2 /analytics/service/:id error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

/**
 * @swagger
 * /v2/analytics/wait-times:
 *   get:
 *     summary: Hourly client volume breakdown for a date
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-15"
 */
router.get("/analytics/wait-times", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: "date query param is required (YYYY-MM-DD)" });

        const from = new Date(`${date}T00:00:00.000Z`);
        const to   = new Date(`${date}T23:59:59.999Z`);

        const entries = await QueueEntry.find({
            organizationId: req.organizationId,
            createdAt: { $gte: from, $lte: to }
        }).select("createdAt status");

        // Bucket by hour
        const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2,"0")}:00`, count: 0 }));
        for (const e of entries) {
            hourly[new Date(e.createdAt).getUTCHours()].count++;
        }

        res.json({ success: true, date, data: hourly, total: entries.length });
    } catch (err) {
        logger.error("v2 /analytics/wait-times error", { error: err.message });
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER TOOLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v2/webhooks/test:
 *   post:
 *     summary: Fire a test webhook event to verify your endpoint
 *     tags: [B2B v2]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event:
 *                 type: string
 *                 enum:
 *                   - queue.created
 *                   - queue.updated
 *                   - queue.completed
 *                   - queue.cancelled
 *                   - agent.status_changed
 */
router.post("/webhooks/test", async (req, res) => {
    const { event } = req.body;
    const validEvents = ["queue.created", "queue.updated", "queue.completed", "queue.cancelled", "agent.status_changed"];
    if (!event || !validEvents.includes(event)) {
        return res.status(400).json({ success: false, message: `event must be one of: ${validEvents.join(", ")}` });
    }

    const testPayload = {
        test:    true,
        event,
        message: `This is a test webhook triggered via the SmartQueue API.`,
        data:    { sampleField: "sampleValue", timestamp: new Date().toISOString() },
    };

    try {
        await dispatchWebhook(req.organizationId, event, testPayload);
        res.json({ success: true, message: `Test webhook for '${event}' dispatched.` });
    } catch (err) {
        logger.error("v2 /webhooks/test error", { error: err.message });
        res.status(500).json({ success: false, message: "Failed to dispatch test webhook" });
    }
});

module.exports = router;
