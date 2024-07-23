const mongoose = require('mongoose');

const PromoSchema = new mongoose.Schema({
    promocode: {
        type: String,
        unique: true,
    },
    validTill: {
        type: Date,
        required: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
    },
    quantity:{
        type: Number,
        default: Infinity
    },
    forCollege:{
        type: String,
    },
});

module.exports = mongoose.model.Promos || mongoose.model('Promo', PromoSchema);