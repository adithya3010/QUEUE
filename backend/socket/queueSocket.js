const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');
const User   = require('../models/User');

module.exports = (io) => {
    // ── Socket authentication middleware ─────────────────────────────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token
            || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Support both new (userId) and legacy (doctorId) token claims
                const userId = decoded.userId || decoded.doctorId;
                socket.agentId = userId;
                socket.userId  = userId;

                // Support both new (organizationId) and legacy (hospitalId) claims
                socket.organizationId = decoded.organizationId || decoded.hospitalId;
                socket.role           = decoded.role;

                // If organizationId not in token, resolve from User record
                if (!socket.organizationId && userId) {
                    const user = await User.findById(userId).select('organizationId hospitalId role');
                    if (user) {
                        socket.organizationId = (user.organizationId || user.hospitalId)?.toString();
                        socket.role           = user.role;
                    }
                }

                socket.authenticated = true;
            } catch (err) {
                logger.warn('Socket authentication failed', { error: err.message, socketId: socket.id });
                socket.authenticated = false;
            }
        } else {
            socket.authenticated = false;
        }

        next();
    });

    io.on("connection", (socket) => {
        logger.info('Socket connection established', {
            socketId:      socket.id,
            authenticated: socket.authenticated,
            agentId:       socket.agentId || 'none'
        });

        // ── Agent room (private — authenticated AGENT only) ───────────────────
        socket.on("joinAgentRoom", (agentId) => {
            if (!socket.authenticated) {
                socket.emit("error", { message: "Authentication required to join agent room" });
                return;
            }
            if (socket.agentId !== agentId) {
                socket.emit("error", { message: "Cannot join another agent's room" });
                return;
            }
            socket.join(`agent_${agentId}`);

            if (socket.organizationId) {
                socket.join(`org_${socket.organizationId}`);
            }

            logger.info('Agent joined room', { agentId, organizationId: socket.organizationId, socketId: socket.id });
        });

        // ── Service room (semi-public — clients track service queue) ──────────
        socket.on("joinServiceRoom", (serviceId) => {
            socket.join(`service_${serviceId}`);
            logger.info('Client joined service room', { serviceId, socketId: socket.id });
        });

        // ── Org room (authenticated staff / B2B dashboards) ───────────────────
        socket.on("joinOrgRoom", (orgId) => {
            if (!socket.authenticated) {
                socket.emit("error", { message: "Authentication required to join org room" });
                return;
            }
            // Allow org members only
            if (socket.organizationId !== orgId) {
                socket.emit("error", { message: "Cannot join another organization's room" });
                return;
            }
            socket.join(`org_${orgId}`);
            logger.info('User joined org room', { orgId, socketId: socket.id });
        });

        // ── Client (patient) tracking room via unique link ────────────────────
        socket.on("joinClientRoom", (uniqueLinkId) => {
            socket.join(uniqueLinkId);
            logger.info('Client joined tracking room', { uniqueLinkId, socketId: socket.id });
        });

        // ── Backward-compat aliases (existing frontend uses these) ────────────
        socket.on("joinDoctorRoom", (doctorId) => {
            if (!socket.authenticated) {
                socket.emit("error", { message: "Authentication required to join agent room" });
                return;
            }
            if (socket.agentId !== doctorId) {
                socket.emit("error", { message: "Cannot join another agent's room" });
                return;
            }
            socket.join(doctorId);
            socket.join(`agent_${doctorId}`);
            if (socket.organizationId) {
                socket.join(`hospital_${socket.organizationId}`);
                socket.join(`org_${socket.organizationId}`);
            }
            logger.info('Agent joined room (compat joinDoctorRoom)', { agentId: doctorId, socketId: socket.id });
        });

        socket.on("joinPatientRoom", (uniqueLinkId) => {
            socket.join(uniqueLinkId);
            logger.info('Client joined tracking room (compat joinPatientRoom)', { uniqueLinkId, socketId: socket.id });
        });

        socket.on("joinDoctorPublicRoom", (agentId) => {
            socket.join(`doctor_public_${agentId}`);
            socket.join(`service_${agentId}`);
            logger.info('Client joined agent public room (compat)', { agentId, socketId: socket.id });
        });

        socket.on("joinHospitalPublicRoom", (hospitalId) => {
            socket.join(`hospital_public_${hospitalId}`);
            socket.join(`org_${hospitalId}`);
            logger.info('Display joined org public room (compat)', { hospitalId, socketId: socket.id });
        });

        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            logger.info('Socket disconnected', { socketId: socket.id, authenticated: socket.authenticated });
        });
    });
};
