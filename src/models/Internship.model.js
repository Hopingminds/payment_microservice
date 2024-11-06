const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
    internshipId: { type: String },
    title: { type: String },
    slug: { type: String },
    overview: { type: String },
    registration_price: { type: Number },
    base_price: { type: Number },
    discount_percentage: { type: Number },
});


module.exports =  mongoose.model.Internships || mongoose.model('Internship', InternshipSchema);