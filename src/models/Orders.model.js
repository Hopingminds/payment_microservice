const mongoose = require('mongoose');

const OrdersSchema = new mongoose.Schema({
    purchasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    name: { type: String },
    address: { type: String },
    zip:{ type: Number },
    country: { type: String },
    state: { type: String },
    gstNumber: {type:  String}
});

module.exports =  mongoose.model.Orders || mongoose.model('Order', OrdersSchema);