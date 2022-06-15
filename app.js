const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// 1. GLOBAL MIDDLEWARES

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit reqests from same API
// allow 100 requests from a certain IP during one hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter); // only affect the API route

// body parser, reading data from body into req.body
// and limiting body size
app.use(express.json({ limit: '10kb' })); // middleware to add body in the request data

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// i.e. having ?sort=price&sort=duration
// We can also whitelist some parameters to authorize repeated fields in the query string
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// serving static files
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋🏾');
//   next();
// });

// Test middleware
// usefeul to take a look at the headers from time to time.
app.use((req, res, next) => {
  req.requestTime = new Date();
  // console.log(req.headers);
  next();
});

// ROUTE

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// for routes not handled
app.all('*', (req, res, next) => {
  // const err = new Error(`Cannot find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't fhind ${req.originalUrl} on this server!`, 404)); // express knows that anytime we pass something inside the next() call, it is an error and it will skip all other middlewares and call the error middleware.
});

// globalErrorHandler is an error middleware since its first argument is an error variable (that's how Express knows it's an error middleware)
app.use(globalErrorHandler);

// START SERVER
module.exports = app;
