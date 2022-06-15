const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
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
  console.log(req.query);

  // filter
  const { page, sort, limit, fields, ...queryObj } = req.query;
  console.log('queryObj', queryObj);

  // transform advanced filters in queryObj
  let queryString = JSON.stringify(queryObj);
  queryString = queryString.replace(
    /\b(gt|gte|lt|lte|ne)\b/g,
    (match) => `$${match}`
  );
  // console.log(JSON.parse(queryString));

  let query = Tour.find(JSON.parse(queryString));

  // sort
  console.log('sort', sort);
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
  console.log();

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: { results },
  });
});

exports.getPossibleMonthlyIncome = catchAsync(async (req, res, next) => {
  console.log(req);

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
  console.log();

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
