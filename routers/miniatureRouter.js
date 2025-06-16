const express = require('express');
const miniatureController = require('../controllers/miniatureController');

const router = express.Router();

router.get('/', miniatureController.getAllMinis);                // Get all miniatures
router.get('/:productCode', miniatureController.getMiniByCode);  // Get a miniature by product code
router.post('/', miniatureController.createMini);                // Create a new miniature


module.exports = router;