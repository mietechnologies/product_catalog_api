const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    accountType: {
        type: String,
        required: true,
        enum: ['admin', 'retailer', 'consumer']
    },
    merchantName: { type: String, trim: true },
    accountStatus: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'active'
    },
    approvedDate: { type: Date },
    password: {
        type: String,
        required: true,
        minlength: [8, 'Password must be at least 8 characters long.'],
        validate: {
            validator: function (v) {
                return /[A-Z]/.test(v) && /[a-z]/.test(v) && /[\d\W]/.test(v);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character.'
        },
        select: false
    },
    createdAt: { type: Date, default: Date.now }
}, {
    collection: 'Users',
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        }
    },
    toObject: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        }
    }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
