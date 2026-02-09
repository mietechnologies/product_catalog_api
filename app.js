const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const apiKeyRouter = require('./routers/apiKeyRouter');
const miniatureRouter = require('./routers/miniatureRouter');
const userRouter = require('./routers/userRouter');
const orderRouter = require('./routers/orderRouter');

// MIDDLEWARE
app.use(cors());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
app.use(express.json());

const photosDir = process.env.PHOTOS_DIRECTORY || path.join(__dirname, 'app_data');
app.use('/uploads', express.static(photosDir));

// ROUTES
app.use('/api/keys', apiKeyRouter);
app.use('/api/miniatures', miniatureRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);

app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;