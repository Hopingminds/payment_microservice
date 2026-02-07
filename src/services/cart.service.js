const CartModel = require("../models/Cart.model");
const PendingPaymentsModel = require("../models/PendingPayments.model");
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
        cart.internships = [];

        await cart.save();

        return true
    } catch (error) {
        console.error(error.message);
        return false
    }
}

async function getcartValue(userID, promoCode, internshipPayment) {
	try {
        const user = await UserModel.findById(userID);
		const cart = await CartModel
			.findOne({ _id: userID })
			.populate('courses.course')
			.populate('internships.internship')

		if (!cart) {
			return false
		}

		// Calculate total amount for course
        let totalCoursesAmount = cart.courses.reduce((total, course) => {
            const discountedPrice = course.course.base_price * (1 - (course.course.discount_percentage / 100));
            return total + discountedPrice;
        }, 0);

		let totalInternshipsAmount = 0;

		// Add total amount for internships
		for (const internship of cart.internships) {
			const discountedBasePrice = internship.internship.base_price * (1 - (internship.internship.discount_percentage / 100));

			if (internshipPayment === "registration_amount") {
				const remainingAmount = discountedBasePrice - internship.internship.registration_price;
				totalInternshipsAmount += internship.internship.registration_price;

				// Check if a PendingPayment entry already exists for this user and internship
				const existingPayment = await PendingPaymentsModel.findOne({
					user: userID,
					internship: internship.internship._id,
					paymentStatus: "registration_paid"
				});

				if (!existingPayment) {
					// Add entry to PendingPayment schema for registration payments if it doesn't exist
					await PendingPaymentsModel.create({
						user: userID,
						internship: internship.internship._id,
						totalAmount: discountedBasePrice,
						paymentStatus: "registration_paid",
						pendingAmount: remainingAmount,
						payments: [
							{
								amount: internship.internship.registration_price,
								isCompleted: false
							}
						]
					});
				}
			} else {
				const discountedPrice = internship.internship.base_price * (1 - (internship.internship.discount_percentage / 100));
				totalInternshipsAmount += discountedPrice;
			}
		}

		let totalAmount = totalCoursesAmount + totalInternshipsAmount;

        // Check if promoCode is provided
		if (promoCode) {
			// Fetch the promo code details
			const promo = await PromoModel.findOne({ promocode: promoCode });

			// Check if the promo code is valid
			if (promo) {
				const currentDate = new Date();
				if (promo.validTill > currentDate && (promo.forCollege === user.college || !promo.forCollege)) {
					// Apply promo discount

					if(promo.applicableTo === "courses"){
						totalCoursesAmount = totalCoursesAmount * (1 - (promo.discountPercentage / 100));
					}
					else if(promo.applicableTo === "internships"){
						totalInternshipsAmount = totalInternshipsAmount * (1 - (promo.discountPercentage / 100));
					}
					else{
						totalAmount *= (1 - (promo.discountPercentage / 100));
						console.log("TEST1",totalAmount)
					}

                    // Decrease the promo quantity if it's not infinite
					if (promo.quantity > 0) {
						promo.quantity -= 1;
						await promo.save();
					}
					// Recalculate totalAmount after applying promo and adding 18% gst
					totalAmount = totalAmount + (totalAmount * 0.18);
				}
			}
		}

        // console.log(totalCoursesAmount)
        // console.log(totalInternshipsAmount)
        console.log("TEST2",totalAmount)
		return parseFloat(totalAmount).toFixed(2);
	} catch (error) {
		console.error(error.message)
		return false
	}
}

module.exports = { deleteCart, getcartValue }
