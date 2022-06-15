const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review can not be empty'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: 1,
      max: 5,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name', //'-startLocation -ratingsAverage -ratingsQuantity -images -startDates -secretTour -guides -maxGroupSize -summary -description -imageCover -locations -slug -durationWeeks -possibleIncome', // excluding __v, role and passwordChanged at from population
  // }).populate({ path: 'user', select: 'name photo' });
  this.populate({ path: 'user', select: 'name photo' });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // in a static method, 'this' points to the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // 'this' points to current review
  this.constructor.calcAverageRatings(this.tour); // points to the model, because if we do Review.calcAverageRatings(this.tour), Review does not exist yet.
});

// we can't use the middleware above for update and delete, since for update and delete we use findByIdAndUpdate and findByIdAndDelete, which don't have document middlewares, but only query middleware. And in the query we don¡t have access to the document, to have access to this.tour...
// findByIdAndUpdate (under the hood uses findOneAnd...)
// findByIdAndDelete (under the hood uses findOneAnd...)
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // this => access to the query so we execute the query here
  // we get the review doc before it is updated
  const review = await this.findOne();
  console.log(review);
  this.review = review; //  basically passes the review from the pre to the post middleware
  next();
  // here the query has not been executed yet - we are in 'pre' middleware
  // so there's no point in calling calcAcverageRatings since it would calculate with the old ratings
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed.
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
