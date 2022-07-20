const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.alerts = (req, res, next) => {
  // if there is an alert param, put the corresponding alert message in the pug template
  const alert = req.query.alert;
  if (alert === 'booking') {
    res.locals.alert = `Your booking has been completed. Please reload if it doesn't appear yet. It might take a few seconds to appear`;
  }
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using tour data from step 1
  res
    .status(200)
    .render('overview', { title: 'All Tours Updated 18 juillet', tours });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const slug = req.params.slug;
  // console.log(slug);
  const tour = await Tour.findOne({ slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  res.status(200).render('tour', { title: tour.name, tour });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', { title: 'Log into your account' });
};

exports.getAccount = (req, res) => {
  res.status(200).render('me', { title: 'Your account' });
};

exports.getMyTours = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id });
  // const tours = bookings.reduce((prev, curr) => {
  //   prev.push(curr.tour);
  //   return prev;
  // }, []);
  // console.log(tours);
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', { title: 'My Tours', tours });
});

// in req.body we find data from the form
exports.updateUserData = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email },
    {
      new: true,
      runValidators: true,
    }
  );

  // req.user = updatedUser;
  // res.locals.user = updatedUser; // to give access to pug to users
  res
    .status(200)
    .render('me', { title: 'Your UPDATED account', user: updatedUser });
});

exports.uploadProfilePic = async (req, res, next) => {
  // console.log('uploadProfilePic', req.file.path);

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { photo: req.file.filename },
    {
      new: true,
      runValidators: true,
    }
  );

  // console.log(updatedUser);

  res
    .status(200)
    .render('me', { title: 'Your UPDATED account', user: updatedUser });
};
