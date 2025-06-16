const catchAsync = require('../utils/catchAsync');
const Miniature = require('../models/Miniature');
const ApiError = require('../utils/appError');
const categoryAbbreviations = require('../configs/miniCategoryAbbreviations');
const sizeCategories = require('../configs/miniSizes');
const { generateMiniatureProductCode, getVariantCountForCategory } = require('../utils/productCode');
const { safeNumber } = require('../utils/validation');

// Endpoint to get all minis with pagination
// Example: GET /api/miniatures?page=1&limit=20
exports.getAllMinis = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    try {
        const miniatures = await Miniature.find({}, {
            baseName: 1,
            category: 1,
            variants: 1
        })

        const allItems = miniatures.flatMap(mini => {
            return mini.variants.map(variant => ({
                productCode: variant.productCode,
                name: `${mini.baseName}, ${variant.name}`,
                size: variant.size,
                category: mini.category,
                thumbnail: variant.thumbnail,
                images: variant.images,
                cost: variant.price?.cost || 0,
                wholesale: variant.price?.wholesale || 0,
                msrp: variant.price?.msrp || 0
            }));
        })

        allItems.sort((a, b) => a.productCode.localeCompare(b.productCode));

        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const items = allItems.slice(startIndex, endIndex);

        res.json({
            page,
            totalPages,
            totalItems,
            items
        })
    } catch (error) {
        return next(new ApiError('Error fetching miniatures', 500));
    }
});

// Endpoint to get a mini by it's product code
// Example: GET /api/miniatures/M-DR-0001
exports.getMiniByCode = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;

    const miniature = await Miniature.findOne({ 'variants.productCode': productCode })

    if (!miniature) {
        return next(new ApiError(`No miniature found with product code: ${productCode}`, 404));
    }

    const variant = miniature.variants.find(v => v.productCode === productCode);

    res.json({
        productCode: variant.productCode,
        name: `${miniature.baseName}, ${variant.name}`,
        size: variant.size,
        category: miniature.category,
        thumbnail: variant.thumbnail,
        images: variant.images,
        cost: variant.price?.cost || 0,
        wholesale: variant.price?.wholesale || 0,
        msrp: variant.price?.msrp || 0
    })
});

exports.updateMini = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;
    const updates = req.body;

    const miniature = await Miniature.findOne({ 'variants.productCode': productCode });
    if (!miniature) {
        return next(new ApiError(`No miniature found with product code: ${productCode}`, 404));
    }

    const variant = miniature.variants.find(v => v.productCode === productCode);

    if (updates.size && !sizeCategories.includes(updates.size)) {
        return next(new ApiError(`Invalid size: ${updates.size}`, 400));
    }

    Object.entries(updates).forEach(([key, value]) => {
        if (key === 'price' && typeof value === 'object') {
            Object.entries(value).forEach(([pKey, pValue]) => {
                if (['cost', 'wholesale', 'msrp'].includes(pKey) && typeof pValue === 'number') {
                    variant.price[pKey] = pValue;
                }
            });
        } else {
            variant[key] = value;
        }
    });

    await miniature.save();

    res.status(200).json({
        'message': 'Miniature updated successfully',
        miniature
    })
});

// Endpoint to create a new miniature
// Example: POST /api/miniatures/
exports.createMini = catchAsync(async (req, res, next) => {
    const { baseName, category, variants } = req.body;

    const categoryCode = categoryAbbreviations[category];
    if (!categoryCode) {
        return next(new ApiError(`Invalid category: ${category}`, 400));
    }
    const count = await getVariantCountForCategory(category);

    if (!Array.isArray(variants) || variants.length === 0) {
        return next(new ApiError('Variants must be an array with at least one variant', 400));
    }

    const processedVariants = variants.map((variant, index) => {
        // Save images, create thumbnail, and create URI strings for each
        if (!sizeCategories.includes(variant.size)) {
            return next(new ApiError(`Invalid size: ${variant.size}`, 400));
        }

        const productCode = generateMiniatureProductCode(category, count + index + 1);

        return {
            ...variant,
            productCode,
            price: {
                cost: safeNumber(variant.price?.cost),
                wholesale: safeNumber(variant.price?.wholesale),
                msrp: safeNumber(variant.price?.msrp)
            }
        }
    })

    const newMiniature = new Miniature({
        baseName,
        category,
        variants: processedVariants
    });

    await newMiniature.save();

    res.status(201).json(newMiniature);
});

// Function for uploading new photos for a variant