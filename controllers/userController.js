const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const signToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.createAdmin = catchAsync(async (req, res, next) => {
    const { email, firstName, lastName, password } = req.body;

    if (!email || !firstName || !lastName || !password) {
        return next(new AppError('Please provide email, firstName, lastName, and password.', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('A user with this email already exists.', 409));
    }

    const user = await User.create({
        email,
        firstName,
        lastName,
        password,
        accountType: 'admin'
    });

    const token = signToken(user._id);

    res.status(201).json({
        status: 'success',
        token,
        data: { user }
    });
});

exports.createRetailer = catchAsync(async (req, res, next) => {
    const { email, firstName, lastName, merchantName, password } = req.body;

    if (!email || !firstName || !lastName || !merchantName || !password) {
        return next(new AppError('Please provide email, firstName, lastName, merchantName, and password.', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('A user with this email already exists.', 409));
    }

    const user = await User.create({
        email,
        firstName,
        lastName,
        merchantName,
        password,
        accountType: 'retailer',
        accountStatus: 'pending'
    });

    res.status(201).json({
        status: 'success',
        data: { user }
    });
});

exports.getPendingRetailers = catchAsync(async (req, res, next) => {
    const retailers = await User.find({ accountType: 'retailer', accountStatus: 'pending' });

    res.status(200).json({
        status: 'success',
        results: retailers.length,
        data: { retailers }
    });
});

exports.approveRetailer = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        return next(new AppError('No user found with that ID.', 404));
    }

    if (user.accountType !== 'retailer') {
        return next(new AppError('This user is not a retailer account.', 400));
    }

    if (user.accountStatus === 'active') {
        return next(new AppError('This retailer account is already active.', 400));
    }

    user.accountStatus = 'active';
    user.approvedDate = Date.now();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password.', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid email or password.', 401));
    }

    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token,
        data: { user }
    });
});
