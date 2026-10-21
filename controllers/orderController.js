const Order = require('../models/Order');
const { Product } = require('../models');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createOrder = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    if (req.user.accountType === 'admin') {
        return next(new AppError('Admin accounts cannot place orders.', 400));
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return next(new AppError('Items must be an array with at least one line item.', 400));
    }

    const lineItems = [];
    let totalOrderCost = 0;

    for (const item of items) {
        if (!item.productCode || !item.quantity) {
            return next(new AppError('Each item must have a productCode and quantity.', 400));
        }

        const found = await Product.findByProductCode(item.productCode);
        if (!found || !found.unit) {
            return next(new AppError(`No product found with product code: ${item.productCode}`, 404));
        }

        const { product, unit } = found;

        const unitCost = req.user.accountType === 'retailer'
            ? (unit.price?.wholesale || 0)
            : (unit.price?.msrp || 0);

        const totalCost = unitCost * item.quantity;

        lineItems.push({
            productId: product._id,
            productCode: item.productCode,
            quantity: item.quantity,
            unitCost,
            totalCost
        });

        totalOrderCost += totalCost;
    }

    const name = req.user.accountType === 'retailer'
        ? req.user.merchantName
        : `${req.user.firstName} ${req.user.lastName}`;

    const order = await Order.create({
        userId: req.user._id,
        name,
        accountType: req.user.accountType,
        items: lineItems,
        totalOrderCost
    });

    res.status(201).json({
        status: 'success',
        data: { order }
    });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new AppError('No order found with that ID.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { order }
    });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };

    const [orders, totalItems] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
        status: 'success',
        page,
        totalPages,
        totalItems,
        data: { orders }
    });
});

exports.getMyOrderById = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

    if (!order) {
        return next(new AppError('No order found with that ID.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { order }
    });
});

exports.getUnfulfilledOrders = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { fulfillmentDate: null };

    const [orders, totalItems] = await Promise.all([
        Order.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
        Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
        status: 'success',
        page,
        totalPages,
        totalItems,
        data: { orders }
    });
});
