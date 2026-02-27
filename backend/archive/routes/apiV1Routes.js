const express = require('express');
const router = express.Router();
const { requireApiKey } = require('../middleware/apiAuth');
const { apiLimiter } = require('../middleware/apiRateLimiter');
const { checkIdempotency } = require('../middleware/idempotency');
const {
    // Existing
    createQueueEntry,
    getDoctorStatus,
    getQueueStatus,
    deleteQueueEntry,
    getDoctorQueue,
    bookApiAppointment,
    // Phase 1 — Discovery
    getHospitalInfo,
    getBranches,
    getDoctors,
    getDoctorSlots,
    // Phase 2 — Richer Queue Controls
    listQueue,
    prioritizeQueueEntry,
    updateQueueNotes,
    bulkCreateQueueEntries,
    getQueueStats,
    // Phase 3 — Appointment Lifecycle
    listAppointments,
    arriveAppointment,
    cancelAppointment,
    // Phase 4 — Analytics
    getAnalyticsSummary,
    getDoctorAnalytics,
    getWaitTimeAnalytics,
    // Phase 5 — Developer Tooling
    testWebhook
} = require('../controllers/apiV1Controller');

// All v1 B2B routes require an API Key and are rate-limited
router.use(requireApiKey);
router.use(apiLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — DISCOVERY LAYER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/info:
 *   get:
 *     summary: Get hospital profile for this API key
 *     description: Returns the hospital name, subscription plan, status, and branch count associated with the API key in use.
 *     tags: [B2B - Discovery]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Hospital info retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                 name: "City General Hospital"
 *                 email: "admin@citygeneral.com"
 *                 subscriptionPlan: "Pro"
 *                 status: "Active"
 *                 branchCount: 3
 */
router.get('/info', getHospitalInfo);

/**
 * @swagger
 * /v1/branches:
 *   get:
 *     summary: List all branches of the hospital
 *     description: Returns all branches (name, address, active status) for the hospital tied to this API key.
 *     tags: [B2B - Discovery]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Branch list retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               total: 2
 *               data:
 *                 - id: "64f1a2b3c4d5e6f7g8h9i0j2"
 *                   name: "Main Campus"
 *                   address: "123 Health St"
 *                   isActive: true
 *                 - id: "64f1a2b3c4d5e6f7g8h9i0j3"
 *                   name: "North Clinic"
 *                   address: "456 Care Ave"
 *                   isActive: true
 */
router.get('/branches', getBranches);

/**
 * @swagger
 * /v1/doctors:
 *   get:
 *     summary: List doctors in the hospital
 *     description: Returns all doctors. Filter by branch, specialization, or availability.
 *     tags: [B2B - Discovery]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *         description: Filter by branch ID
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *         description: Partial case-insensitive match on specialization (e.g. "cardio")
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [Available, Not Available]
 *         description: Filter by current availability status
 *     responses:
 *       200:
 *         description: Doctor list retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               total: 1
 *               data:
 *                 - id: "64f1a2b3c4d5e6f7g8h9i0j4"
 *                   name: "Dr. Sarah Chen"
 *                   specialization: "Cardiology"
 *                   availability: "Available"
 *                   avgConsultationTime: 10
 *                   branchId: "64f1a2b3c4d5e6f7g8h9i0j2"
 *                   pauseMessage: null
 *                   workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
 */
router.get('/doctors', getDoctors);

/**
 * @swagger
 * /v1/doctors/{doctorId}/slots:
 *   get:
 *     summary: Get available appointment slots for a doctor on a date
 *     description: Returns time slots based on the doctor's schedule and avgConsultationTime, minus already booked slots. Up to 7 days in advance.
 *     tags: [B2B - Discovery]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Available slots retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 doctorId: "64f1a2b3c4d5e6f7g8h9i0j4"
 *                 doctorName: "Dr. Sarah Chen"
 *                 specialization: "Cardiology"
 *                 availability: "Available"
 *                 date: "2026-02-28"
 *                 totalAvailable: 3
 *                 slots:
 *                   - time: "09:00"
 *                     label: "9:00 AM"
 *                   - time: "09:10"
 *                     label: "9:10 AM"
 */
router.get('/doctors/:doctorId/slots', getDoctorSlots);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — RICHER QUEUE CONTROLS
// NOTE: /queue/stats and /queue/bulk must be declared BEFORE /queue/:uniqueLinkId
// to prevent Express matching "stats" or "bulk" as the uniqueLinkId param.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/queue/stats:
 *   get:
 *     summary: Get live queue statistics
 *     description: Returns waiting patient counts and estimated clear times per doctor. Filter to a single doctor with ?doctorId=
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema: { type: string }
 *         description: Optional — filter stats to one doctor
 *     responses:
 *       200:
 *         description: Stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalWaiting: 12
 *                 activeDoctors: 3
 *                 perDoctor:
 *                   - doctorId: "64f1..."
 *                     doctorName: "Dr. Sarah Chen"
 *                     availability: "Available"
 *                     waitingCount: 4
 *                     estimatedClearTimeMinutes: 40
 */
router.get('/queue/stats', getQueueStats);

/**
 * @swagger
 * /v1/queue/bulk:
 *   post:
 *     summary: Add multiple patients to a doctor's queue in one call
 *     description: Bulk-inserts up to 50 patients. Each patient gets a sequential token and a unique tracking URL. Useful for morning sync from an existing system.
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, patients]
 *             properties:
 *               doctorId:
 *                 type: string
 *               patients:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   properties:
 *                     externalPatientId: { type: string }
 *                     name: { type: string }
 *                     description: { type: string }
 *                     number: { type: string }
 *           example:
 *             doctorId: "64f1a2b3c4d5e6f7g8h9i0j4"
 *             patients:
 *               - externalPatientId: "ext_001"
 *                 description: "Routine checkup"
 *               - externalPatientId: "ext_002"
 *                 description: "Follow-up"
 *     responses:
 *       201:
 *         description: Patients added to queue
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "2 patients added to queue"
 *               data:
 *                 - id: "64f1..."
 *                   externalPatientId: "ext_001"
 *                   tokenNumber: 5
 *                   trackingUrl: "https://smartqueue.com/status/uuid-here"
 */
router.post('/queue/bulk', bulkCreateQueueEntries);

/**
 * @swagger
 * /v1/queue:
 *   get:
 *     summary: List queue entries with filters
 *     description: Returns queue entries for the hospital. Filter by doctor, branch, or status. Defaults to status=waiting.
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, completed, cancelled]
 *         description: Defaults to "waiting"
 *     responses:
 *       200:
 *         description: Queue entries retrieved
 */
router.get('/queue', listQueue);

/**
 * @swagger
 * /v1/queue:
 *   post:
 *     summary: Add a patient to the queue
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string, format: uuid }
 *         description: Optional UUID to prevent duplicate check-ins on retry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId]
 *             properties:
 *               doctorId: { type: string }
 *               externalPatientId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *           example:
 *             doctorId: "64f1a2b3c4d5e6f7g8h9i0j4"
 *             externalPatientId: "usr_987654321"
 *             description: "Chest pain follow-up"
 *     responses:
 *       201:
 *         description: Patient added
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "64f1..."
 *                 tokenNumber: 5
 *                 trackingUrl: "https://smartqueue.com/status/uuid-here"
 */
router.post('/queue', checkIdempotency, createQueueEntry);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}/priority:
 *   put:
 *     summary: Move a patient to the front of the queue
 *     description: Sets the patient's sortOrder below the current first patient, making them next to be seen. Emits a real-time socket update and fires a queue.updated webhook.
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Patient prioritized
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Patient moved to front of queue"
 *               tokenNumber: 7
 */
