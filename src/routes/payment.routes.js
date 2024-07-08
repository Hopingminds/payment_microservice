const router = require('express').Router();
const { makePayment, purchasedCourse } = require('../controllers/payment.controller')
const { apiLimiter } = require('../middleware/access.limiter');

router.route('/make-payment').get(apiLimiter, makePayment);

router.route('/payment-status').post(purchasedCourse);


module.exports = router;
