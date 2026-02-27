const mongoose = require("mongoose");

const idempotencyKeySchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true         // was: hospitalId
    },
    key:            { type: String, required: true },     // Idempotency-Key header value
    requestPath:    { type: String, required: true },
    requestMethod:  { type: String, required: true },
    responseStatus: { type: Number },
    responseBody:   { type: mongoose.Schema.Types.Mixed },
    expiresAt:      { type: Date, expires: 0 }            // TTL index — auto-deleted after 24h
});

// Rapidly look up a specific idempotency key for an organization
idempotencyKeySchema.index({ organizationId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("IdempotencyKey", idempotencyKeySchema);
