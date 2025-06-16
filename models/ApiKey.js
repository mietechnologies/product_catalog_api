const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    owner: { type: String, required: true },    // User Email
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
}, {
    collection: 'ApiKeys'
});

module.exports = mongoose.model('ApiKey', apiKeySchema);