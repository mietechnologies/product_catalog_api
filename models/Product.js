const mongoose = require('mongoose');

const stripInternals = {
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
};

// Optional credit for the 3D model's creator; omitted for in-house models.
const attributionSchema = new mongoose.Schema({
    creator: { type: String, trim: true },
    modelUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return !v || /^https?:\/\/\S+$/i.test(v);
            },
            message: props => `${props.value} is not a valid http(s) URL!`
        }
    }
}, { _id: false });

// Base schema for every product type. Type-specific models (Miniature, Print) are
// discriminators on this model and share the `Products` collection.
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    // Free-form groupings such as "Halloween" or "Trunk or Treat"
    collections: {
        type: [String],
        default: [],
        set: values => [...new Set((values || []).map(v => String(v).trim()).filter(Boolean))]
    },
    attribution: { type: attributionSchema, default: undefined }
}, {
    collection: 'Products',
    discriminatorKey: 'productType',
    timestamps: true,
    toJSON: stripInternals,
    toObject: stripInternals
});

productSchema.index({
    name: 'text',
    description: 'text',
    collections: 'text',
    'variants.name': 'text',
    'variants.description': 'text'
}, {
    weights: { name: 10, 'variants.name': 8, collections: 6, description: 5, 'variants.description': 3 },
    name: 'product_text_search'
});

// The units a customer can actually buy. A product without variants sells itself;
// types with variants (Miniature) override this.
productSchema.methods.sellableUnits = function () {
    return [this];
};

productSchema.statics.findByProductCode = async function (productCode, productType) {
    const filter = { $or: [{ productCode }, { 'variants.productCode': productCode }] };
    if (productType) filter.productType = productType;

    const product = await this.findOne(filter);
    if (!product) return null;

    const unit = product.sellableUnits().find(u => u.productCode === productCode);
    return { product, unit };
};

module.exports = mongoose.model('Product', productSchema);
