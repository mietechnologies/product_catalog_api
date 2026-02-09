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

exports.rejectRetailer = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        return next(new AppError('No user found with that ID.', 404));
    }

    if (user.accountType !== 'retailer') {
        return next(new AppError('This user is not a retailer account.', 400));
    }

    if (user.accountStatus !== 'pending') {
        return next(new AppError('Only pending retailer accounts can be rejected.', 400));
    }

    user.accountStatus = 'rejected';
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

exports.getApprovedRetailers = catchAsync(async (req, res, next) => {
    const retailers = await User.find({ accountType: 'retailer', accountStatus: 'active' });

    res.status(200).json({
        status: 'success',
        results: retailers.length,
        data: { retailers }
    });
});

exports.getMe = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return next(new AppError('User not found.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

exports.updateMe = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    const { firstName, lastName, email, merchantName } = req.body;

    if (req.body.password || req.body.accountType || req.body.accountStatus) {
        return next(new AppError('This endpoint cannot be used to update password, accountType, or accountStatus.', 400));
    }

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (merchantName) updates.merchantName = merchantName;

    if (email) {
        const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (existing) {
            return next(new AppError('A user with this email already exists.', 409));
        }
        updates.email = email;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('This endpoint requires a Bearer token. API keys are not linked to user accounts.', 401));
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return next(new AppError('Please provide currentPassword and newPassword.', 400));
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
        return next(new AppError('Current password is incorrect.', 401));
    }

    user.password = newPassword;
    await user.save();

    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token,
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

    if (user.accountType === 'retailer' && user.accountStatus === 'pending') {
        return next(new AppError('Your retailer account is pending approval.', 403));
    }

    if (user.accountType === 'retailer' && user.accountStatus === 'rejected') {
        return next(new AppError('Your retailer account has been rejected.', 403));
    }

    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token,
        data: { user }
    });
});
