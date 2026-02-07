module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            status: 'fail',
            message: `Validation failed: ${messages.join('. ')}`,
        });
    }

    // Multer errors
    if (err.name === 'MulterError') {
        const multerMessages = {
            LIMIT_FILE_SIZE: 'File too large. Maximum size is 10 MB.',
            LIMIT_FILE_COUNT: 'Too many files. Maximum is 10 files per request.',
            LIMIT_UNEXPECTED_FILE: `Unexpected file field. Use 'images' as the field name.`,
        };
        return res.status(400).json({
            status: 'fail',
            message: multerMessages[err.code] || `Upload error: ${err.message}`,
        });
    }

    // Unexpected errors — log but don't leak details
    console.error('UNHANDLED ERROR:', err);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong.',
    });
};
