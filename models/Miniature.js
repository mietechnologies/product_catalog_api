const mongoose = require('mongoose');
const categoryAbbreviations = require('../configs/miniCategoryAbbreviations');
const sizeCategories = require('../configs/miniSizes')

const variantSchema = new mongoose.Schema({
    name: { type: String, required: true },
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
    productCode: { type: String, required: true },
    fileName: { type: String, required: true },
    images: { type: [String] },
    thumbnail: { type: String },
    price: {
        cost: { type: Number },
        wholesale: { type: Number },
        msrp: { type: Number }
    }
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
    baseName: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: Object.keys(categoryAbbreviations),
        validate: {
            validator: function (v) {
                return Object.keys(categoryAbbreviations).includes(v);
            },
            message: props => `${props.value} is not a valid category!`
        }
    },
    variants: [variantSchema]
}, {
    collection: 'Miniatures',
    timestamps: true,
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

module.exports = mongoose.model('Miniature', miniatureSchema);