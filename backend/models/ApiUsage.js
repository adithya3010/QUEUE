const mongoose = require("mongoose");

const apiUsageSchema = new mongoose.Schema({
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    yearMonth: { type: String, required: true, index: true }, // Format: YYYY-MM
    requestCount: { type: Number, default: 0 }
});

// Compound index to ensure one record per hospital per month
apiUsageSchema.index({ hospitalId: 1, yearMonth: 1 }, { unique: true });

module.exports = mongoose.model("ApiUsage", apiUsageSchema);
