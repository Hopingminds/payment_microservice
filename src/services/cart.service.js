const CartModel = require("../models/Cart.model");
const PromoModel = require("../models/Promo.model");
const UserModel = require("../models/User.model");

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

async function getcartValue(userID, promoCode) {
	try {
        const user = await UserModel.findById(userID);
		const cart = await CartModel
			.findOne({ _id: userID })
			.populate('courses.course')

		if (!cart) {
			return false
		}

        let totalAmount = cart.courses.reduce((total, course) => {
            const discountedPrice = course.course.base_price * (1 - (course.course.discount_percentage / 100))
            return total + discountedPrice;
        }, 0);

        // Check if promoCode is provided
		if (promoCode) {
			// Fetch the promo code details
			const promo = await PromoModel.findOne({ promocode: promoCode });

			// Check if the promo code is valid
			if (promo) {
				const currentDate = new Date();
				if (promo.validTill > currentDate && (promo.forCollege === user.college || !promo.forCollege)) {
					// Apply promo discount
					totalAmount = totalAmount * (1 - (promo.discountPercentage / 100));

                    // Decrease the promo quantity if it's not infinite
					if (promo.quantity > 0) {
						promo.quantity -= 1;
						await promo.save();
					}
				}
			}
		}

        console.log(totalAmount)
		return parseFloat(totalAmount).toFixed(2);
	} catch (error) {
		console.error(error.message)
		return false
	}
}

module.exports = { deleteCart, getcartValue }