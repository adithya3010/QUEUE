const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null   // null = available at all locations
    },
    name: {
        type: String,
        required: true,
        trim: true      // e.g. "General Consultation", "Counter A", "Loan Processing"
    },
    description: { type: String },
    category: {
        type: String,   // grouping label, e.g. "Cardiology", "Corporate Loans", "Renewals"
        index: true
    },
    avgSessionDuration: {
        type: Number,
        default: 5      // minutes — used for estimated wait time calculation
    },
    maxCapacity: {
        type: Number,
        default: null   // null = unlimited queue
    },
    isActive: { type: Boolean, default: true },

    // Optional: per-service check-in/intake fields (supports any industry)
    // Examples: "Account Number", "Reason for visit", "Vehicle Plate", "Order ID"
    intakeFields: [{
        key:      { type: String, trim: true },
        label:    { type: String, trim: true },
        type:     { type: String, enum: ["text", "number", "boolean", "select", "date"], default: "text" },
        required: { type: Boolean, default: false },
        options:  [{ type: String }],
    }],
    schedule: [{
        day: {
            type: String,
            enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        startTime: String,  // HH:MM 24-hour format
        endTime:   String
    }]
}, { timestamps: true });

serviceSchema.index({ organizationId: 1, isActive: 1 });
serviceSchema.index({ organizationId: 1, category: 1 });

module.exports = mongoose.model("Service", serviceSchema);
