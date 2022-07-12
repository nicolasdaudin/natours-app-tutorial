const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/userModel');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true, // only activate it in production, see below
    httpOnly: true, // can not be accessed or modified by the browser. The browser will only store it and send it automatically at every request
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create({
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  // });

  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
  // const token = signToken(newUser._id);

  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  // in the body we should have email, password and token
  const { email, password } = req.body;

  // check that email and password have been provided
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password'); // add a field in the selected filter, a field that was not originally filtered (select: false)
  // console.log(user);

  // check that the email and password are correct
  // if (!user) {
  //   return next(new AppError('No user found with this email', 401));
  // }

  // const encryptedInputPassword = await bcrypt.compare(password, user.password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);

  // // password is correct, we create a token with the id?
  // const token = signToken(user._id);

  // // var decoded = await jwt.verify(token, process.env.JWT_SECRET);
  // // console.log(decoded.id);

  // res.status(201).json({
  //   status: 'success',
  //   token,
  // });
});

// the cookie we set up when creating the token is httpOnly, it means we can not delete this cookie from the browser, it's impossible. We can not manipulate it
// see video 192. Logging Out Users
// what we can do, is send back a cookie with the same name (we overwrite it), and with 10 seconds of expiration...
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1. check if there is a token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // if no token in the headers, we check the cookies
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2. verification of the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (!decoded || !decoded.id) {
    return next(
      new AppError(
        'Incorrect token, you cannot access this protected route',
        403
      )
    );
  }

  // this is not enough. this is not secure enough.
  // the user might have been deleted, but someone stole his token and wants to impersonate him: we have to check this
  // also, the user might know that his token has been stolen, and changed his password accordingly. This has to be checked as well.

  // 3. check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }

  // 4. check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser; // to give access to pug to users

  next();
});

// only for rendered pages (not for API)
// it's not to protect routes,
// there will be no error
exports.isLoggedIn = async (req, res, next) => {
  // used for rendered pages, so the token will be in the cookies
  // the authorization header is only for the API
  // we don't use catchAsync since we don't want to handle errors with the global error middleware, in that case, we want to handle them locally. Indeed there will be an error: when we log out we send the jwt token 'loggedOut' and upon jwt verificaiton error it will throw an error, thats why we want to catch it locally and 'ignore' it...
  // main difference between isLoggedIn and protect is that isLoggedIn will return even if there is no token (we just want to kjnow if user is logged in, to display accordingly the sign in and login buttons in the header). For 'protect' we want to allow access only to logged in users, so we will answer an error if the user is not logged in
  if (req.cookies.jwt) {
    try {
      // 1. verification of the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2. check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4. check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser; // to give access to pug to users
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }
  // 2. Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  // we save the user
  // but since at 'save' it will fail becaue some required field are missing, we ask him not to check the required field - we basically just want to save the new resetToken related fields.
  await user.save({ validateBeforeSave: false });

  // 3. Send it to user's email

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendResetPassword();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // in case of error we want to both reset the token and expiration
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error while sending the email. Try again later!'
      ),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. get the user based on the token (we need to encrypt the token sent by the user and compare it to database, where we store only encrypted tokens)

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. if token has not expired, and there is a user, set the new password
  if (!user) {
    return next(
      new AppError('User does not exist or reset token has expired!', 400)
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. update changepasswordat property for the user

  // 4. log the user in, send JWT

  createSendToken(user, 200, res);
});

// only for logged-in users
// need to confirm current password before updating it
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;

  // 1. get user
  const user = await User.findById(req.user._id).select('+password'); // add a field in the selected filter, a field that was not originally filtered (select: false)

  // 2. POSTed current password is correct?
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Current password is incorrect. You cannot update the password',
        401
      )
    );
  }

  // 3. If correct, update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  // findByIdAndUpdate will NOTwork as intended. NEver use findByIdAndUpdate for passwords : update does not perform validators or middleware 'save' (this is where we check the password confirm and add the password change date)

  createSendToken(user, 200, res);
});
