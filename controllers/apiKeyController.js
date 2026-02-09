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
        return next(new ApiError("An 'owner' field is required in the request body (e.g. an email address).", 400));
    }

    const existingOwnerKey = await ApiKey.countDocuments({ owner });
    if (existingOwnerKey > 0) {
        return next(new ApiError(`API Key for owner ${owner} already exists.`, 409));
    }

    const key = await generateApiKey();
    const apiKey = new ApiKey({ key, owner });
    await apiKey.save();

    res.status(201).json({ 
        message: 'API Key created',
        key
    });
});

// Endpoint to validate an API key without performing any other action
exports.validateKey = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return next(new ApiError('API key is required in the x-api-key header.', 400));
    }

    const key = await ApiKey.findOne({ key: apiKey });

    if (!key) {
        return res.status(403).json({ valid: false, message: 'Invalid API key.' });
    }

    if (!key.isActive) {
        return res.status(403).json({ valid: false, message: 'API key is inactive.' });
    }

    res.status(200).json({ valid: true, message: 'API key is valid.' });
});

exports.getOwnersKey = catchAsync(async (req, res, next) => {
    const { owner } = req.query;

    if (!owner) {
        return next(new ApiError('Owner info is required.', 400));
    }

    if (owner === 'master') {
        return next(new ApiError('Cannot retrieve master key directly.', 403));
    }

    const apiKey = await ApiKey.findOne({ owner });
    if (!apiKey) {
        return next(new ApiError(`No API Key found for owner ${owner}.`, 404));
    }

    res.status(200).json({
        message: `API Key for owner ${owner}`,
        key: apiKey.key
    });
});