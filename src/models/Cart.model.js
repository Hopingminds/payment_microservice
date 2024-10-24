const mongoose = require('mongoose');
const CoursesModel = require('./Courses.model')
const InternshipModel = require('./Internship.model')

const CartSchema = new mongoose.Schema({
    _id :{ type: mongoose.Schema.Types.ObjectId, 
        auto: true, 
        required: true 
    },
    courses: [
        {
            course:{
                type: mongoose.Schema.Types.ObjectId,
                ref: CoursesModel,
            }
        }
    ],
    internships:[
        {
            internship:{
                type: mongoose.Schema.Types.ObjectId,
                ref: InternshipModel
            }
        }
    ]
}, { _id: false });

module.exports =  mongoose.model.Carts || mongoose.model('Cart', CartSchema);