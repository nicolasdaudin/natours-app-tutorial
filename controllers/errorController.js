const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  // const value = err.errmsg;
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again!', 401);

const sendErrorDev = (err, req, res) => {
  // it's an API call
  if (req.originalUrl.startsWith('/api')) {
    // the entire URL without the host}
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  console.error('ERROR 💥', err);

  // not an API Call, we want to RENDER an error
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // IF API CALL
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Operational error, trusted error: send message to client
      // we know the error and that it won't be a weird 'message' field (since we built it ourselves)

      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // programming erros, 3rd party client .... we don't give details to the client
    // but we need to log the error
    console.error('ERROR 💥', err);

    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  // If Not an API CALL = we want to render a page
  if (err.isOperational) {
    // Operational error, trusted error: send message to client
    // we know the error and that it won't be a weird 'message' field (since we built it ourselves)
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // programming erros, 3rd party client .... we don't give details to the client
  // but we need to log the error
  console.error('ERROR 💥', err);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // if we only do error = {...err} it's a shallow copy it does not copy properties from the prototype (so it doesn't copy name or message or stack...)
    let error = {
      ...err,
      message: err.message,
    };

    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(
      // { ...error, name: err.name, message: err.message, stack: err.stack },
      error,
      req,
      res
    );
  }
};
