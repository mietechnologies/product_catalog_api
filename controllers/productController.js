const multer = require('multer');
const path = require('path');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const { Product, productModels } = require('../models');
const ApiError = require('../utils/appError');
const productTypes = require('../configs/productTypes');
const { generateProductCode, getUnitCountForCategory } = require('../utils/productCode');
const { parsePrice, parseCollections, parseAttribution } = require('../utils/validation');

const sizeCategories = productTypes.miniature.sizes;
const productTypeKeys = Object.keys(productTypes);

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

// ── Helpers ──────────────────────────────────────────────────────────

// Routers mounted for one product type (e.g. /api/miniatures) pin the type here.
exports.scopeToProductType = productType => (req, res, next) => {
    req.productScope = productType;
    next();
};

function typeLabel(productType) {
    return productType === 'miniature' ? 'miniature' : 'product';
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pricingAccess(req) {
    const accountType = req.user?.accountType;
    return {
        fullAccess: !!(req.apiKey || accountType === 'admin'),
        retailerAccess: accountType === 'retailer'
    };
}

// Flattens one sellable unit into the catalog item shape, with tiered pricing.
function toCatalogItem(product, unit, { fullAccess, retailerAccess }) {
    const isVariant = unit !== product;

    const item = {
        productCode: unit.productCode,
        productType: product.productType,
        baseName: product.name,
        name: isVariant ? `${product.name}, ${unit.name}` : product.name,
        description: product.description,
        category: product.category,
        collections: product.collections || [],
        attribution: product.attribution || null,
        thumbnail: unit.thumbnail || null,
        images: unit.images,
        msrp: unit.price?.msrp || 0
    };

    if (isVariant) {
        item.variantDescription = unit.description;
        item.size = unit.size;
    }

    if (fullAccess) {
        item.cost = unit.price?.cost || 0;
        item.wholesale = unit.price?.wholesale || 0;
    } else if (retailerAccess) {
        item.wholesale = unit.price?.wholesale || 0;
    }

    return item;
}

function flattenProducts(products, access) {
    return products.flatMap(product =>
        product.sellableUnits().map(unit => toCatalogItem(product, unit, access))
    );
}

function paginate(allItems, req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;

    return {
        page,
        totalPages: Math.ceil(allItems.length / limit),
        totalItems: allItems.length,
        items: allItems.slice(startIndex, startIndex + limit)
    };
}

// Resolves the product type for a request: the router scope wins, then the given value.
function resolveProductType(req, requested) {
    const productType = req.productScope || requested;
    if (productType && !productTypes[productType]) {
        throw new ApiError(`Invalid productType: ${productType}. Valid types: ${productTypeKeys.join(', ')}`, 400);
    }
    return productType;
}

// parseAttribution throws a plain message; surface it as a 400.
function readAttribution(value) {
    try {
        return parseAttribution(value);
    } catch (message) {
        throw new ApiError(message, 400);
    }
}

async function findUnitOrFail(req, productCode) {
    const found = await Product.findByProductCode(productCode, req.productScope);
    if (!found || !found.unit) {
        throw new ApiError(`No ${typeLabel(req.productScope)} found with product code: ${productCode}`, 404);
    }
    return found;
}

// ── Endpoints ────────────────────────────────────────────────────────

// Product types, their categories and sizes, plus every collection in use.
// Example: GET /api/products/meta
exports.getProductMeta = catchAsync(async (req, res, next) => {
    const collections = (await Product.distinct('collections')).filter(Boolean).sort();

    const types = Object.fromEntries(Object.entries(productTypes).map(([key, config]) => [key, {
        label: config.label,
        codePrefix: config.codePrefix,
        hasVariants: config.hasVariants,
        categories: Object.keys(config.categories),
        ...(config.sizes ? { sizes: config.sizes } : {})
    }]));

    res.json({ productTypes: types, collections });
});

// Endpoint to get all products with pagination and filters
// Example: GET /api/products?page=1&limit=20&productType=miniature&category=Dragon&size=Large&collection=Halloween&minPrice=5&maxPrice=50&hasVariants=true
exports.getAllProducts = catchAsync(async (req, res, next) => {
    const { category, size, hasVariants, minPrice, maxPrice, collection } = req.query;
    const productType = resolveProductType(req, req.query.productType);

    // Build DB-level filter
    const filter = {};

    if (productType) {
        filter.productType = productType;
    }

    if (category) {
        const validCategories = productType
            ? Object.keys(productTypes[productType].categories)
            : [...new Set(Object.values(productTypes).flatMap(t => Object.keys(t.categories)))];
        if (!validCategories.includes(category)) {
            return next(new ApiError(`Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}`, 400));
        }
        filter.category = category;
    }

    if (size) {
        if (!sizeCategories.includes(size)) {
            return next(new ApiError(`Invalid size: ${size}. Valid sizes: ${sizeCategories.join(', ')}`, 400));
        }
        filter['variants.size'] = size;
    }

    if (collection) {
        filter.collections = { $regex: `^${escapeRegex(collection)}$`, $options: 'i' };
    }

    if (hasVariants === 'true') {
        filter['variants.1'] = { $exists: true };
    }

    let min, max;
    if (minPrice !== undefined) {
        min = parseFloat(minPrice);
        if (isNaN(min)) {
            return next(new ApiError('minPrice must be a valid number', 400));
        }
    }
    if (maxPrice !== undefined) {
        max = parseFloat(maxPrice);
        if (isNaN(max)) {
            return next(new ApiError('maxPrice must be a valid number', 400));
        }
    }

    const products = await Product.find(filter);

    let allItems = flattenProducts(products, pricingAccess(req));

    // Post-query filtering on flattened units (DB filters match documents, not individual variants)
    if (size) {
        allItems = allItems.filter(item => item.size === size);
    }
    if (min !== undefined) {
        allItems = allItems.filter(item => item.msrp >= min);
    }
    if (max !== undefined) {
        allItems = allItems.filter(item => item.msrp <= max);
    }

    allItems.sort((a, b) => a.productCode.localeCompare(b.productCode));

    res.json(paginate(allItems, req));
});

// Endpoint to search products by text query
// Example: GET /api/products/search?q=dragon&productType=miniature&page=1&limit=20
exports.searchProducts = catchAsync(async (req, res, next) => {
    const { q } = req.query;
    const productType = resolveProductType(req, req.query.productType);

    if (!q) {
        return next(new ApiError('Search query parameter "q" is required', 400));
    }

    const filter = { $text: { $search: q } };
    if (productType) filter.productType = productType;

    const products = await Product.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });

    res.json(paginate(flattenProducts(products, pricingAccess(req)), req));
});

