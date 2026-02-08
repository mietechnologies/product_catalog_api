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
