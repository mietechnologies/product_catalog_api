const express = require('express');
const { authenticateApiKey, optionalAuth } = require('../middleware/authenticateApiKey');
const productController = require('../controllers/productController');

// Builds the product router. Pass a productType (e.g. 'miniature') to scope every
// route to that type; leave it out for the all-types /api/products router.
module.exports = function buildProductRouter(productType) {
    const router = express.Router();

    if (productType) {
        router.use(productController.scopeToProductType(productType));
    } else {
        router.get('/meta', productController.getProductMeta);                          // Product types, categories, sizes, collections
    }

    router.get('/', optionalAuth, productController.getAllProducts);                     // Get all products
    router.get('/search', optionalAuth, productController.searchProducts);               // Search products by text
    router.get('/:productCode', optionalAuth, productController.getProductByCode);       // Get a product by product code
    router.patch('/:productCode', authenticateApiKey, productController.updateProduct);  // Update a product by product code
    router.post('/', authenticateApiKey, productController.createProduct);               // Create a new product
    router.post('/:productCode/variants', authenticateApiKey, productController.addVariant);                                                  // Add a new variant to a miniature
    router.post('/:productCode/images', authenticateApiKey, productController.uploadMiddleware, productController.uploadProductImages);      // Upload images for a variant or print
    router.delete('/:productCode/images/:imageKey', authenticateApiKey, productController.deleteProductImage);                              // Delete an image from a variant or print

    return router;
}
