const mongoose = require("mongoose");
const { string } = require("zod");

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", index: true },
  description : { type: String, required: true },
  tokenNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: ["waiting", "completed", "cancelled"],
    default: "waiting",
    index: true
  },
  number : {type : String, required: true},
  uniqueLinkId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

// Compound index for efficient queue queries
patientSchema.index({ doctorId: 1, status: 1, tokenNumber: 1 });

// Index for history queries with completedAt
patientSchema.index({ doctorId: 1, completedAt: -1 });

module.exports = mongoose.model("Patient", patientSchema);
