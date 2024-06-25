const mongoose = require('mongoose');

const CoursesSchema = new mongoose.Schema({
    courseID: { type: String },
    title:{type: String},
    slug:{type: String},
    featured_image:{type: String},
    base_price:{type: Number},
    discount_percentage:{type: Number},
});

module.exports = mongoose.model.Courses || mongoose.model('Courses', CoursesSchema);