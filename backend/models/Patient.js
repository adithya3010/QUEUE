const mongoose = require("mongoose");
const { string } = require("zod");

const patientSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
  externalPatientId: { type: String, index: true }, // Optional Zero-PII identifier used by external aggregators
  name: { type: String }, // Made optional for zero-PII
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", index: true },
  description: { type: String }, // Made optional
  tokenNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: ["waiting", "completed", "cancelled"],
    default: "waiting",
    index: true
  },
  number: { type: String }, // Made optional
  uniqueLinkId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

// Compound index for efficient multi-tenant queue queries
patientSchema.index({ hospitalId: 1, doctorId: 1, status: 1, tokenNumber: 1 });

// Index for history queries with completedAt
patientSchema.index({ hospitalId: 1, doctorId: 1, completedAt: -1 });

module.exports = mongoose.model("Patient", patientSchema);
