const ApiKey = require('../models/ApiKey');
const catchAsync = require('../utils/catchAsync');

exports.authenticateApiKey = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ message: 'API key is required' });
    }

    const key = await ApiKey.findOne({ key: apiKey });

    if (!key || !key.isActive) {
        return res.status(403).json({ message: 'Invalid or inactive API key' });
    }

    req.apiKey = key; // Attach the key to the request for further use
    next();
});