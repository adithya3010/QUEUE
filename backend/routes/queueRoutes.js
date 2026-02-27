const router = require("express").Router();
const Patient = require("../models/Patient");
const { auth } = require("../middleware/authMiddleware");
const { calculateWaitTimes } = require("../utils/waitTimeCalculator");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const { addPatientSchema } = require("../validators/pat_validator");
const logger = require("../utils/logger");
const { sendQueueConfirmation, sendNearlyUpAlert } = require("../utils/notificationService");

// Helper function to safely emit socket events
// Handles cases where socket.io might not be initialized (e.g., in tests)
const emitSocketEvent = (room, event, data, hospitalId = null) => {
  if (!global.io || typeof global.io.to !== 'function') {
    return; // Socket.io not available, skip emission
  }

  const roomSocket = global.io.to(room);

  // Public room for patients to stream without auth
  const publicDoctorRoom = `doctor_public_${room}`;
  const publicDoctorSocket = global.io.to(publicDoctorRoom);

  // Public room for Display Board to stream without auth
  let publicHospitalSocket = null;
  if (hospitalId) {
    publicHospitalSocket = global.io.to(`hospital_public_${hospitalId}`);
  }

  // Helper inside helper
  const tryEmit = (sock) => {
    if (sock && typeof sock.emit === 'function') {
      if (data !== undefined) {
        sock.emit(event, data);
      } else {
        sock.emit(event);
      }
    }
  }

  tryEmit(roomSocket);
  tryEmit(publicDoctorSocket);
  if (publicHospitalSocket) tryEmit(publicHospitalSocket);
};

