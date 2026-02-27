const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true     // was: hospitalId
    },
    name:    { type: String, required: true },   // e.g. "Production Key", "Development Key"
    prefix:  { type: String, required: true },   // e.g. "sq_live_", "sq_test_"
    keyHash: { type: String, required: true },   // bcrypt-hashed secret
    status: {
        type: String,
        enum: ["Active", "Revoked"],
        default: "Active"
    },
    lastUsedAt: { type: Date },
    expiresAt:  { type: Date },
    createdAt:  { type: Date, default: Date.now }
});

apiKeySchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