// Endpoint to get a single sellable unit by its product code
// Example: GET /api/products/M-DR-0001
exports.getProductByCode = catchAsync(async (req, res, next) => {
    const { product, unit } = await findUnitOrFail(req, req.params.productCode);

    res.json(toCatalogItem(product, unit, pricingAccess(req)));
});

// Fields a PATCH may change on the sellable unit (variant or print), and on the product itself.
const UNIT_UPDATE_FIELDS = ['name', 'description', 'size', 'fileName', 'thumbnail'];
const PRINT_UPDATE_FIELDS = ['name', 'description', 'fileName', 'thumbnail'];

exports.updateProduct = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;
    const updates = req.body || {};

    const { product, unit } = await findUnitOrFail(req, productCode);
    const isVariant = unit !== product;
    const attribution = readAttribution(updates.attribution);

    if (isVariant && updates.size && !sizeCategories.includes(updates.size)) {
        return next(new ApiError(`Invalid size: ${updates.size}`, 400));
    }

    const allowed = isVariant ? UNIT_UPDATE_FIELDS : PRINT_UPDATE_FIELDS;
    allowed.forEach(key => {
        if (updates[key] !== undefined) unit[key] = updates[key];
    });

    if (updates.price && typeof updates.price === 'object') {
        Object.entries(updates.price).forEach(([pKey, pValue]) => {
            if (['cost', 'wholesale', 'msrp'].includes(pKey) && typeof pValue === 'number') {
                unit.price[pKey] = pValue;
            }
        });
    }

    // Product-level fields, shared by all variants
    if (isVariant && updates.baseName !== undefined) {
        product.name = updates.baseName;
    }
    const collections = parseCollections(updates.collections);
    if (collections !== undefined) {
        product.collections = collections;
    }
    // Attribution lives on the product (shared by all variants), not the variant
    if (attribution !== undefined) {
        product.attribution = attribution === null ? undefined : attribution;
    }

    await product.save();

    const label = typeLabel(product.productType);
    res.status(200).json({
        'message': `${label[0].toUpperCase()}${label.slice(1)} updated successfully`,
        [label]: product
    })
});

// Builds a new Miniature: one product code per variant.
async function buildMiniature(Model, body) {
    const { description, category, variants } = body;
    const name = body.name || body.baseName;

    if (!name) {
        throw new ApiError('baseName is required', 400);
    }
    if (!productTypes.miniature.categories[category]) {
        throw new ApiError(`Invalid category: ${category}`, 400);
    }
    if (!Array.isArray(variants) || variants.length === 0) {
        throw new ApiError('Variants must be an array with at least one variant', 400);
    }

    const count = await getUnitCountForCategory(Model, category);

    const processedVariants = variants.map((variant, index) => {
        if (!sizeCategories.includes(variant.size)) {
            throw new ApiError(
                `Invalid size '${variant.size}' on variant '${variant.name || `index ${index}`}'. Valid sizes: ${sizeCategories.join(', ')}`,
                400
            );
        }

        return {
            ...variant,
            productCode: generateProductCode('miniature', category, count + index + 1),
            price: parsePrice(variant.price)
        };
    });

    return new Model({
        name,
        description,
        category,
        collections: parseCollections(body.collections) || [],
        attribution: readAttribution(body.attribution) || undefined,
        variants: processedVariants
    });
}

