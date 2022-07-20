const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const path = require('path');

const multer = require('multer');
const upload = multer({ dest: 'public/img/users' });

const router = express.Router();

router.use(viewsController.alerts);

// PUG ROUTES
router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

// Special pug route to handle the success url from Stripe, since we are in local test environment and have no access to Stripr webhooks (will be available at a next Jonas lesson)
// router.get('/createBookingCheckout', bookingController.createBookingCheckout);

// route used if we want to update the user data using the 'action' attribute of the form in the html
// so that automatically the data from the form are posted to that route
router.post(
  '/updateUserData',
  authController.protect,
  viewsController.updateUserData
);

router.post(
  '/uploadProfilePic',
  authController.protect,
  upload.single('profilePic'),
  viewsController.uploadProfilePic
);

module.exports = router;
