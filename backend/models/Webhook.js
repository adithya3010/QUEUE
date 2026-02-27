const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true     // was: hospitalId
    },
    url:    { type: String, required: true },
    secret: { type: String, required: true },   // HMAC SHA-256 signing secret
    events: [{
        type: String,
        enum: [
            "queue.created",
            "queue.updated",
            "queue.completed",
            "queue.cancelled",
            "agent.status_changed"  // was: doctor.status_changed
        ]
    }],
    isActive:  { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Webhook", webhookSchema);
