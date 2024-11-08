const mongoose = require('mongoose');

const PendingPaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Courses'
    },
    internship: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Internship'
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    totalPaid: {
        type: Number,
        default: 0
    },
    pendingAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ["fully_paid", "partial_paid", "registration_paid"]
    },
    payments: [{
        amount: {
            type: Number
        },
        isCompleted: {
            type: Boolean,
            default: false
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('PendingPayment', PendingPaymentSchema);
