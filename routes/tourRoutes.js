const express = require('express');

const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getAllToursPractice,
  aliasShortestTours,
  getPossibleMonthlyIncome,
  getAllMonthlyIncome,
  getToursWithin,
  getDistances,
  getToursAllLocationsWithin,
} = require('../controllers/tourController');

const { protect, restrictTo } = require('../controllers/authController');

const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// router
//   .route('/:tourId/reviews')
//   .post(protect, restrictTo('user'), createReview);

// POST /tour/3232323dc/reviews
// GET /tour/3232424dc/reviews
// GET /tour/424224232/reviews/539493id
router.use('/:tourId/reviews', reviewRouter);

// Param middleware : apply middleware when a certain param is present
// router.param('id', checkID);

// The 'middlewares' are applied by order, so in that example checkBody is called before createTour (to validate that there is a name or price), or aliasTopTours before getAllTours
// router.route('/').get(getAllTours).post(checkBody, createTour);

// aliasing
router.route('/top-5-cheap').get(aliasTopTours, getAllTours);
router.route('/top-5-shortest').get(aliasShortestTours, getAllTours);
// tours?limit=5&sort=-ratingsAverage,price

// aggregate
router.route('/tour-stats').get(getTourStats);
router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

router
  .route('/possible-monthly-income/:year/:month')
  .get(getPossibleMonthlyIncome);
router.route('/all-monthly-income').get(getAllMonthlyIncome);

// /tours-within/233/center/-40,45/unit/mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);

// /distances/34.111,-118.111/unit/mi
router.route('/distances/:latlng/unit/:unit').get(getDistances);

router
  .route('/')
  .get(getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), createTour);
router.route('/practice').get(getAllToursPractice);

router
  .route('/:id')
  .get(getTour)
  .patch(protect, restrictTo('admin', 'lead-guide'), updateTour)
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour);

module.exports = router;
