const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subscriptionPlan: {
        type: String,
        enum: ["Basic", "Pro", "Enterprise"],
        default: "Basic"
    },
    status: {
        type: String,
        enum: ["Active", "Suspended"],
        default: "Active"
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Hospital", hospitalSchema);
