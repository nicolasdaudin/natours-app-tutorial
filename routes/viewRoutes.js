const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const path = require('path');

const multer = require('multer');
const upload = multer({ dest: 'public/img/users' });

const router = express.Router();

// PUG ROUTES
router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);

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
