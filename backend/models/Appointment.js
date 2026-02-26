const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    tokenNumber: {
        type: Number
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

module.exports = mongoose.model('Appointment', appointmentSchema);