/**
 * @swagger
 * /queue/add:
 *   post:
 *     summary: Add a new patient to the queue
 *     tags: [Queue Management]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - number
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               number:
 *                 type: string
 *                 description: Patient phone number (5–20 characters)
 *                 example: "9876543210"
 *               description:
 *                 type: string
 *                 description: Visit reason (optional)
 *                 example: Routine checkup
 *               notes:
 *                 type: string
 *                 description: Receptionist clinical note (optional)
 *                 example: BP 140/90
 *               doctorId:
 *                 type: string
 *                 description: Required when called by a Receptionist. Doctors use their own ID automatically.
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Patient added to queue successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Patient added successfully
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/add", auth, async (req, res) => {
  try {
    const validatedData = addPatientSchema.parse(req.body);
    const { name, description, number, notes, doctorId: bodyDoctorId } = validatedData;

    // If a Receptionist is adding, they MUST pass doctorId in body.
    // If a Doctor is adding, they use their own ID.
    let doctorId = req.user?.id;

    if (req.user?.role === "RECEPTIONIST") {
      doctorId = bodyDoctorId;
      if (!doctorId) return res.status(400).json({ message: "Doctor ID is required for receptionists" });

      // Ensure they have permission
      const userRec = await User.findById(req.user.id);
      if (!userRec) {
        return res.status(404).json({ message: "Receptionist user not found" });
      }

      // Check if assignedDoctors exists and has items
      if (!userRec.assignedDoctors || userRec.assignedDoctors.length === 0) {
        return res.status(403).json({ message: "No doctors assigned to this receptionist" });
      }

      // Convert ObjectIds to strings for comparison
      const assignedDoctorIds = userRec.assignedDoctors.map(id => id.toString());
      if (!assignedDoctorIds.includes(doctorId.toString())) {
        return res.status(403).json({ message: "Not authorized for this doctor's queue" });
      }
    } else if (req.user?.role !== "DOCTOR" && !req.doctorId) {
      return res.status(403).json({ message: "Only Doctors or Receptionists can add patients" });
    } else if (req.doctorId) {
      // Fallback for legacy authMiddleware
      doctorId = req.doctorId;
    }

    // Verify the doctor exists and get their hospital
    const doctor = await User.findOne({ _id: doctorId, role: "DOCTOR" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (!doctor.hospitalId) {
      return res.status(500).json({ message: "Doctor is not associated with a hospital" });
    }

    const count = await Patient.countDocuments({
      doctorId,
      status: "waiting"
    });

    const patient = await Patient.create({
      hospitalId: doctor.hospitalId,
      branchId: req.user.branchId || doctor.branchId || doctor.hospitalId,
      doctorId,
      name,
      description,
      notes: notes || "",
      number,
      tokenNumber: count + 1,
      sortOrder: count + 1,
      uniqueLinkId: uuidv4()
    });

    emitSocketEvent(doctorId.toString(), "queueUpdated", undefined, doctor.hospitalId.toString());

    // Send WhatsApp/SMS Confirmation
    const trackingUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/status/${patient.uniqueLinkId}`
      : `http://localhost:3000/status/${patient.uniqueLinkId}`;
    sendQueueConfirmation(patient.number, patient.name, patient.tokenNumber, trackingUrl, doctor.name);

    res.json({
      message: "Patient added successfully",
      patient,
      statusLink: `/api/queue/status/${patient.uniqueLinkId}`
    });
  } catch (err) {
    // Handle Zod validation errors
    if (err.name === "ZodError" || err.issues) {
      return res.status(400).json({
        message: "Validation failed",
        errors: (err.issues || err.errors || []).map(e => ({
          field: e.path?.join('.') || 'unknown',
          message: e.message
        }))
      });
    }
    logger.error("Add Patient Error", {
      error: err?.message || String(err),
      stack: err?.stack,
      name: err?.name,
      userRole: req.user?.role,
      doctorId: doctorId,
      requestBody: req.body
    });
    res.status(500).json({
      message: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


router.get("/history/", auth, async (req, res) => {
  try {
    const { date, status, search, doctorId: queryDoctorId } = req.query;
    let targetDoctorId;

    // Debug logging
    logger.info("History request", {
      userId: req.user?.id,
      role: req.user?.role,
      hospitalId: req.user?.hospitalId,
      queryDoctorId
    });

    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Determine doctor context based on role
    if (req.user.role === "DOCTOR") {
      // Doctors can only see their own history
      targetDoctorId = req.user.id;
    } else if (req.user?.role === "RECEPTIONIST") {
      // Receptionists can see history for their assigned doctors
      try {
        const receptionist = await User.findById(req.user.id);
        if (!receptionist) {
          logger.error("Receptionist not found", { userId: req.user.id });
          return res.status(404).json({ message: "Receptionist not found" });
        }

        logger.info("Receptionist found", {
          userId: req.user.id,
          assignedDoctors: receptionist.assignedDoctors,
          assignedDoctorsLength: receptionist.assignedDoctors?.length
        });

        if (!receptionist.assignedDoctors || receptionist.assignedDoctors.length === 0) {
          logger.info("Receptionist has no assigned doctors, returning empty array");
          return res.json([]);
        }

        if (queryDoctorId) {
          // Verify receptionist has access to this doctor
          const assignedDoctorIds = receptionist.assignedDoctors.map(id => id.toString());
          if (!assignedDoctorIds.includes(queryDoctorId.toString())) {
            return res.status(403).json({ message: "Not authorized for this doctor's history" });
          }
          targetDoctorId = queryDoctorId;
        } else {
          // Return history for all assigned doctors
          targetDoctorId = { $in: receptionist.assignedDoctors };
        }
      } catch (recepErr) {
        logger.error("Error handling receptionist history", {
          error: recepErr.message,
          stack: recepErr.stack,
          userId: req.user.id
        });
        return res.status(500).json({
          message: "Error processing receptionist request",
          details: process.env.NODE_ENV === 'development' ? recepErr.message : undefined
        });
      }
    } else if (req.user?.role === "HOSPITAL_ADMIN") {
      // Admins can see history for any doctor in their hospital
      if (queryDoctorId) {
        // Verify doctor belongs to admin's hospital
        const doctor = await User.findOne({ _id: queryDoctorId, hospitalId: req.user.hospitalId, role: "DOCTOR" });
        if (!doctor) {
          return res.status(403).json({ message: "Doctor not found in your hospital" });
        }
        targetDoctorId = queryDoctorId;
      } else {
        // Return history for all doctors in the hospital
        const doctors = await User.find({ hospitalId: req.user.hospitalId, role: "DOCTOR" }).select('_id');
        if (doctors.length === 0) {
          return res.json([]);
        }
        targetDoctorId = { $in: doctors.map(d => d._id) };
      }
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }

    let filter = {
      hospitalId: req.user.hospitalId,
      doctorId: targetDoctorId,
      status: { $in: ["completed", "cancelled"] }
    };
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };
    if (date && !isNaN(new Date(date))) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.completedAt = { $gte: start, $lte: end };
    }

    const history = await Patient.find(filter).sort({ completedAt: -1 }).populate('doctorId', 'name specialization');
    res.json(history);
  } catch (err) {
    logger.error("History Fetch Error", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      role: req.user?.role,
      query: req.query
    });
    res.status(500).json({
      message: "Server Error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * @swagger
 * /queue/{doctorId}:
 *   get:
 *     summary: Get waiting queue for a specific doctor
 *     description: Returns all waiting patients for a doctor with estimated wait times
 *     tags: [Queue Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Queue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Server error
 */