// Builds a new Print: a single sellable unit with its own product code.
async function buildPrint(Model, body) {
    const { name, description, category, fileName, thumbnail, price } = body;
    const categories = productTypes.print.categories;

    if (!name) {
        throw new ApiError('name is required', 400);
    }
    if (!categories[category]) {
        throw new ApiError(`Invalid category: ${category}. Valid categories: ${Object.keys(categories).join(', ')}`, 400);
    }
    if (!fileName) {
        throw new ApiError('fileName is required', 400);
    }

    const count = await getUnitCountForCategory(Model, category);

    return new Model({
        name,
        description,
        category,
        collections: parseCollections(body.collections) || [],
        attribution: readAttribution(body.attribution) || undefined,
        fileName,
        thumbnail,
        productCode: generateProductCode('print', category, count + 1),
        price: parsePrice(price)
    });
}

const builders = {
    miniature: buildMiniature,
    print: buildPrint
};

// Endpoint to create a new product of any type
// Example: POST /api/products/  { "productType": "print", ... }
exports.createProduct = catchAsync(async (req, res, next) => {
    const productType = resolveProductType(req, req.body?.productType);

    if (!productType) {
        return next(new ApiError(`productType is required. Valid types: ${productTypeKeys.join(', ')}`, 400));
    }

    const product = await builders[productType](productModels[productType], req.body);
    await product.save();

    res.status(201).json(product);
});

// Upload images for a sellable unit (variant or print)
exports.uploadProductImages = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;

    if (!req.files || req.files.length === 0) {
        return next(new ApiError('No image files provided', 400));
    }

    let found;
    try {
        found = await findUnitOrFail(req, productCode);
    } catch (err) {
        req.files.forEach(file => fs.unlink(file.path, () => {}));
        throw err;
    }
    const { product, unit } = found;

    const existingKeys = Array.from(unit.images.keys()).map(Number);
    let nextKey = existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 0;

    const uploaded = [];
    for (const file of req.files) {
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        const key = String(nextKey++);
        unit.images.set(key, imageUrl);
        uploaded.push({ imageKey: key, imageUrl });
    }

    await product.save();

    res.status(201).json({
        message: `${uploaded.length} image(s) uploaded successfully`,
        uploaded,
        images: unit.images
    });
});

// Add a new variant to an existing miniature
exports.addVariant = catchAsync(async (req, res, next) => {
    const { productCode } = req.params;
    const { name, size, fileName, description, price } = req.body;

    if (!name) {
        return next(new ApiError('Variant name is required', 400));
    }
    if (!size || !sizeCategories.includes(size)) {
        return next(new ApiError(
            `Invalid or missing size. Valid sizes: ${sizeCategories.join(', ')}`,
            400
        ));
    }
    if (!fileName) {
        return next(new ApiError('fileName is required', 400));
    }

    const { product: miniature } = await findUnitOrFail(req, productCode);
    if (!productTypes[miniature.productType].hasVariants) {
        return next(new ApiError(`Products of type '${miniature.productType}' do not support variants`, 400));
    }

    const Model = productModels[miniature.productType];
    const count = await getUnitCountForCategory(Model, miniature.category);
    const newProductCode = generateProductCode(miniature.productType, miniature.category, count + 1);

    miniature.variants.push({
        name,
        size,
        fileName,
        description: description || '',
        productCode: newProductCode,
        price: parsePrice(price),
    });
    await miniature.save();

    const saved = miniature.variants.find(v => v.productCode === newProductCode);

    res.status(201).json({
        ...toCatalogItem(miniature, saved, { fullAccess: true }),
        images: saved.images || {},
    });
});

// Delete an image from a sellable unit (variant or print)
exports.deleteProductImage = catchAsync(async (req, res, next) => {
    const { productCode, imageKey } = req.params;

    const { product, unit } = await findUnitOrFail(req, productCode);

    if (!unit.images.has(imageKey)) {
        return next(new ApiError(`No image found with key: ${imageKey}`, 404));
    }

    const imageUrl = unit.images.get(imageKey);
    const filename = path.basename(imageUrl);
    const filePath = path.join(PHOTOS_DIR, filename);

    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }

    unit.images.delete(imageKey);
    await product.save();

    res.status(200).json({
        message: 'Image deleted successfully',
        deletedKey: imageKey,
        images: unit.images
    });
});
