const express = require('express');
const { authenticateApiKey, optionalAuth } = require('../middleware/authenticateApiKey');
const miniatureController = require('../controllers/miniatureController');

const router = express.Router();

router.get('/', optionalAuth, miniatureController.getAllMinis);                      // Get all miniatures
router.get('/search', authenticateApiKey, miniatureController.searchMinis);          // Search miniatures by text
router.get('/:productCode', authenticateApiKey, miniatureController.getMiniByCode);  // Get a miniature by product code
router.patch('/:productCode', authenticateApiKey, miniatureController.updateMini);   // Update a miniature by product code
router.post('/', authenticateApiKey, miniatureController.createMini);                // Create a new miniature
router.post('/:productCode/variants', authenticateApiKey, miniatureController.addVariant);                                                // Add a new variant to a miniature
router.post('/:productCode/images', authenticateApiKey, miniatureController.uploadMiddleware, miniatureController.uploadVariantImages);   // Upload images for a variant
router.delete('/:productCode/images/:imageKey', authenticateApiKey, miniatureController.deleteVariantImage);                              // Delete an image from a variant


module.exports = router;