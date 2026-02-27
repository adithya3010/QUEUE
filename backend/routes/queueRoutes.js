const router    = require("express").Router();
const QueueEntry = require("../models/QueueEntry");
const Service    = require("../models/Service");
const { auth }   = require("../middleware/authMiddleware");
const { calculateWaitTimes } = require("../utils/waitTimeCalculator");
const { v4: uuidv4 } = require("uuid");
const User       = require("../models/User");
const { addQueueEntrySchema } = require("../validators/queueEntry_validator");
const logger     = require("../utils/logger");
const { sendQueueConfirmation, sendNearlyUpAlert } = require("../utils/notificationService");

// ── Socket helper ─────────────────────────────────────────────────────────────
const emitSocketEvent = (agentId, event, data, organizationId = null, serviceId = null) => {
    if (!global.io || typeof global.io.to !== 'function') return;

    const tryEmit = (room) => {
        if (!room) return;
        const sock = global.io.to(room);
        if (sock && typeof sock.emit === 'function') {
            data !== undefined ? sock.emit(event, data) : sock.emit(event);
        }
    };

    tryEmit(`agent_${agentId}`);
    if (serviceId)      tryEmit(`service_${serviceId}`);
    if (organizationId) tryEmit(`org_${organizationId}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /queue/add — Add client to queue (AGENT or OPERATOR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /queue/add:
 *   post:
 *     summary: Add a new client to the queue
 *     tags: [Queue Management]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *                 example: Jane Doe
 *               clientPhone:
 *                 type: string
 *                 description: Phone number for SMS/WhatsApp notifications (optional)
 *                 example: "9876543210"
 *               notes:
 *                 type: string
 *                 description: Service note from operator (optional)
 *                 example: Prefer English
 *               agentId:
 *                 type: string
 *                 description: Required when called by an Operator. Agents use their own ID automatically.
 *                 example: 507f1f77bcf86cd799439011
 *               serviceId:
 *                 type: string
 *                 description: Optional — auto-resolved from agentId if not provided
 *                 example: 507f1f77bcf86cd799439022
 *               externalClientId:
 *                 type: string
 *                 description: Zero-PII external reference (optional)
 *     responses:
 *       200:
 *         description: Client added to queue
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/add", auth, async (req, res) => {
    try {
        const validatedData = addQueueEntrySchema.parse(req.body);
        const { clientName, clientPhone, clientEmail, notes, externalClientId } = validatedData;

        let agentId   = req.user?.id;
        let serviceId = validatedData.serviceId || null;

        if (req.user?.role === "OPERATOR") {
            agentId = validatedData.agentId;
            if (!agentId) return res.status(400).json({ message: "agentId is required for operators" });

            const operator = await User.findById(req.user.id);
            if (!operator) return res.status(404).json({ message: "Operator not found" });

            if (!operator.assignedAgents || operator.assignedAgents.length === 0) {
                return res.status(403).json({ message: "No agents assigned to this operator" });
            }

            const assignedIds = operator.assignedAgents.map(id => id.toString());
            if (!assignedIds.includes(agentId.toString())) {
                return res.status(403).json({ message: "Not authorized for this agent's queue" });
            }
        } else if (req.user?.role !== "AGENT" && !req.agentId) {
            return res.status(403).json({ message: "Only Agents or Operators can add clients to queue" });
        } else if (req.agentId) {
            agentId = req.agentId;
        }

        // Resolve agent + serviceId
        const agent = await User.findOne({ _id: agentId, role: { $in: ["AGENT", "DOCTOR"] } });
        if (!agent) return res.status(404).json({ message: "Agent not found" });
        if (!agent.organizationId) return res.status(500).json({ message: "Agent is not associated with an organization" });

        if (!serviceId) serviceId = agent.serviceId;
        if (!serviceId) return res.status(400).json({ message: "serviceId could not be resolved — please provide it explicitly" });

        const count = await QueueEntry.countDocuments({ agentId, status: "waiting" });

        const entry = await QueueEntry.create({
            organizationId:  agent.organizationId,
            locationId:      agent.locationId || agent.organizationId,  // fallback to org for now
            serviceId,
            agentId,
            clientName,
            clientPhone,
            clientEmail,
            notes:           notes || "",
            externalClientId,
            tokenNumber:     count + 1,
            sortOrder:       count + 1,
            uniqueLinkId:    uuidv4()
        });

        emitSocketEvent(agentId.toString(), "queue.updated", undefined,
            agent.organizationId.toString(), serviceId.toString());

        const trackingUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/status/${entry.uniqueLinkId}`
            : `http://localhost:3000/status/${entry.uniqueLinkId}`;
        sendQueueConfirmation(clientEmail, clientName, entry.tokenNumber, trackingUrl, agent.name);

        res.json({ message: "Client added to queue successfully", patient: entry, statusLink: `/api/queue/status/${entry.uniqueLinkId}` });
    } catch (err) {
        if (err.name === "ZodError" || err.issues) {
            return res.status(400).json({
                message: "Validation failed",
                errors: (err.issues || err.errors || []).map(e => ({
                    field: e.path?.join('.') || 'unknown',
                    message: e.message
                }))
            });
        }
        logger.error("Add QueueEntry Error", { error: err?.message, stack: err?.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /queue/history/
router.get("/history/", auth, async (req, res) => {
    try {
        const { date, status, search, agentId: queryAgentId } = req.query;
        let targetAgentId;

        if (!req.user || !req.user.role) return res.status(401).json({ message: "Authentication required" });

        if (req.user.role === "AGENT") {
            targetAgentId = req.user.id;
        } else if (req.user.role === "OPERATOR") {
            const operator = await User.findById(req.user.id);
            if (!operator) return res.status(404).json({ message: "Operator not found" });
            if (!operator.assignedAgents || operator.assignedAgents.length === 0) return res.json([]);

            if (queryAgentId) {
                const ids = operator.assignedAgents.map(id => id.toString());
                if (!ids.includes(queryAgentId)) return res.status(403).json({ message: "Not authorized for this agent's history" });
                targetAgentId = queryAgentId;
            } else {
                targetAgentId = { $in: operator.assignedAgents };
            }
        } else if (req.user.role === "ORG_ADMIN") {
            if (queryAgentId) {
                const agent = await User.findOne({ _id: queryAgentId, organizationId: req.user.organizationId, role: { $in: ["AGENT", "DOCTOR"] } });
                if (!agent) return res.status(403).json({ message: "Agent not found in your organization" });
                targetAgentId = queryAgentId;
            } else {
                const agents = await User.find({ organizationId: req.user.organizationId, role: { $in: ["AGENT", "DOCTOR"] } }).select('_id');
                if (agents.length === 0) return res.json([]);
                targetAgentId = { $in: agents.map(a => a._id) };
            }
        } else {
            return res.status(400).json({ message: "Invalid user role" });
        }

        const filter = {
            organizationId: req.user.organizationId,
            agentId: targetAgentId,
            status: { $in: ["completed", "cancelled"] }
        };
        if (status) filter.status = status;
        if (search) filter.clientName = { $regex: search, $options: "i" };
        if (date && !isNaN(new Date(date))) {
            const start = new Date(date);
            const end   = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.completedAt = { $gte: start, $lte: end };
        }

        const history = await QueueEntry.find(filter)
            .sort({ completedAt: -1 })
            .populate('agentId', 'name serviceCategory')
            .populate('serviceId', 'name category');
        res.json(history);
    } catch (err) {
        logger.error("History Fetch Error", { error: err.message, stack: err.stack });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /queue/:agentId — waiting queue for an agent
/**
 * @swagger
 * /queue/{agentId}:
 *   get:
 *     summary: Get waiting queue for an agent
 *     tags: [Queue Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue retrieved with estimated wait times
 */
router.get("/:agentId", auth, async (req, res) => {
    try {
        const agent = await User.findOne({ _id: req.params.agentId, role: "AGENT" });
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        const queue = await QueueEntry.find({
            organizationId: agent.organizationId,
            agentId: req.params.agentId,
            status: "waiting"
        }).sort({ sortOrder: 1, tokenNumber: 1 });

        const queueWithWaitTimes = calculateWaitTimes(queue, agent);
        res.json(queueWithWaitTimes);
    } catch (err) {
        logger.error("Fetch Queue Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// GET /queue/status/:uniqueLinkId — Public client status
/**
 * @swagger
 * /queue/status/{uniqueLinkId}:
 *   get:
 *     summary: Get client status (public endpoint — no auth required)
 *     tags: [Queue Management]
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client status and queue overview
 *       404:
 *         description: Invalid link
 */
router.get("/status/:uniqueLinkId", async (req, res) => {
    try {
        const entry = await QueueEntry.findOne({ uniqueLinkId: req.params.uniqueLinkId });
        if (!entry) return res.status(404).json({ message: "Invalid tracking link" });

        if (entry.status === "completed") {
            return res.json({ status: "completed", message: "Thank you for your visit", feedback: entry.feedback });
        }
        if (entry.status === "cancelled") {
            return res.json({ status: "cancelled", message: "Your queue entry has been cancelled" });
        }

        const queue = await QueueEntry.find({
            agentId: entry.agentId,
            status:  "waiting"
        }).sort({ sortOrder: 1, tokenNumber: 1 });

        const queueWithMarker = queue.map((q, index) => ({
            id:          q._id,
            clientName:  q.clientName,
            tokenNumber: q.tokenNumber,
            status:      q.status,
            isMe:        q.uniqueLinkId === entry.uniqueLinkId,
            position:    index + 1
        }));

        const myPosition = queueWithMarker.find(q => q.isMe)?.position || null;
        const agent = await User.findById(entry.agentId);

        res.json({
            agentId:           entry.agentId,
            agentName:         agent?.name,
            agentAvailability: agent?.availability,
            agentStatusMessage: agent?.statusMessage || "",
            serviceId:         entry.serviceId,
            myStatus:          entry.status,
            myTokenNumber:     entry.tokenNumber,
            avgSessionDuration: agent?.avgSessionDuration || 5,
            myPosition,
            queue:             queueWithMarker
        });
    } catch (err) {
        logger.error("Status Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /queue/feedback/:uniqueLinkId
/**
 * @swagger
 * /queue/feedback/{uniqueLinkId}:
 *   put:
 *     summary: Submit feedback for a completed session (public)
 *     tags: [Queue Management]
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted
 *       400:
 *         description: Invalid rating
 */
router.put("/feedback/:uniqueLinkId", async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        const entry = await QueueEntry.findOneAndUpdate(
            { uniqueLinkId: req.params.uniqueLinkId, status: "completed" },
            { feedback: { rating, comment } },
            { new: true }
        );
        if (!entry) return res.status(404).json({ message: "Invalid link or session not completed yet" });
        res.json({ message: "Feedback submitted successfully", feedback: entry.feedback });
    } catch (err) {
        logger.error("Feedback Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /queue/complete/:id
router.put("/complete/:id", auth, async (req, res) => {
    try {
        const entry = await QueueEntry.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            { status: "completed", completedAt: new Date() },
            { new: true }
        );
        if (!entry) return res.status(404).json({ message: "Queue entry not found" });

        emitSocketEvent(entry.agentId.toString(), "queue.updated", undefined,
            req.user.organizationId.toString(), entry.serviceId?.toString());
        emitSocketEvent(entry.uniqueLinkId, "queue.completed", { message: "Thank you for your visit" });

        // Notify nearly-up client (position 2)
        const nextWaiting = await QueueEntry.find({ agentId: entry.agentId, status: "waiting" })
            .sort({ tokenNumber: 1 }).limit(2);
        if (nextWaiting.length >= 2) {
            const p2    = nextWaiting[1];
            const agent = await User.findById(entry.agentId);
            sendNearlyUpAlert(p2.clientEmail, p2.clientName, agent.name);
        }

        res.json(entry);
    } catch (err) {
        logger.error("Complete Entry Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /queue/cancel/:id
router.put("/cancel/:id", auth, async (req, res) => {
    try {
        const entry = await QueueEntry.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            { status: "cancelled" },
            { new: true }
        );
        if (!entry) return res.status(404).json({ message: "Queue entry not found" });

        emitSocketEvent(entry.agentId.toString(), "queue.updated", undefined,
            req.user.organizationId.toString(), entry.serviceId?.toString());
        emitSocketEvent(entry.uniqueLinkId, "queue.cancelled", { message: "Your queue entry has been cancelled" });

        const nextWaiting = await QueueEntry.find({ agentId: entry.agentId, status: "waiting" })
            .sort({ tokenNumber: 1 }).limit(2);
        if (nextWaiting.length >= 2) {
            const p2    = nextWaiting[1];
            const agent = await User.findById(entry.agentId);
            sendNearlyUpAlert(p2.clientEmail, p2.clientName, agent.name);
        }

        res.json(entry);
    } catch (err) {
        logger.error("Cancel Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /queue/reorder/:agentId
router.put("/reorder/:agentId", auth, async (req, res) => {
    try {
        const { newOrder } = req.body;

        const queue = await QueueEntry.find({
            organizationId: req.user.organizationId,
            agentId:        req.params.agentId,
            status:         "waiting"
        }).sort({ sortOrder: 1, tokenNumber: 1 });

        const topLimit = Math.min(3, queue.length);
        if (newOrder.length !== topLimit) return res.status(400).json({ message: "Invalid reorder request" });

        for (let i = 0; i < newOrder.length; i++) {
            await QueueEntry.findByIdAndUpdate(newOrder[i], { sortOrder: i + 1 });
        }
        let nextSortOrder = newOrder.length + 1;
        for (let i = topLimit; i < queue.length; i++) {
            if (!newOrder.includes(queue[i]._id.toString())) {
                await QueueEntry.findByIdAndUpdate(queue[i]._id, { sortOrder: nextSortOrder++ });
            }
        }

        emitSocketEvent(req.params.agentId, "queue.updated", undefined, req.user.organizationId.toString());
        res.json({ message: "Reordered successfully" });
    } catch (err) {
        logger.error("Reorder Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /queue/prioritize/:entryId (corrected spelling from 'prioritise')
router.put("/prioritize/:entryId", auth, async (req, res) => {
    try {
        const entry = await QueueEntry.findById(req.params.entryId);
        if (!entry) return res.status(404).json({ message: "Queue entry not found" });

        const agentId = entry.agentId.toString();
        if (req.user.role === "AGENT" && req.user.id !== agentId) {
            return res.status(403).json({ message: "Not authorized for this queue" });
        }

        const waitingQueue = await QueueEntry.find({ agentId, status: "waiting" }).sort({ sortOrder: 1, tokenNumber: 1 });
        let newSortOrder = 2;
        for (const q of waitingQueue) {
            if (q._id.toString() === req.params.entryId) {
                await QueueEntry.findByIdAndUpdate(q._id, { sortOrder: 1 });
            } else {
                await QueueEntry.findByIdAndUpdate(q._id, { sortOrder: newSortOrder++ });
            }
        }

        emitSocketEvent(agentId, "queue.updated", undefined,
            entry.organizationId.toString(), entry.serviceId?.toString());
        res.json({ message: "Client prioritized successfully" });
    } catch (err) {
        logger.error("Prioritize Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

// Backward compat alias: PUT /queue/prioritise/:id
router.put("/prioritise/:entryId", auth, (req, res, next) => {
    req.url = `/prioritize/${req.params.entryId}`;
    next('route');
});

// GET /queue/summary/today
router.get("/summary/today", auth, async (req, res) => {
    try {
        if (req.user.role !== "AGENT") return res.status(403).json({ message: "Agents only" });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todaysEntries = await QueueEntry.find({
            agentId:   req.user.id,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const completed = todaysEntries.filter(e => e.status === "completed");
        const cancelled = todaysEntries.filter(e => e.status === "cancelled");
        const waiting   = todaysEntries.filter(e => e.status === "waiting");

        let avgSessionTime = 0;
        if (completed.length >= 2) {
            const sorted = completed.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
            let totalDelta = 0;
            for (let i = 1; i < sorted.length; i++) {
                totalDelta += (new Date(sorted[i].completedAt) - new Date(sorted[i - 1].completedAt));
            }
            avgSessionTime = Math.round(totalDelta / (sorted.length - 1) / 60000);
        }

        const hourBuckets = {};
        for (const e of todaysEntries) {
            const hour = new Date(e.createdAt).getHours();
            hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
        }
        let busiestHour = null, maxCount = 0;
        for (const [hour, count] of Object.entries(hourBuckets)) {
            if (count > maxCount) { maxCount = count; busiestHour = parseInt(hour); }
        }
        const formatHour = (h) => h === null ? "–" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

        res.json({
            totalToday:  todaysEntries.length,
            completed:   completed.length,
            cancelled:   cancelled.length,
            waiting:     waiting.length,
            avgSessionTime,
            busiestHour: formatHour(busiestHour),
            noShows:     cancelled.length
        });
    } catch (err) {
        logger.error("Summary Today Error", { error: err.message });
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
