const express = require('express');
const router = express.Router();
const { requireApiKey } = require('../middleware/apiAuth');
const { apiLimiter } = require('../middleware/apiRateLimiter');
const { checkIdempotency } = require('../middleware/idempotency');
const { createQueueEntry, getDoctorStatus, getQueueStatus, deleteQueueEntry, getDoctorQueue, bookApiAppointment } = require('../controllers/apiV1Controller');

// All v1 B2B routes require an API Key and are rate-limited
router.use(requireApiKey);
router.use(apiLimiter);

// ----------------------------------------------------------------------
// B2B Queue Management Endpoints
// ----------------------------------------------------------------------

/**
 * @swagger
 * /v1/queue:
 *   post:
 *     summary: Add a new patient to the queue
 *     tags: [B2B API]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: Optional idempotency key to prevent duplicate check-ins
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId]
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: ID of the doctor to queue for
 *               externalPatientId:
 *                 type: string
 *                 description: Optional External Patient ID for Zero-PII masking
 *               name:
 *                 type: string
 *                 description: Optional patient name
 *               description:
 *                 type: string
 *                 description: Reason for visit
 *     responses:
 *       201:
 *         description: Patient successfully added to the queue
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid API Key
 *       429:
 *         description: Rate limit exceeded
 */
// Add patient to queue
// Expects: doctorId, externalPatientId (optional), name (optional), description (optional), Header: Idempotency-Key (optional)
router.post('/queue', checkIdempotency, createQueueEntry);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}:
 *   delete:
 *     summary: Cancel a patient's queue entry
 *     tags: [B2B API]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique link ID of the queue entry
 *     responses:
 *       200:
 *         description: Queue entry successfully cancelled
 *       404:
 *         description: Queue entry not found
 */
// Update/Cancel existing queue entry
router.delete('/queue/:uniqueLinkId', deleteQueueEntry);

/**
 * @swagger
 * /v1/queue/{uniqueLinkId}:
 *   get:
 *     summary: Get live queue status and estimated wait time for a patient
 *     tags: [B2B API]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueLinkId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique link ID of the queue entry
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *       404:
 *         description: Queue entry not found
 */
// Get queue status
router.get('/queue/:uniqueLinkId', getQueueStatus);

// ----------------------------------------------------------------------
// B2B Doctor Management Endpoints
// ----------------------------------------------------------------------

/**
 * @swagger
 * /v1/doctor/{doctorId}/queue:
 *   get:
 *     summary: Get all actively queued patients for a doctor
 *     tags: [B2B API]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the doctor
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 *       404:
 *         description: Doctor not found
 */
// Get Doctor live queue list
router.get('/doctor/:doctorId/queue', getDoctorQueue);

/**
 * @swagger
 * /v1/doctor/{doctorId}/status:
 *   get:
 *     summary: Get current availability status of a doctor
 *     tags: [B2B API]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the doctor
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *       404:
 *         description: Doctor not found
 */
// Get Doctor status (availability)
router.get('/doctor/:doctorId/status', getDoctorStatus);

// ----------------------------------------------------------------------
// B2B Appointment Endpoints
// ----------------------------------------------------------------------

/**
 * @swagger
 * /v1/appointments/book:
 *   post:
 *     summary: Book an appointment for a patient
 *     tags: [B2B API]
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
 *               doctorId:
 *                 type: string
 *               patientName:
 *                 type: string
 *               phone:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 */
router.post('/appointments/book', bookApiAppointment);

module.exports = router;