router.get("/:doctorId", auth, async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.doctorId, role: "DOCTOR" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const queue = await Patient.find({
      hospitalId: doctor.hospitalId,
      doctorId: req.params.doctorId,
      status: { $in: ["waiting"] }
    }).sort({ sortOrder: 1, tokenNumber: 1 });

    const queueWithWaitTimes = calculateWaitTimes(queue, doctor);

    res.json(queueWithWaitTimes);
  } catch (err) {
    logger.error("Fetch Queue Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error, please try again later" });
  }
});

/**
 * @swagger
 * /queue/status/{uniqueLinkId}:
 *   get:
 *     summary: Get patient status by unique link (Public endpoint)
 *     description: Allows patients to check their queue status using the unique link sent to them. No authentication required.
 *     tags: [Queue Management]
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique link ID provided to patient
 *         example: abc123def456xyz789
 *     responses:
 *       200:
 *         description: Patient status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: completed
 *                     message:
 *                       type: string
 *                       example: Your visit is complete
 *                 - $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Invalid link
 *       500:
 *         description: Server error
 */
router.get("/status/:uniqueLinkId", async (req, res) => {
  try {
    const patient = await Patient.findOne({
      uniqueLinkId: req.params.uniqueLinkId
    });

    if (!patient) {
      return res.status(404).json({ message: "Invalid link" });
    }
    if (patient.status === "completed") {
      return res.json({
        status: "completed",
        message: "Thank you for visiting",
        feedback: patient.feedback
      });
    }
    const queue = await Patient.find({
      doctorId: patient.doctorId,
      status: { $in: ["waiting"] }
    }).sort({ sortOrder: 1, tokenNumber: 1 });
    const queueWithMarker = queue.map((p, index) => ({
      id: p._id,
      name: p.name,
      tokenNumber: p.tokenNumber,
      status: p.status,
      isMe: p.uniqueLinkId === patient.uniqueLinkId,
      position: index + 1
    }));

    const myPosition = queueWithMarker.find(q => q.isMe)?.position || null;
    const doctor = await User.findById(patient.doctorId);

    res.json({
      doctorId: patient.doctorId,
      doctorName: doctor.name,
      doctorAvailability: doctor.availability,
      doctorPauseMessage: doctor.pauseMessage || "",
      myStatus: patient.status,
      myTokenNumber: patient.tokenNumber,
      avgTime: doctor.avgConsultationTime || 5,
      myPosition,
      queue: queueWithMarker
    });

  } catch (err) {
    logger.error("Status Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /queue/feedback/{uniqueLinkId}:
 *   put:
 *     summary: Submit feedback for a completed visit
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
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Invalid rating
 *       404:
 *         description: Invalid link or visit not completed
 *       500:
 *         description: Server error
 */
router.put("/feedback/:uniqueLinkId", async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const patient = await Patient.findOneAndUpdate(
      { uniqueLinkId: req.params.uniqueLinkId, status: "completed" },
      { feedback: { rating, comment } },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Invalid link or visit not completed yet" });
    }

    res.json({ message: "Feedback submitted successfully", feedback: patient.feedback });
  } catch (err) {
    logger.error("Feedback Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/complete/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { status: "completed", completedAt: new Date() },
      { new: true }
    );

    if (!patient)
      return res.status(404).json({ message: "Patient not found" });

    emitSocketEvent(patient.doctorId.toString(), "queueUpdated", undefined, req.user.hospitalId.toString());
    emitSocketEvent(patient.uniqueLinkId, "visitCompleted", { message: "Thank you for visiting" });

    // Check if new position 2 exists and notify them
    const nextWaiting = await Patient.find({ doctorId: patient.doctorId, status: "waiting" }).sort({ tokenNumber: 1 }).limit(2);
    if (nextWaiting.length >= 2) {
      const p2 = nextWaiting[1];
      const doctor = await User.findById(patient.doctorId);
      sendNearlyUpAlert(p2.number, p2.name, doctor.name);
    }

    res.json(patient);

  } catch (err) {
    logger.error("Complete Patient Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/cancel/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { status: "cancelled" },
      { new: true }
    );

    if (!patient)
      return res.status(404).json({ message: "Patient not found" });

    emitSocketEvent(patient.doctorId.toString(), "queueUpdated", undefined, req.user.hospitalId.toString());
    emitSocketEvent(patient.uniqueLinkId, "visitCancelled", { message: "Your appointment has been cancelled." });

    // Check if new position 2 exists and notify them
    const nextWaiting = await Patient.find({ doctorId: patient.doctorId, status: "waiting" }).sort({ tokenNumber: 1 }).limit(2);
    if (nextWaiting.length >= 2) {
      const p2 = nextWaiting[1];
      const doctor = await User.findById(patient.doctorId);
      sendNearlyUpAlert(p2.number, p2.name, doctor.name);
    }

    res.json(patient);

  } catch (err) {
    logger.error("Cancel Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});



router.put("/reorder/:doctorId", auth, async (req, res) => {
  try {
    const { newOrder } = req.body;

    let queue = await Patient.find({
      hospitalId: req.user.hospitalId,
      doctorId: req.params.doctorId,
      status: "waiting"
    }).sort({ sortOrder: 1, tokenNumber: 1 });

    const topLimit = Math.min(3, queue.length);

    if (newOrder.length !== topLimit)
      return res.status(400).json({ message: "Invalid reorder request" });

    // Only update sortOrder — tokenNumber stays unchanged (patient's assigned number)
    for (let i = 0; i < newOrder.length; i++) {
      await Patient.findByIdAndUpdate(newOrder[i], {
        sortOrder: i + 1
      });
    }

    // Keep remaining patients' sortOrder after top 3
    let nextSortOrder = newOrder.length + 1;
    for (let i = topLimit; i < queue.length; i++) {
      if (!newOrder.includes(queue[i]._id.toString())) {
        await Patient.findByIdAndUpdate(queue[i]._id, {
          sortOrder: nextSortOrder++
        });
      }
    }

    emitSocketEvent(req.params.doctorId.toString(), "queueUpdated", undefined, req.user.hospitalId.toString());

    res.json({ message: "Reordered successfully" });

  } catch (err) {
    logger.error("Reorder Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});


// PUT /queue/prioritise/:patientId — Doctor moves a patient to position #1
router.put("/prioritise/:patientId", auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // Verify the doctor owns this queue
    const doctorId = patient.doctorId.toString();
    if (req.user.role === "DOCTOR" && req.user.id !== doctorId) {
      return res.status(403).json({ message: "Not authorized for this queue" });
    }

    // Get all waiting patients for this doctor, sorted by sortOrder
    const waitingQueue = await Patient.find({ doctorId, status: "waiting" }).sort({ sortOrder: 1, tokenNumber: 1 });

    // Re-order via sortOrder only: prioritised patient gets sortOrder 1, others shift up
    // tokenNumber (patient's assigned number) remains untouched
    let newSortOrder = 2;
    for (const p of waitingQueue) {
      if (p._id.toString() === req.params.patientId) {
        await Patient.findByIdAndUpdate(p._id, { sortOrder: 1 });
      } else {
        await Patient.findByIdAndUpdate(p._id, { sortOrder: newSortOrder++ });
      }
    }

    emitSocketEvent(doctorId, "queueUpdated", undefined, patient.hospitalId.toString());
    res.json({ message: "Patient prioritised successfully" });
  } catch (err) {
    logger.error("Prioritise Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

// GET /queue/summary/today — Doctor daily summary card
router.get("/summary/today", auth, async (req, res) => {
  try {
    if (req.user.role !== "DOCTOR") {
      return res.status(403).json({ message: "Doctors only" });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysPatients = await Patient.find({
      doctorId: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const completed = todaysPatients.filter(p => p.status === "completed");
    const cancelled = todaysPatients.filter(p => p.status === "cancelled");
    const waiting = todaysPatients.filter(p => p.status === "waiting");

    // Average consultation time: delta between consecutive completedAt timestamps
    let avgConsultTime = 0;
    if (completed.length >= 2) {
      const sorted = completed.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
      let totalDelta = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDelta += (new Date(sorted[i].completedAt) - new Date(sorted[i - 1].completedAt));
      }
      avgConsultTime = Math.round(totalDelta / (sorted.length - 1) / 60000); // in minutes
    }

    // Busiest hour: which hour had the most patient arrivals
    const hourBuckets = {};
    for (const p of todaysPatients) {
      const hour = new Date(p.createdAt).getHours();
      hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
    }
    let busiestHour = null;
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourBuckets)) {
      if (count > maxCount) { maxCount = count; busiestHour = parseInt(hour); }
    }
    const formatHour = (h) => h === null ? "–" : `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

    res.json({
      totalToday: todaysPatients.length,
      completed: completed.length,
      cancelled: cancelled.length,
      waiting: waiting.length,
      avgConsultTime,
      busiestHour: formatHour(busiestHour),
      noShows: cancelled.length
    });
  } catch (err) {
    logger.error("Summary Today Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
