const mongoose = require('mongoose');
const Product = require('./Product');
const sellableFields = require('./sellableFields');
const { miniature } = require('../configs/productTypes');

const sizeCategories = miniature.sizes;
const categories = Object.keys(miniature.categories);

const variantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    size: {
        type: String,
        required: true,
        enum: sizeCategories,
        validate: {
            validator: function (v) {
                return sizeCategories.includes(v);
            },
            message: props => `${props.value} is not a valid size!`
        }
    },
    ...sellableFields()
}, {
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

const miniatureSchema = new mongoose.Schema({
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
    variants: [variantSchema]
});

miniatureSchema.methods.sellableUnits = function () {
    return this.variants;
};

module.exports = Product.discriminator('Miniature', miniatureSchema, 'miniature');
