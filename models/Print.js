const mongoose = require('mongoose');
const Product = require('./Product');
const sellableFields = require('./sellableFields');
const { print } = require('../configs/productTypes');

const categories = Object.keys(print.categories);

// A general 3D print (figurine, toy, decor, ...) sold as a single unit with no variants.
const printSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: categories,
        validate: {
            validator: function (v) {
                return categories.includes(v);
            },
            message: props => `${props.value} is not a valid category!`
        }
    },
    ...sellableFields()
});

module.exports = Product.discriminator('Print', printSchema, 'print');
