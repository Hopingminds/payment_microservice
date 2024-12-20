const CryptoJS = require("crypto-js");
const { deleteCart, getcartValue } = require('../services/cart.service');
const CartModel = require("../models/Cart.model");
const UserModel = require("../models/User.model");
const CoursesModel = require("../models/Courses.model");
const OrdersModel = require("../models/Orders.model");
const InstructorModel = require("../models/Instructor.model");
const PendingPaymentsModel = require("../models/PendingPayments.model");

const encryptAES128ECB = (plaintext, key) => {
    // Ensure the key is 16 bytes for AES-128
    const paddedKey = CryptoJS.enc.Utf8.parse(key.padEnd(16, ' '));

    // Encrypt plaintext using AES-128-ECB
    const encrypted = CryptoJS.AES.encrypt(plaintext, paddedKey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
    });

    // Return the encrypted text as a Base64 string
    return encrypted.toString();
};

function convertToJSONArray(dataString) {
    let values;
    if (dataString.includes('%7C')) {
        values = dataString.split('%7C');
    } else if (dataString.includes('|')) {
        values = dataString.split('|');
    }
    return values;
}

const handleGenerateUrl = (email, amount, phone, userID, name, address, zip, country, state, gstNumber, sub_mer_id) => {
    const merchant_id = "383138";
    const key = process.env.AES_KEY;
    const ref_no = Math.floor(Math.random() * 9990) + 10 + Date.now();
    // const sub_mer_id = "45";
    const amt = amount.toString();
    const return_url = `${process.env.APP_BASE_URL}/api/v1/payment-status`; // Your return URL
    const paymode = "9";


    // Manually concatenating mandatory fields as in PHP
    const man_fields = `${ref_no}|${sub_mer_id}|${amt}|${email}|${phone}|${userID}|${address}|${zip}|${country}|${state}|${gstNumber}`;
    const opt_fields = ``; // Optional fields
    const e_sub_mer_id = encryptAES128ECB(sub_mer_id, key);
    const e_ref_no = encryptAES128ECB(ref_no.toString(), key); // Convert to string
    const e_amt = encryptAES128ECB(amt, key);
    const e_return_url = encryptAES128ECB(return_url, key);
    const e_paymode = encryptAES128ECB(paymode, key);
    const e_man_fields = encryptAES128ECB(man_fields, key);
    // const e_opt_fields = encryptAES128ECB(opt_fields, key);

    // Construct the encrypted URL
    const encryptedUrl = `https://eazypay.icicibank.com/EazyPG?merchantid=${merchant_id}&mandatory fields=${encodeURIComponent(e_man_fields)}&optional fields=${encodeURIComponent(opt_fields)}&returnurl=${encodeURIComponent(e_return_url)}&Reference No=${encodeURIComponent(e_ref_no)}&submerchantid=${encodeURIComponent(e_sub_mer_id)}&transaction amount=${encodeURIComponent(e_amt)}&paymode=${encodeURIComponent(e_paymode)}`;
    // console.log(encryptedUrl.replaceAll(' ', '%20'))
    return encryptedUrl.replaceAll(' ', '%20')
};

async function makePayment(req, res) {
    const { userID, email, phone, name, address, zip, country, state, gstNumber, promoCode, subMerId, internshipPayment } = req.query
    const cartValue = await getcartValue(userID, promoCode, internshipPayment)
    const sub_mer_id = subMerId || "45";

    if (cartValue <= 0) {
        return FreePurchaseFunction(req, res, userID, email, phone, name, address, zip, country, state, gstNumber)
    }

    res.status(200).send({
        "result_code": 0,
        payment_link: handleGenerateUrl(email, cartValue, phone, userID, name, address, zip, country, state, gstNumber, sub_mer_id)
    })
}

async function purchasedCourse(req, res) {
    const data = req.body
    try {
        console.log(data);
        if (data['Response Code'] != 'E000') {
            return saveFailedPaymentStatus(res, data, "Payment Failed")
        }

        const mandatoryFieldsData = convertToJSONArray(data['mandatory fields'])
        const userID = mandatoryFieldsData[5]
        const cartData = await CartModel
            .findOne({ _id: userID })
            .populate('courses.course')
            .populate('internships.internship')

        let user = await UserModel.findById(userID)

        const orderDetails = {
            "name": user.name,
            "address": mandatoryFieldsData[6],
            "zip": mandatoryFieldsData[7],
            "country": mandatoryFieldsData[8],
            "state": mandatoryFieldsData[9],
            "gstNumber": mandatoryFieldsData[10],
            "payemntData": data,
            "courses": cartData,
            "paymentStauts": {
                status: "success",
                "message": "Paid Successfully."
            },
            "transactionAmount": data['Transaction Amount'],
        }
        
        const instructorsToUpdate = new Set();

        // Check if courses exist in the cart
        if (cartData.courses && cartData.courses.length > 0) {
            const courses = cartData.courses.map(courseItem => courseItem.course._id);

            // Initialize purchased_courses if not present
            if (!user.purchased_courses) {
                user.purchased_courses = [];
            }

            // Process courses
            for (const courseId of courses) {
                if (!user.purchased_courses.some(purchasedCourse => purchasedCourse.course && purchasedCourse.course.equals(courseId))) {
                    user.purchased_courses.push({ course: courseId });

                    // Track the instructors to update
                    const course = await CoursesModel.findById(courseId).populate('instructor');
                    if (course && course.instructor) {
                        instructorsToUpdate.add(course.instructor._id);
                    }
                }
            }
        }

        // Check if internships exist in the cart
        if (cartData.internships && cartData.internships.length > 0) {
            const internships = cartData.internships.map(internshipItem => internshipItem.internship._id);

            // Initialize purchased_internships if not present
            if (!user.purchased_internships) {
                user.purchased_internships = [];
            }

            // Process internships
            for (const internshipId of internships) {
                if (!user.purchased_internships.some(purchasedInternship => purchasedInternship.internship && purchasedInternship.internship.equals(internshipId))) {
                    user.purchased_internships.push({ internship: internshipId });

                    await PendingPaymentsModel.updateOne(
                        { user: userID, internship: internshipId, "payments.isCompleted": false },
                        { $set: { "payments.$.isCompleted": true } }
                    );
                }
            }
        }

        let orderData = { ...orderDetails, purchasedBy: userID };
        const order = new OrdersModel(orderData);

        await order.save();
        await user.save();

        for (const instructorId of instructorsToUpdate) {
            await InstructorModel.findByIdAndUpdate(instructorId, { $inc: { noOfStudents: 1 } });
        }

        await deleteCart(userID)
        console.log("Payment Success", userID, user.name)
        if (data['SubMerchantId'] === 10) {
            return res.status(200).json({ success: true, data });
        }
        return res.redirect(`${process.env.APP_SERVICE_URL}/success`)

    } catch (error) {
        return saveFailedPaymentStatus(res, data, error.message)
    }
}


