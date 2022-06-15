const Review = require('../models/reviewModel');
// const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);

exports.setTourUserIds = (req, res, next) => {
  // if the tour is not specified in the body, we use the one in params :tourId
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // if the user is not specified in the body, we use the one from the request, passed in middleware call 'protect'. So that would be the current user
  if (!req.body.user) req.body.user = req.user.id;
  next();
};
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);

exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
