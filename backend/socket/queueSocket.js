const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Doctor = require('../models/Doctor');

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    // Get token from handshake auth or cookies
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];

    // If token exists, verify it and attach doctorId and hospitalId to socket
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.doctorId = decoded.doctorId;

        // Fetch doctor to get hospitalId for multi-tenancy
        const doctor = await Doctor.findById(decoded.doctorId).select('hospitalId');
        if (doctor && doctor.hospitalId) {
          socket.hospitalId = doctor.hospitalId.toString();
        }

        socket.authenticated = true;
      } catch (err) {
        logger.warn('Socket authentication failed', {
          error: err.message,
          socketId: socket.id
        });
        socket.authenticated = false;
      }
    } else {
      socket.authenticated = false;
    }

    // Allow connection but track authentication status
    next();
  });

  io.on("connection", (socket) => {
    logger.info('Socket connection established', {
      socketId: socket.id,
      authenticated: socket.authenticated,
      doctorId: socket.doctorId || 'none'
    });

    socket.on("joinDoctorRoom", (doctorId) => {
      // Only authenticated users can join doctor rooms
      if (!socket.authenticated) {
        socket.emit("error", { message: "Authentication required to join doctor room" });
        return;
      }

      // Verify the user is joining their own room
      if (socket.doctorId !== doctorId) {
        socket.emit("error", { message: "Cannot join another doctor's room" });
        return;
      }

      socket.join(doctorId);

      // Also join the highly secure Hospital Namespace for B2B dashboards
      if (socket.hospitalId) {
        socket.join(`hospital_${socket.hospitalId}`);
      }

      logger.info('Doctor joined room and hospital namespace', {
        doctorId,
        hospitalId: socket.hospitalId,
        socketId: socket.id
      });
    });

    socket.on("joinPatientRoom", (uniqueLinkId) => {
      // Patient rooms are public (no authentication required)
      // Patients access via unique link
      socket.join(uniqueLinkId);
      logger.info('Patient joined room', {
        uniqueLinkId,
        socketId: socket.id
      });
    });

    socket.on("joinDoctorPublicRoom", (doctorId) => {
      socket.join(`doctor_public_${doctorId}`);
      logger.info('Patient joined doctor public room', {
        doctorId,
        socketId: socket.id
      });
    });

    socket.on("joinHospitalPublicRoom", (hospitalId) => {
      socket.join(`hospital_public_${hospitalId}`);
      logger.info('TV Display joined hospital public room', {
        hospitalId,
        socketId: socket.id
      });
    });

    socket.on("disconnect", () => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        authenticated: socket.authenticated
      });
    });
  });
};
