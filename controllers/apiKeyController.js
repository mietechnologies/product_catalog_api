const express = require('express');
const ApiKey = require('../models/ApiKey');
const generateApiKey = require('../utils/generateApiKey');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/appError');

// Endpoint to create a new API key
exports.generateNewKey = catchAsync(async (req, res, next) => {
    const existingKeys = await ApiKey.findOne({ owner: 'master' });
    
    // If no keys exist, generate a Master Key
    if (!existingKeys) {
        const masterKey = await generateApiKey();
        const masterApiKey = new ApiKey({
            key: masterKey,
            owner: 'master',
        });

        await masterApiKey.save();
        return res.status(201).json({ 
            message: 'Master API Key created.',
            masterKey
        });
    }

    // If keys exist, generate a new API key for the specified owner
    const { owner } = req.body;
    if (!owner) {
        return next(new ApiError('Owner info is required.', 400));
    }

    const key = await generateApiKey();
    const apiKey = new ApiKey({ key, owner });
    await apiKey.save();

    res.status(201).json({ 
        message: 'API Key created',
        key
    });
});