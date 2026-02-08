const express = require('express');
const userController = require('../controllers/userController');
const { authenticateApiKey } = require('../middleware/authenticateApiKey');

const router = express.Router();

router.post('/admin', authenticateApiKey, userController.createAdmin);
router.post('/login', userController.login);

module.exports = router;
