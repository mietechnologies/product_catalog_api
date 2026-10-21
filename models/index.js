// Load every product discriminator so `Product` queries hydrate the right type.
const Product = require('./Product');
const Miniature = require('./Miniature');
const Print = require('./Print');

const productModels = {
    miniature: Miniature,
    print: Print
};

module.exports = { Product, Miniature, Print, productModels };
