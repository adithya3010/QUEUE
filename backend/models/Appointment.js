const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true         // was: hospitalId → Hospital
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true      // was: branchId
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true      // NEW — previously implicit via agentId
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'         // was: doctorId (optional — pre-assignment to a specific agent)
    },
    clientName: {
        type: String,
        required: true      // was: patientName
    },
    clientPhone: {
        type: String        // was: phone
    },
    clientEmail: {
        type: String
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    tokenNumber: {
        type: Number        // assigned when status transitions to 'arrived'
    },
    status: {
        type: String,
        enum: ['scheduled', 'arrived', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: {
        type: String
    }
}, { timestamps: true });

appointmentSchema.index({ organizationId: 1, serviceId: 1, scheduledAt: 1 });
appointmentSchema.index({ organizationId: 1, agentId: 1, scheduledAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
