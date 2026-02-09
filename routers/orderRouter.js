const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticateApiKey, optionalAuth } = require('../middleware/authenticateApiKey');

const router = express.Router();

router.post('/', optionalAuth, orderController.createOrder);
router.get('/unfulfilled', authenticateApiKey, orderController.getUnfulfilledOrders);
router.get('/:id', authenticateApiKey, orderController.getOrderById);

module.exports = router;
