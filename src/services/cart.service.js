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
            const discountedPrice = course.course.base_price * (1 - (course.course.discount_percentage / 100));
			return total + discountedPrice;
		}, 0);

        // Adding 18% tax to the total amount
        totalAmount = totalAmount * 1.18;

		return parseFloat(totalAmount).toFixed(2);
	} catch (error) {
		console.error(error.message)
		return false
	}
}

module.exports = { deleteCart, getcartValue }