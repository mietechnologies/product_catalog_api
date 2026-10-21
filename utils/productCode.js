const productTypes = require('../configs/productTypes');

exports.generateProductCode = function(productType, category, index) {
    const typeConfig = productTypes[productType];
    if (!typeConfig) {
        throw new Error(`Invalid product type: ${productType}`);
    }

    const categoryCode = typeConfig.categories[category];
    if (!categoryCode) {
        throw new Error(`Invalid category: ${category}`);
    }

    const number = String(index).padStart(4, '0');

    return `${typeConfig.codePrefix}-${categoryCode}-${number}`;
}

// Counts the sellable units already issued a code for this type + category,
// so the next code is count + 1.
exports.getUnitCountForCategory = async function(Model, category) {
    const products = await Model.find({ category });

    return products.reduce((count, product) => count + product.sellableUnits().length, 0);
}
