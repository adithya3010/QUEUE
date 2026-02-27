const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true                  // was: hospitalId → Hospital
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,   // was: branchId
        required: function () {
            return this.role === "AGENT" || this.role === "OPERATOR";
        }
    },
    role: {
        type: String,
        enum: ["ORG_ADMIN", "AGENT", "OPERATOR"],  // was: HOSPITAL_ADMIN | DOCTOR | RECEPTIONIST
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId; // Password not required for Google OAuth users
        }
    },
    googleId: {
        type: String,
        index: true,
        sparse: true
    },

    // ─── AGENT fields (was: DOCTOR) ──────────────────────────────
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service"                  // primary service this agent works
    },
    serviceCategory: {
        type: String,                   // was: specialization
        required: function () {
            return this.role === "AGENT";
        }
    },
    avgSessionDuration: {
        type: Number,
        default: 5                      // minutes; was: avgConsultationTime
    },
    availability: {
        type: String,
        enum: ["Available", "Unavailable"],  // was: "Not Available" → "Unavailable"
        default: "Available"
    },
    statusMessage: {
        type: String,
        default: ""                     // was: pauseMessage
    },
    schedule: [{
        day: {
            type: String,
            enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        startTime: String, // HH:MM in 24h format
        endTime:   String
    }],
    metrics: {
        totalServed:        { type: Number, default: 0 },  // was: totalPatientsSeen
        avgWaitTimeMinutes: { type: Number, default: 0 }   // was: avgWaitTimeOverall
    },

    // ─── OPERATOR fields (was: RECEPTIONIST) ─────────────────────
    assignedAgents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"                     // was: assignedDoctors
    }],

    // ─── Authentication & Security ────────────────────────────────
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokenExpiry: {
        type: Date,
        default: null
    },
    resetPasswordToken:  String,
    resetPasswordExpiry: Date,

}, { timestamps: true });

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    if (!this.password) return; // Google OAuth users have no password

    if (!this.password.startsWith("$2b$")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);
