const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

// // it's better to have a memory storage to perform resizing opertions
// const multerStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'public/img/users');
//   },
//   filename: function (req, file, cb) {
//     const extension = file.mimetype.split('/')[1];
//     const filename = `users-${req.user.id}-${Date.now()}.${extension}`;
//     cb(null, filename);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFileFilter = (req, file, cb) => {
  // we filter only images
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: multerStorage, filter: multerFileFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // first check if there has been an upload file
  if (!req.file) return next();

  // it was set with multer-diskstorage but now we went to multer memoery storage so filename is not defined. but we need it in the next middleware so ... let's create it
  req.file.filename = `users-${req.user.id}-${Date.now()}.jpeg`;

  // image processing itself
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// const users = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/users.json`)
// );

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

// only the admin should be able to effectively delete a user
exports.deleteUser = factory.deleteOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead',
  });
};

// Do NOT update passwords with this...
exports.updateUser = factory.updateOne(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);

  // 1. Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }
  // 2. Update user document

  // const user = await User.findById(req.user.id);
  // user.name = 'Jonas';
  // await user.save() ;
  // ==> will give an error because some required fields are not present

  // we can use findByIdAndUpdate caus we are not dealing with sensitive data
  // but we dont just "copy" the body since the user could try role:admin and sets himself as an admin for example
  // so we filter the body to have only name and emails.
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // we put the user as 'inactive'
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
