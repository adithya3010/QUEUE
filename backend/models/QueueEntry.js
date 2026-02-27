const mongoose = require("mongoose");

const queueEntrySchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true             // optional — pre-assignment to a specific agent
    },

    // ── Client identification ───────────────────────────────────────────────
    externalClientId: { type: String, index: true },   // zero-PII external ref
    clientName:       { type: String },                // optional for zero-PII flows
    clientPhone:      { type: String },                // for SMS/WhatsApp notifications

    // ── Queue data ──────────────────────────────────────────────────────────
    notes:       { type: String, default: "" },        // service/clinical note
    tokenNumber: { type: Number, required: true },
    sortOrder:   { type: Number },                     // for manual reordering; independent of tokenNumber

    status: {
        type: String,
        enum: ["waiting", "serving", "completed", "cancelled", "no-show"],
        default: "waiting",
        index: true
    },
    uniqueLinkId: { type: String, required: true, unique: true },

    // ── Post-service ────────────────────────────────────────────────────────
    feedback: {
        rating:  { type: Number, min: 1, max: 5 },
        comment: { type: String }
    },

    createdAt:   { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Efficient multi-tenant queue queries (primary workhorse index)
queueEntrySchema.index({ organizationId: 1, serviceId: 1, status: 1, tokenNumber: 1 });

// History queries sorted by completion time
queueEntrySchema.index({ organizationId: 1, serviceId: 1, completedAt: -1 });

// Agent-specific queue view
queueEntrySchema.index({ organizationId: 1, agentId: 1, status: 1, tokenNumber: 1 });

module.exports = mongoose.model("QueueEntry", queueEntrySchema);
