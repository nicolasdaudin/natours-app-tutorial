const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res
//       .status(400)
//       .json({ status: 'fail', message: 'Missing name or price' });
//   }
//   next();
// };

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

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // image cover
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  // we force a parameter in the body, since in the next middleware we are going to use a Factory function, that will read req.body, to update the Tour. Putting it in the body will make it automatic that the imageCover and images are added.

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // images
  req.body.images = [];
  // if we use forEach, async will not stop the process. It will not stop the code when asymc is inside the callback function of forEach.
  // this way, we await all the promises at once, promises created by images.map(async ...)
  await Promise.all(
    req.files.images.map(async (image, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(image.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';

  req.query.sort = '-ratinsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.aliasShortestTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'duration';
  req.query.fields = 'name,duration';
  next();
};

exports.getAllToursPractice = catchAsync(async (req, res, next) => {
  // filter
  const { page, sort, limit, fields, ...queryObj } = req.query;

  // transform advanced filters in queryObj
  let queryString = JSON.stringify(queryObj);
  queryString = queryString.replace(
    /\b(gt|gte|lt|lte|ne)\b/g,
    (match) => `$${match}`
  );

  let query = Tour.find(JSON.parse(queryString));

  // sort
  if (sort) {
    query = query.sort(sort.split(',').join(' '));
  } else {
    query = query.sort('-createdAt _id');
  }

  // limit by fields
  if (fields) {
    query = query.select(fields.split(',').join(' '));
  } else {
    query = query.select('-__v');
  }

  // pagination
  if (page) {
    const skip = (page - 1) * limit;
    query = query.skip(+skip).limit(+limit);
  }

  const tours = await query;

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// const catchAsync = (fn) => {
//   // we use a promise that the fn method returns
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//   };
// };

// see video 115 in Node.JS bootcamp from Jonas.
// 'Catching errors in async functions'
// https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15065210#questions/9041656
// https://itnext.io/error-handling-with-async-await-in-js-26c3f20bc06a
exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

// /tours-distance/-40,45
exports.getDistances = catchAsync(async (req, res, next) => {
  const [lat, lng] = req.params.latlng.split(',');
  const unit = req.params.unit;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // conversion from radians to km or mi

  // const tours = [];
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // convert as number
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // we get in meters and we want km
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: { data: distances },
  });
});

// /tours-within/233/center/-40,45/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  // console.log(distance, lat, lng, unit);
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  }); //findToursWithin(distance, center, unit);

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { data: tours },
  });
});

exports.getAllMonthlyIncome = catchAsync(async (req, res, next) => {
  const results = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $project: {
        name: 1,
        duration: 1,
        startDate: 1,
        price: 1,
        maxGroupSize: 1,
        income: { $multiply: ['$price', '$maxGroupSize'] },
        year: { $year: '$startDates' },
        month: { $month: '$startDates' },
        yearMonth: {
          $dateToString: { date: '$startDates', format: '%Y-%m' },
        },
      },
    },
    {
      $group: {
        _id: '$yearMonth',
        totalMonthlyIncome: { $sum: '$income' },
      },
    },
    {
      $addFields: { yearAndMonth: '$_id' },
    },
    { $project: { _id: 0 } },
    {
      $sort: {
        totalMonthlyIncome: -1,
      },
    },
  ]);

  // TODO: calculer le income par an et par mois, au lieu de sélectionner le mois et l'année?
  // console.log();

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: { results },
  });
});

exports.getPossibleMonthlyIncome = catchAsync(async (req, res, next) => {
  // console.log(req);

  const results = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $project: {
        name: 1,
        duration: 1,
        startDate: 1,
        price: 1,
        maxGroupSize: 1,
        income: { $multiply: ['$price', '$maxGroupSize'] },
        year: { $year: '$startDates' },
        month: { $month: '$startDates' },
      },
    },
    { $match: { year: +req.params.year, month: +req.params.month } },
    {
      $group: {
        _id: null,
        totalMonthlyIncome: { $sum: '$income' },
      },
    },
  ]);

  // TODO: calculer le income par an et par mois, au lieu de sélectionner le mois et l'année?
  // console.log();

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: { results },
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  // // solution by Nico
  // const stats = await Tour.aggregate()
  //   .group({
  //     _id: '$difficulty',
  //     avgPrice: { $avg: '$price' },
  //   })
  //   .sort({ avgPrice: 1 });

  // console.log(stats);

  // jonas
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.5 } } },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1,
      },
    },
    // { $match: { _id: { $ne: 'EASY' } } },
  ]);

  res.status(200).json({
    status: 'success',
    // results: tours.length,
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // // solution by Nico (without 'year' param)
  // const busiest = await Tour.aggregate([
  //   { $unwind: '$startDates' },
  //   { $project: { _id: 0, name: 1, startDates: 1 } },
  //   {
  //     $group: {
  //       _id: {
  //         $dateToString: { format: '%Y-%m', date: '$startDates' },
  //       },
  //       numTours: { $sum: 1 },
  //     },
  //   },
  //   { $sort: { numTours: -1 } },
  //   // { $limit: 1 },
  // ]);

  const year = +req.params.year;
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $addFields: {
        year: { $year: '$startDates' },
      },
    },
    {
      $match: {
        year: year,
      },
    },
    // Jonas version to match by the 'year' param ....
    // {
    //   $match: {
    //     startDates: {
    //       $gte: new Date(`${year}-01-01`),
    //       $lte: new Date(`${year}-12-31`),
    //     },
    //   },
    // },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    { $project: { _id: 0 } },
    { $sort: { numTourStarts: -1 } },
    { $limit: 3 },
  ]);

  res.status(200).json({
    status: 'success',
    // results: tours.length,
    data: {
      plan,
    },
  });
});
