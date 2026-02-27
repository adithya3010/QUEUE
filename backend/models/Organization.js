const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    industry: {
        type: String,
        enum: ["healthcare", "banking", "government", "education", "salon", "retail", "other"],
        default: "other"
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    locations: [{
        name: { type: String, required: true },
        address: { type: String },
        timezone: { type: String, default: "Asia/Kolkata" },
        isActive: { type: Boolean, default: true }
    }],
    subscriptionPlan: {
        type: String,
        enum: ["Starter", "Growth", "Enterprise"],
        default: "Starter"
    },
    status: {
        type: String,
        enum: ["Active", "Suspended"],
        default: "Active"
    },
    settings: {
        defaultSessionDuration: { type: Number, default: 5 }, // minutes
        allowWalkIn:            { type: Boolean, default: true },
        allowAppointments:      { type: Boolean, default: true },
        kioskEnabled:           { type: Boolean, default: true }
    }
}, { timestamps: true });

organizationSchema.index({ email: 1 }, { unique: true });
organizationSchema.index({ slug: 1 },  { unique: true });

module.exports = mongoose.model("Organization", organizationSchema);
