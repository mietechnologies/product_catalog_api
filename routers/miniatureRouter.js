const express = require('express');
const { authenticateApiKey } = require('../middleware/authenticateApiKey');
const miniatureController = require('../controllers/miniatureController');

const router = express.Router();

router.get('/', authenticateApiKey, miniatureController.getAllMinis);                // Get all miniatures
router.get('/:productCode', authenticateApiKey, miniatureController.getMiniByCode);  // Get a miniature by product code
router.patch('/:productCode', authenticateApiKey, miniatureController.updateMini);   // Update a miniature by product code
router.post('/', authenticateApiKey, miniatureController.createMini);                // Create a new miniature


module.exports = router;