router.put('/queue/:uniqueLinkId/priority', prioritizeQueueEntry);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}/notes:
 *   put:
 *     summary: Attach or update a clinical note on a queue entry
 *     description: Useful when an external EHR system wants to push a triage note (e.g. "chest pain, BP 140/90") alongside the patient record.
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes: { type: string }
 *           example:
 *             notes: "BP 140/90, c/o chest pain. Flagged urgent."
 *     responses:
 *       200:
 *         description: Notes updated
 */
router.put('/queue/:uniqueLinkId/notes', updateQueueNotes);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}:
 *   get:
 *     summary: Get live queue status and estimated wait time for a patient
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Queue status retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 status: "waiting"
 *                 tokenNumber: 5
 *                 position: 3
 *                 estimatedWaitTimeMinutes: 15
 */
router.get('/queue/:uniqueLinkId', getQueueStatus);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}:
 *   delete:
 *     summary: Cancel a patient's queue entry
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Queue entry cancelled
 */
router.delete('/queue/:uniqueLinkId', deleteQueueEntry);

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR STATUS (existing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/doctor/{doctorId}/queue:
 *   get:
 *     summary: Get all waiting patients for a specific doctor
 *     tags: [B2B - Queue]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Doctor queue retrieved
 */
router.get('/doctor/:doctorId/queue', getDoctorQueue);

/**
 * @swagger
 * /v1/doctor/{doctorId}/status:
 *   get:
 *     summary: Get a doctor's current availability status
 *     tags: [B2B - Discovery]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Doctor status retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 availability: "Available"
 *                 avgConsultationTime: 10
 */
router.get('/doctor/:doctorId/status', getDoctorStatus);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — APPOINTMENT LIFECYCLE
// NOTE: /appointments/book must come before /appointments/:id routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/appointments:
 *   get:
 *     summary: List appointments with optional filters
 *     description: Returns appointments for the hospital. Filter by doctor, date, or status.
 *     tags: [B2B - Appointments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter by scheduled date (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, arrived, completed, cancelled]
 *     responses:
 *       200:
 *         description: Appointments retrieved
 */
router.get('/appointments', listAppointments);

/**
 * @swagger
 * /v1/appointments/book:
 *   post:
 *     summary: Book a scheduled appointment
 *     tags: [B2B - Appointments]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, patientName, phone, scheduledAt]
 *             properties:
 *               doctorId: { type: string }
 *               patientName: { type: string }
 *               phone: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Appointment booked
 */
router.post('/appointments/book', bookApiAppointment);

/**
 * @swagger
 * /v1/appointments/{id}/arrive:
 *   put:
 *     summary: Mark a patient as arrived and add them to the live queue
 *     description: Changes appointment status to "arrived" and automatically creates a live queue token. The doctor's dashboard will update in real-time. Returns the token number and tracking URL.
 *     tags: [B2B - Appointments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Patient arrived and queued
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Patient arrived and added to live queue"
 *               data:
 *                 appointmentId: "64f1..."
 *                 queueEntryId: "64f2..."
 *                 tokenNumber: 8
 *                 trackingUrl: "https://smartqueue.com/status/uuid-here"
 */
router.put('/appointments/:id/arrive', arriveAppointment);

/**
 * @swagger
 * /v1/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     description: Cancels a scheduled or arrived appointment. Only active appointments can be cancelled.
 *     tags: [B2B - Appointments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Appointment cancelled
 *       404:
 *         description: Active appointment not found
 */
router.put('/appointments/:id/cancel', cancelAppointment);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/analytics/summary:
 *   get:
 *     summary: Hospital-wide queue analytics summary
 *     description: Returns patient volume, completion rate, and average wait time. Use ?period=today|week|month.
 *     tags: [B2B - Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *         description: Defaults to "today"
 *     responses:
 *       200:
 *         description: Analytics summary retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 period: "today"
 *                 from: "2026-02-27T00:00:00.000Z"
 *                 to: "2026-02-27T14:30:00.000Z"
 *                 total: 47
 *                 completed: 38
 *                 cancelled: 3
 *                 waiting: 6
 *                 completionRate: "81%"
 *                 avgWaitMinutes: 22
 */
router.get('/analytics/summary', getAnalyticsSummary);

/**
 * @swagger
 * /v1/analytics/doctor/{doctorId}:
 *   get:
 *     summary: Per-doctor analytics
 *     description: Returns throughput, wait time, and completion metrics for a single doctor.
 *     tags: [B2B - Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *     responses:
 *       200:
 *         description: Doctor analytics retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 doctorId: "64f1..."
 *                 name: "Dr. Sarah Chen"
 *                 specialization: "Cardiology"
 *                 availability: "Available"
 *                 avgConsultationTime: 10
 *                 period: "today"
 *                 total: 14
 *                 completed: 11
 *                 cancelled: 1
 *                 waiting: 2
 *                 avgWaitMinutes: 18
 *                 allTimePatientsSeen: 1240
 */
router.get('/analytics/doctor/:doctorId', getDoctorAnalytics);

/**
 * @swagger
 * /v1/analytics/wait-times:
 *   get:
 *     summary: Hourly patient volume for a given date
 *     description: Returns a 24-hour breakdown of patient arrivals, completions, and avg wait time per hour. Useful for identifying peak hours and capacity planning. Defaults to today.
 *     tags: [B2B - Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: YYYY-MM-DD. Defaults to today.
 *     responses:
 *       200:
 *         description: Hourly analytics retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 date: "2026-02-27"
 *                 peakHour: "10:00"
 *                 hours:
 *                   - hour: 9
 *                     label: "09:00"
 *                     total: 5
 *                     completed: 5
 *                     avgWaitMinutes: 12
 *                   - hour: 10
 *                     label: "10:00"
 *                     total: 11
 *                     completed: 9
 *                     avgWaitMinutes: 28
 */
router.get('/analytics/wait-times', getWaitTimeAnalytics);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — DEVELOPER TOOLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /v1/webhooks/test:
 *   post:
 *     summary: Fire a test webhook event
 *     description: Dispatches a simulated event payload to all registered webhook endpoints subscribed to the given event type. The payload includes a _test=true flag so your handler can distinguish test deliveries. Use this to verify your webhook receiver is working correctly before going live.
 *     tags: [B2B - Developer Tools]
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
 *                   - doctor.status_changed
 *           example:
 *             event: "queue.created"
 *     responses:
 *       200:
 *         description: Test event dispatched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: 'Test "queue.created" event dispatched to 1 endpoint(s)'
 *               endpoints:
 *                 - url: "https://yourapp.com/webhooks/smartqueue"
 *                   id: "64f1..."
 *       404:
 *         description: No active webhooks found for this event
 */
router.post('/webhooks/test', testWebhook);

module.exports = router;
