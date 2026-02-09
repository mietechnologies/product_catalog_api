const express = require('express');
const apiKeyController = require('../controllers/apiKeyController');
 
const router = express.Router();

router.post('/', apiKeyController.generateNewKey);
router.post('/validate', apiKeyController.validateKey);
router.get('/', apiKeyController.getOwnersKey);

module.exports = router;