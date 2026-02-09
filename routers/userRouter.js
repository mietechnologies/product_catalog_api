const express = require('express');
const userController = require('../controllers/userController');
const { authenticateApiKey, optionalAuth } = require('../middleware/authenticateApiKey');

const router = express.Router();

router.post('/admin', authenticateApiKey, userController.createAdmin);
router.post('/retailer', userController.createRetailer);
router.get('/retailers/pending', authenticateApiKey, userController.getPendingRetailers);
router.get('/retailers/approved', authenticateApiKey, userController.getApprovedRetailers);
router.patch('/retailers/:id/approve', authenticateApiKey, userController.approveRetailer);
router.patch('/retailers/:id/reject', authenticateApiKey, userController.rejectRetailer);
router.get('/me', optionalAuth, userController.getMe);
router.patch('/me', optionalAuth, userController.updateMe);
router.patch('/me/password', optionalAuth, userController.updatePassword);
router.post('/login', userController.login);

module.exports = router;
