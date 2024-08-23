const mongoose = require('mongoose');

const OrdersSchema = new mongoose.Schema({
    paymentStauts: {
        status: { 
            type: String,
            enum: ["success", "failed"]
        },
        message: {
            type: String
        }
    },
    
    purchasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    name: { type: String },
    address: { type: String },
    zip:{ type: Number },
    country: { type: String },
    state: { type: String },
    gstNumber: {type:  String},
    payemntData: {type: Object},
    courses: [
        {
            course:{ type: Object }
        }
    ],
    transactionAmount: {type: Number},
    basePrice: {type: Number},
    discountedAmount: {type: Number},
    gstAmount: {type: Number},
    sgstAmount: {type: Number},
},{ timestamps: true });

module.exports =  mongoose.model.Orders || mongoose.model('Order', OrdersSchema);