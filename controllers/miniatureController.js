const multer = require('multer');
const path = require('path');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const Miniature = require('../models/Miniature');
const ApiError = require('../utils/appError');
const categoryAbbreviations = require('../configs/miniCategoryAbbreviations');
const sizeCategories = require('../configs/miniSizes');
const { generateMiniatureProductCode, getVariantCountForCategory } = require('../utils/productCode');
const { safeNumber } = require('../utils/validation');

// Multer configuration for image uploads
const PHOTOS_DIR = process.env.PHOTOS_DIRECTORY || path.join(__dirname, '..', 'app_data');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.params.productCode}-${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extMatch = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = allowed.test(file.mimetype.split('/')[1]);
    if (extMatch && mimeMatch) {
        cb(null, true);
    } else {
        cb(new ApiError('Only jpeg, jpg, png, gif, and webp files are allowed', 400), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadMiddleware = upload.array('images', 10);

// Endpoint to get all minis with pagination and filters
// Example: GET /api/miniatures?page=1&limit=20&category=Dragon&size=Large&minPrice=5&maxPrice=50&hasVariants=true
exports.getAllMinis = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { category, size, hasVariants, minPrice, maxPrice } = req.query;

    // Build DB-level filter
    const filter = {};

    if (category) {
        if (!Object.keys(categoryAbbreviations).includes(category)) {
            return next(new ApiError(`Invalid category: ${category}. Valid categories: ${Object.keys(categoryAbbreviations).join(', ')}`, 400));
        }
        filter.category = category;
    }

    if (size) {
        if (!sizeCategories.includes(size)) {
            return next(new ApiError(`Invalid size: ${size}. Valid sizes: ${sizeCategories.join(', ')}`, 400));
        }
        filter['variants.size'] = size;
    }

    if (hasVariants === 'true') {
        filter['variants.1'] = { $exists: true };
    }

    if (minPrice !== undefined) {
        const min = parseFloat(minPrice);
        if (isNaN(min)) {
            return next(new ApiError('minPrice must be a valid number', 400));
        }
        filter['variants.price.msrp'] = { ...filter['variants.price.msrp'], $gte: min };
    }

    if (maxPrice !== undefined) {
        const max = parseFloat(maxPrice);
        if (isNaN(max)) {
            return next(new ApiError('maxPrice must be a valid number', 400));
        }
        filter['variants.price.msrp'] = { ...filter['variants.price.msrp'], $lte: max };
    }

    const miniatures = await Miniature.find(filter, {
        baseName: 1,
        category: 1,
        variants: 1
    })

    let allItems = miniatures.flatMap(mini => {
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

    // Post-query filtering on flattened variants (DB filters match documents, not individual variants)
    if (size) {
        allItems = allItems.filter(item => item.size === size);
    }
    if (minPrice !== undefined) {
        const min = parseFloat(minPrice);
        allItems = allItems.filter(item => item.msrp >= min);
    }
    if (maxPrice !== undefined) {
        const max = parseFloat(maxPrice);
        allItems = allItems.filter(item => item.msrp <= max);
    }

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
});

// Endpoint to search minis by text query
// Example: GET /api/miniatures/search?q=dragon&page=1&limit=20
exports.searchMinis = catchAsync(async (req, res, next) => {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (!q) {
        return next(new ApiError('Search query parameter "q" is required', 400));
    }

    const miniatures = await Miniature.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' }, baseName: 1, category: 1, variants: 1 }
    ).sort({ score: { $meta: 'textScore' } });

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
    });

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
    });
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
    const { baseName, description, category, variants } = req.body;

    const categoryCode = categoryAbbreviations[category];
    if (!categoryCode) {
        return next(new ApiError(`Invalid category: ${category}`, 400));
    }
    const count = await getVariantCountForCategory(category);

    if (!Array.isArray(variants) || variants.length === 0) {
        return next(new ApiError('Variants must be an array with at least one variant', 400));
    }

    const processedVariants = [];
    for (let index = 0; index < variants.length; index++) {
        const variant = variants[index];
        if (!sizeCategories.includes(variant.size)) {
            return next(new ApiError(
                `Invalid size '${variant.size}' on variant '${variant.name || `index ${index}`}'. Valid sizes: ${sizeCategories.join(', ')}`,
                400
            ));
        }

        const productCode = generateMiniatureProductCode(category, count + index + 1);
        processedVariants.push({
            ...variant,
            productCode,
            price: {
                cost: safeNumber(variant.price?.cost),
                wholesale: safeNumber(variant.price?.wholesale),
                msrp: safeNumber(variant.price?.msrp)
            }
        });
    }

    const newMiniature = new Miniature({
        baseName,
        description,
        category,
        variants: processedVariants
    });

    await newMiniature.save();

    res.status(201).json(newMiniature);
});

// Upload images for a variant
exports.uploadVariantImages = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;

    if (!req.files || req.files.length === 0) {
        return next(new ApiError('No image files provided', 400));
    }

    const miniature = await Miniature.findOne({ 'variants.productCode': productCode });
    if (!miniature) {
        req.files.forEach(file => fs.unlink(file.path, () => {}));
        return next(new ApiError(`No miniature found with product code: ${productCode}`, 404));
    }

    const variant = miniature.variants.find(v => v.productCode === productCode);

    const existingKeys = Array.from(variant.images.keys()).map(Number);
    let nextKey = existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 0;

    const uploaded = [];
    for (const file of req.files) {
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        const key = String(nextKey++);
        variant.images.set(key, imageUrl);
        uploaded.push({ imageKey: key, imageUrl });
    }

    await miniature.save();

    res.status(201).json({
        message: `${uploaded.length} image(s) uploaded successfully`,
        uploaded,
        images: variant.images
    });
});

// Delete an image from a variant
exports.deleteVariantImage = catchAsync(async (req, res, next) => {
    const { productCode, imageKey } = req.params;

    const miniature = await Miniature.findOne({ 'variants.productCode': productCode });
    if (!miniature) {
        return next(new ApiError(`No miniature found with product code: ${productCode}`, 404));
    }

    const variant = miniature.variants.find(v => v.productCode === productCode);

    if (!variant.images.has(imageKey)) {
        return next(new ApiError(`No image found with key: ${imageKey}`, 404));
    }

    const imageUrl = variant.images.get(imageKey);
    const filename = path.basename(imageUrl);
    const filePath = path.join(PHOTOS_DIR, filename);

    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }

    variant.images.delete(imageKey);
    await miniature.save();

    res.status(200).json({
        message: 'Image deleted successfully',
        deletedKey: imageKey,
        images: variant.images
    });
});