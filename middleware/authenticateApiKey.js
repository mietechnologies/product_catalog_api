const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

exports.authenticateApiKey = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // 1. If API key is present, validate it (existing behavior)
    if (apiKey) {
        const key = await ApiKey.findOne({ key: apiKey });

        if (!key) {
            return res.status(403).json({ message: 'Invalid API key. No matching key found.' });
        }

        if (!key.isActive) {
            return res.status(403).json({ message: `API key for owner '${key.owner}' is inactive.` });
        }

        req.apiKey = key;
        return next();
    }

    // 2. If no API key, check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ message: 'User belonging to this token no longer exists.' });
            }

            if (user.accountType !== 'admin') {
                return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
            }

            req.user = user;
            return next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
    }

    // 3. No auth provided
    return res.status(401).json({ message: 'Authentication required. Provide an API key or Bearer token.' });
});

// Optional auth — identifies the caller if credentials are provided but allows anonymous access
exports.optionalAuth = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        const key = await ApiKey.findOne({ key: apiKey });

        if (!key) {
            return res.status(403).json({ message: 'Invalid API key. No matching key found.' });
        }

        if (!key.isActive) {
            return res.status(403).json({ message: `API key for owner '${key.owner}' is inactive.` });
        }

        req.apiKey = key;
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ message: 'User belonging to this token no longer exists.' });
            }

            req.user = user;
            return next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
    }

    // No credentials — continue as anonymous
    next();
});
