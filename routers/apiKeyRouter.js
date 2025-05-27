const express = require('express');
const apiKeyController = require('../controllers/apiKeyController');
 
const router = express.Router();

router.post('/generate', apiKeyController.generateNewKey);

module.exports = router;