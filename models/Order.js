const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    miniatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Miniature', required: true },
    productCode: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true }
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

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    accountType: {
        type: String,
        required: true,
        enum: ['consumer', 'retailer']
    },
    items: [lineItemSchema],
    totalOrderCost: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    invoicePaidDate: { type: Date },
    fulfillmentDate: { type: Date }
}, {
    collection: 'Orders',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model('Order', orderSchema);
