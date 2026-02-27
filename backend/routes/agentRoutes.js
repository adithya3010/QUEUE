const router = require("express").Router();
const User    = require("../models/User");
const { auth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /agents/info:
 *   get:
 *     summary: Get agent profile
 *     tags: [Agents]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Agent profile returned
 *       401:
 *         description: Unauthorized
 */
router.get("/info", auth, async (req, res) => {
    try {
        const agent = await User.findOne({ _id: req.user.id, role: "AGENT" })
            .select("-password -refreshToken")
            .populate("serviceId", "name category");
        if (!agent) return res.status(404).json({ message: "Agent not found" });
        res.json(agent);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /agents/availability:
 *   put:
 *     summary: Update agent availability
 *     tags: [Agents]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability
 *             properties:
 *               availability:
 *                 type: string
 *                 enum: [Available, Unavailable]
 *                 example: Available
 *               statusMessage:
 *                 type: string
 *                 description: Message shown when unavailable (e.g. "Back in 20 min")
 *                 example: Back after lunch
 *     responses:
 *       200:
 *         description: Availability updated
 *       401:
 *         description: Unauthorized
 */
router.put("/availability", auth, async (req, res) => {
    try {
        const { availability, statusMessage } = req.body;

        const update = { availability };
        update.statusMessage = (availability === "Unavailable" && statusMessage)
            ? statusMessage.trim().slice(0, 200)
            : "";

        const agent = await User.findOneAndUpdate(
            { _id: req.user.id, role: "AGENT" },
            update,
            { new: true }
        );
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        if (global.io) {
            const agentRoom  = `agent_${req.user.id}`;
            const serviceRoom = agent.serviceId ? `service_${agent.serviceId}` : null;
            const orgRoom    = `org_${agent.organizationId}`;

            const payload = { availability: agent.availability, statusMessage: agent.statusMessage };
            global.io.to(agentRoom).emit("agent.status_changed", payload);
            if (serviceRoom) global.io.to(serviceRoom).emit("agent.status_changed", payload);
            global.io.to(orgRoom).emit("agent.status_changed", payload);
            global.io.to(agentRoom).emit("queue.updated");
        }

        res.json(agent);
    } catch (err) {
        console.error("Availability Update Error", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @swagger
 * /agents/update-session-duration:
 *   put:
 *     summary: Update average session duration
 *     tags: [Agents]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - avgSessionDuration
 *             properties:
 *               avgSessionDuration:
 *                 type: number
 *                 description: Average session duration in minutes
 *                 example: 10
 *     responses:
 *       200:
 *         description: Session duration updated
 *       400:
 *         description: Invalid value
 */
router.put("/update-session-duration", auth, async (req, res) => {
    try {
        const { avgSessionDuration } = req.body;

        if (!avgSessionDuration || avgSessionDuration <= 0) {
            return res.status(400).json({ message: "Invalid session duration" });
        }

        const agent = await User.findOneAndUpdate(
            { _id: req.user.id, role: "AGENT" },
            { avgSessionDuration },
            { new: true }
        );
        if (!agent) return res.status(404).json({ message: "Agent not found" });

        if (global.io) {
            global.io.to(`agent_${req.user.id}`).emit("queue.updated");
            if (agent.serviceId) global.io.to(`service_${agent.serviceId}`).emit("queue.updated");
            global.io.to(`org_${agent.organizationId}`).emit("queue.updated");
        }

        res.json({ message: "Session duration updated", agent });
    } catch (err) {
        console.error("Update session duration error", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
