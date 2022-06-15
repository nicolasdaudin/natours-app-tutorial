const express = require('express');
const authController = require('../controllers/authController');

const reviewController = require('../controllers/reviewController');

// give Review Router access to params from other routers (/:tourId from tour router)
const router = express.Router({ mergeParams: true });

// POST /tour/2424242/reviews
// GET /tour/2424242/reviews
// POST /reviews

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews) // getAllReviews at the moment get all the reviews available
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

// guides and lead-guides can not update or delete reviews of tours (make sense since they give the tours)
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );
module.exports = router;
