const express = require('express');
const userController = require('../controllers/userController');
const { authenticateApiKey } = require('../middleware/authenticateApiKey');

const router = express.Router();

router.post('/admin', authenticateApiKey, userController.createAdmin);
router.post('/retailer', userController.createRetailer);
router.get('/retailers/pending', authenticateApiKey, userController.getPendingRetailers);
router.patch('/retailers/:id/approve', authenticateApiKey, userController.approveRetailer);
router.post('/login', userController.login);

module.exports = router;
