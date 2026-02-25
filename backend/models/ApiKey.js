const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema({
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    name: { type: String, required: true }, // e.g. "Production Key", "Development Key"
    prefix: { type: String, required: true }, // e.g. "sq_live_", "sq_test_"
    keyHash: { type: String, required: true }, // bcrypt hashed actual key
    status: {
        type: String,
        enum: ["Active", "Revoked"],
        default: "Active"
    },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Index to quickly verify a key hash attempt. (A hospital might have multiple keys)
apiKeySchema.index({ hospitalId: 1, status: 1 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
