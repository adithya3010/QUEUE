const router = require("express").Router();
const Patient = require("../models/Patient");
const { auth } = require("../middleware/authMiddleware");
const { calculateWaitTimes } = require("../utils/waitTimeCalculator");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const { addPatientSchema } = require("../validators/pat_validator");
const logger = require("../utils/logger");

// Helper function to safely emit socket events
// Handles cases where socket.io might not be initialized (e.g., in tests)
const emitSocketEvent = (room, event, data) => {
  if (!global.io || typeof global.io.to !== 'function') {
    return; // Socket.io not available, skip emission
  }

  const roomSocket = global.io.to(room);
  if (roomSocket && typeof roomSocket.emit === 'function') {
    if (data !== undefined) {
      roomSocket.emit(event, data);
    } else {
      roomSocket.emit(event);
    }
  }
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
 *               - age
 *               - phoneNumber
 *               - doctorId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 150
 *                 example: 35
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 example: 9876543210
 *               doctorId:
 *                 type: string
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
 *                   example: Patient added
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
    const { name, description, number, doctorId: bodyDoctorId } = validatedData;

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
      doctorId,
      name,
      description,
      number,
      tokenNumber: count + 1,
      uniqueLinkId: uuidv4()
    });

    emitSocketEvent(doctorId.toString(), "queueUpdated");

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
      doctorId: req.params.doctorId,
      status: { $in: ["waiting"] }
    }).sort({ tokenNumber: 1 });

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
        message: "Thank you for visiting"
      });
    }
    const queue = await Patient.find({
      doctorId: patient.doctorId,
      status: { $in: ["waiting"] }
    }).sort({ tokenNumber: 1 });
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


router.put("/complete/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { status: "completed", completedAt: new Date() },
      { new: true }
    );

    if (!patient)
      return res.status(404).json({ message: "Patient not found" });

    emitSocketEvent(patient.doctorId.toString(), "queueUpdated");
    emitSocketEvent(patient.uniqueLinkId, "visitCompleted", { message: "Thank you for visiting" });

    res.json(patient);

  } catch (err) {
    logger.error("Complete Patient Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/cancel/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );

    if (!patient)
      return res.status(404).json({ message: "Patient not found" });

    emitSocketEvent(patient.doctorId.toString(), "queueUpdated");
    emitSocketEvent(patient.uniqueLinkId, "visitCancelled", { message: "Your appointment has been cancelled." });

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
      doctorId: req.params.doctorId,
      status: "waiting"
    }).sort({ tokenNumber: 1 });

    const topLimit = Math.min(3, queue.length);

    const currentTop = queue.slice(0, topLimit);

    if (newOrder.length !== topLimit)
      return res.status(400).json({ message: "Invalid reorder request" });

    for (let i = 0; i < newOrder.length; i++) {
      await Patient.findByIdAndUpdate(newOrder[i], {
        tokenNumber: i + 1
      });
    }

    let nextToken = newOrder.length + 1;

    for (let i = topLimit; i < queue.length; i++) {
      await Patient.findByIdAndUpdate(queue[i]._id, {
        tokenNumber: nextToken++
      });
    }

    emitSocketEvent(req.params.doctorId.toString(), "queueUpdated");

    res.json({ message: "Reordered successfully" });

  } catch (err) {
    logger.error("Reorder Error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "Server error" });
  }
});





module.exports = router;
