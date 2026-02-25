const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
        required: true
    },
    role: {
        type: String,
        enum: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"],
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
        required: true
    },

    // ----------------------------------------
    // DOCTOR Role Fields
    // ----------------------------------------
    specialization: {
        type: String,
        required: function () {
            return this.role === "DOCTOR";
        }
    },
    avgConsultationTime: {
        type: Number,
        default: 5
    },
    availability: {
        type: String,
        enum: ["Available", "Not Available"],
        default: "Available"
    },
    metrics: {
        totalPatientsSeen: { type: Number, default: 0 },
        avgWaitTimeOverall: { type: Number, default: 0 }
    },

    // ----------------------------------------
    // RECEPTIONIST Role Fields
    // ----------------------------------------
    assignedDoctors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    // ----------------------------------------
    // Authentication & Security
    // ----------------------------------------
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokenExpiry: {
        type: Date,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpiry: Date,

}, { timestamps: true });

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    if (!this.password.startsWith("$2b$")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});
UserSchema.index({ hospitalId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);
