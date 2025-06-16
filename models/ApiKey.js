const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    owner: { type: String, required: true },    // User Email
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
}, {
    collection: 'ApiKeys',
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

module.exports = mongoose.model('ApiKey', apiKeySchema);