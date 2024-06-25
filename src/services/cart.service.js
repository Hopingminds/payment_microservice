const CartModel = require("../models/Cart.model");

async function deleteCart(userID) {
    try {
        // Find the cart for the user
        let cart = await CartModel.findOne({ _id: userID });

        // If the user has no cart, return with a message
        if (!cart) {
            return false
        }

        // Empty the cart by setting the courses array to an empty array
        cart.courses = [];

        await cart.save();

        return true
    } catch (error) {
        console.error(error.message);
        return false
    }
}

async function getcartValue(userID) {
	try {
		const cart = await CartModel
			.findOne({ _id: userID })
			.populate('courses.course')

		if (!cart) {
			return false
		}

        let totalAmount = cart.courses.reduce((total, course) => {
            return total + course.course.base_price;
        }, 0);

		return parseFloat(totalAmount).toFixed(2);
	} catch (error) {
		console.error(error.message)
		return false
	}
}

module.exports = { deleteCart, getcartValue }