async function saveFailedPaymentStatus(res, data, message) {
    try {
        const mandatoryFieldsData = convertToJSONArray(data['mandatory fields'])

        const userID = mandatoryFieldsData[5]
        let user = await UserModel.findById(userID)
        const cartData = await CartModel
                .findOne({ _id: userID })
                .populate('courses.course')
                .populate('internships.internship')


        const orderDetails = {
            "name": user.name,
            "address": mandatoryFieldsData[6],
            "zip": mandatoryFieldsData[7],
            "country": mandatoryFieldsData[8],
            "state": mandatoryFieldsData[9],
            "gstNumber": mandatoryFieldsData[10],
            "payemntData": data,
            "courses": cartData,
            "paymentStauts": {
                status: "failed",
                "message": message
            },
            "transactionAmount": data['Transaction Amount'],
        }

        let orderData = { ...orderDetails, purchasedBy: userID }
        const order = new OrdersModel(orderData)

        await order.save()

        for (const internship of cartData.internships) {
            try {
                await PendingPaymentsModel.deleteOne({ internship: internship.internship._id, user: userID });
            } catch (error) {
                console.error(`Failed to delete pending payment for internship ${internship.internship._id} and user ${userID}: ${error.message}`);
            }
        }

        console.log("Payment Failed", userID, user.name)
        if (data['SubMerchantId'] === 10) {
            return res.status(200).json({ success: false, data });
        }
        return res.redirect(`${process.env.APP_SERVICE_URL}/error`)
    } catch (error) {
        console.error(error);
        return res.redirect(`${process.env.APP_SERVICE_URL}/error`);
    }
}


async function FreePurchaseFunction(req, res, userID, email, phone, name, address, zip, country, state, gstNumber) {
    try {
        const cartData = await CartModel.findOne({ _id: userID });
        let user = await UserModel.findById(userID);

        if (!user || !cartData) {
            return res.redirect(`${process.env.APP_SERVICE_URL}/error`);
        }

        const orderDetails = {
            name,
            address,
            zip,
            country,
            state,
            gstNumber
        };

        const instructorsToUpdate = new Set();

        // Check if courses exist in the cart
        if (cartData.courses && cartData.courses.length > 0) {
            const courses = cartData.courses.map(courseItem => courseItem.course._id);

            // Initialize purchased_courses if not present
            if (!user.purchased_courses) {
                user.purchased_courses = [];
            }

            // Process courses
            for (const courseId of courses) {
                if (!user.purchased_courses.some(purchasedCourse => purchasedCourse.course && purchasedCourse.course.equals(courseId))) {
                    user.purchased_courses.push({ course: courseId });

                    // Track the instructors to update
                    const course = await CoursesModel.findById(courseId).populate('instructor');
                    if (course && course.instructor) {
                        instructorsToUpdate.add(course.instructor._id);
                    }
                }
            }
        }

        // Check if internships exist in the cart
        if (cartData.internships && cartData.internships.length > 0) {
            const internships = cartData.internships.map(internshipItem => internshipItem.internship._id);

            // Initialize purchased_internships if not present
            if (!user.purchased_internships) {
                user.purchased_internships = [];
            }

            // Process internships
            for (const internshipId of internships) {
                if (!user.purchased_internships.some(purchasedInternship => purchasedInternship.internship && purchasedInternship.internship.equals(internshipId))) {
                    user.purchased_internships.push({ internship: internshipId });
                }
            }
        }

        let orderData = { ...orderDetails, purchasedBy: userID };
        const order = new OrdersModel(orderData);

        await order.save();
        await user.save();

        for (const instructorId of instructorsToUpdate) {
            await InstructorModel.findByIdAndUpdate(instructorId, { $inc: { noOfStudents: 1 } });
        }

        await deleteCart(userID)
        console.log("Payment Success", userID, user.name)
        if (data['SubMerchantId'] === 10) {
            return res.status(200).json({ success: true, data });
        }
        return res.redirect(`${process.env.APP_SERVICE_URL}/success`)
    } catch (error) {
        console.error(error);
        return res.redirect(`${process.env.APP_SERVICE_URL}/error`);
    }
}

module.exports = { makePayment, purchasedCourse }