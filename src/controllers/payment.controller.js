const CryptoJS = require("crypto-js");
const { deleteCart, getcartValue } = require('../services/cart.service');
const CartModel = require("../models/Cart.model");
const UserModel = require("../models/User.model");
const CoursesModel = require("../models/Courses.model");
const OrdersModel = require("../models/Orders.model");

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
    const values = dataString.split('|');
    return values;
}

const handleGenerateUrl = (email, amount, phone, userID, name, address, zip, country, state, gstNumber) => {
    const merchant_id = "139765";
    const key = process.env.AES_KEY;
    const ref_no = Math.floor(Math.random() * 9990) + 10;
    const sub_mer_id = "23";
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
    const e_opt_fields = encryptAES128ECB(opt_fields, key);

    // Construct the encrypted URL
    const encryptedUrl = `https://eazypayuat.icicibank.com/EazyPG?merchantid=${merchant_id}&mandatory fields=${encodeURIComponent(e_man_fields)}&optional fields=${encodeURIComponent(e_opt_fields)}&returnurl=${encodeURIComponent(e_return_url)}&Reference No=${encodeURIComponent(e_ref_no)}&submerchantid=${encodeURIComponent(e_sub_mer_id)}&transaction amount=${encodeURIComponent(e_amt)}&paymode=${encodeURIComponent(e_paymode)}`;

    return encryptedUrl.replaceAll(' ', '%20')
};

async function makePayment(req, res) {
    const { userID, email, phone, name, address, zip, country, state, gstNumber } = req.query
    const cartValue = await getcartValue(userID)
    if (cartValue <= 0) {
        return purchasedCourseFucntion(req, res, userID, email, phone, name, address, zip, country, state, gstNumber)
    }
    res.redirect(handleGenerateUrl(email, cartValue, phone, userID, name, address, zip, country, state, gstNumber))
}

function convertToCoursesArray(inputArray) {
    return inputArray.map(item => item.course.toString())
}

async function purchasedCourse(req, res) {
    try {
        const data = req.body

        if (data['Response Code'] != 'E000') {
            return res.redirect(`${process.env.APP_SERVICE_URL}/error`)
        }

        const mandatoryFieldsData = convertToJSONArray(data['mandatory fields'])
        const userID = mandatoryFieldsData[5]
        const cartData = await CartModel
            .findOne({ _id: userID })
        let user = await UserModel.findById(userID)

        const orderDetails = {
            "name": user.name,
            "address": mandatoryFieldsData[6],
            "zip": mandatoryFieldsData[7],
            "country": mandatoryFieldsData[8],
            "state": mandatoryFieldsData[9],
            "gstNumber": mandatoryFieldsData[10],
        }
        const courses = convertToCoursesArray(cartData.courses)
        if (!user) {
            return res.redirect(`${process.env.APP_SERVICE_URL}/error`)
        }

        for (const courseId of courses) {
            if (!user.purchased_courses.some(purchasedCourse => purchasedCourse.course.toString() === courseId.toString())) {
                user.purchased_courses.push({ course: courseId });
            }
        }

        for (const courseId of courses) {
            user.purchased_courses.push({ course: courseId })
        }

        let orderData = { ...orderDetails, purchasedBy: userID }
        const order = new OrdersModel(orderData)

        await order.save()
        await user.save()
        deleteCart(userID)
        return res.redirect(`${process.env.APP_SERVICE_URL}/success`)
    } catch (error) {
        console.log(error);
        return res.redirect(`${process.env.APP_SERVICE_URL}/error`)
    }
}


async function purchasedCourseFucntion(req, res, userID, email, phone, name, address, zip, country, state, gstNumber) {
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

        const courses = convertToCoursesArray(cartData.courses);

        for (const courseId of courses) {
            if (!user.purchased_courses.some(purchasedCourse => purchasedCourse.course.toString() === courseId.toString())) {
                user.purchased_courses.push({ course: courseId });
            }
        }

        let orderData = { ...orderDetails, purchasedBy: userID };
        const order = new OrdersModel(orderData);

        await order.save();
        await user.save();
        await deleteCart(userID);

        return res.redirect(`${process.env.APP_SERVICE_URL}/success`);
    } catch (error) {
        console.error(error);
        return res.redirect(`${process.env.APP_SERVICE_URL}/error`);
    }
}

module.exports = { makePayment, purchasedCourse }