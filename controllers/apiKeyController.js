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