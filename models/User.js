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
    password: { type: String, required: true, minlength: 8, select: false },
    createdAt: { type: Date, default: Date.now }
}, {
    collection: 'Users',
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        }
    },
    toObject: {
        transform: (doc, ret) => {
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
