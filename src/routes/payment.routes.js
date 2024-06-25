const router = require('express').Router();
const { makePayment, purchasedCourse } = require('../controllers/payment.controller')
const { limiter } = require('../middleware/access.limiter');

router.route('/make-payment').get(limiter, makePayment);

router.route('/payment-status').post(purchasedCourse);


module.exports = router;
