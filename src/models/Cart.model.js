const mongoose = require('mongoose');
const CoursesModel = require('./Courses.model')

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
    ]
}, { _id: false });

module.exports =  mongoose.model.Carts || mongoose.model('Cart', CartSchema);