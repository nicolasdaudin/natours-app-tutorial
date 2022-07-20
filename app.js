const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controller/bookingController');
const compression = require('compression');
const cors = require('cors');

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1. GLOBAL MIDDLEWARES

// implementing CORS
app.use(cors());
// Access-Control-Allow-Origin *
// implementing it everywhere, but we could also implementing it - allowing it - on specific routes
// app.use(cors({ origin: 'httops://www.natours.com' }));
// in the case above, we only allow requests from natours.com (for example if our api was at api.natours.com, that would be necessary to allow requests from natours.com, since CORS also considers subdomains as different origin)
// this works for standard requests like GET and POST but not for more complex one like PATCH DELETE PUT. In these cases there is a PREFLIGHT request, made to OPTIONS route, to check if the route is safe. In that case we need to allow CORS on OPTIONS route
app.options('*', cors());

// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
// Special configuration for Helmet Content Security Policy, otherwise impossible to load Mapbox GL

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: [
//         "'self'",
//         'blob:',
//         'https://*.mapbox.com',
//         'ws://localhost:58098/',
//       ],
//       scriptSrc: [
//         "'self'",
//         'https://*.mapbox.com',
//         'https://cdnjs.cloudflare.com',
//         "'unsafe-inline'",
//         'blob:',
//       ],
//     },
//   })
// );

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(compression());

// limit reqests from same API
// allow 100 requests from a certain IP during one hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter); // only affect the API route

// special route for stripe webhooks
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// body parser, reading data from body into req.body
// and limiting body size
app.use(express.json({ limit: '10kb' })); // middleware to add body in the request data
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // parse data from forms, extended is for more complicated data
app.use(cookieParser());
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

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋🏾');
//   next();
// });

// Test middleware
// usefeul to take a look at the headers from time to time.
app.use((req, res, next) => {
  req.requestTime = new Date();
  // console.log(req.cookies);
  // console.log(req.headers);
  next();
});

// ROUTE
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

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
