const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const validateNico = (v) => v === 'nicolas';

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minlength: [5, 'A tour name must have more than 5 characters'],
      // set: (v) => v.toUpperCase(), // all names will be upper case from now on
      // validate: [validator.isAlpha, 'Tour name must only contain charachters'],
    },
    nico: {
      type: String,
      validate: {
        validator: validateNico,
        message: (props) => `${props.value} is not the expected`,
      },
    },
    slug: {
      type: String,
      unique: true,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      enum: {
        // this is actually how it really works, the [] in the other fields is really a shorthand
        values: ['easy', 'medium', 'difficult'],
        message: '{VALUE} is not supported',
      },
      required: [true, 'A tour should have a difficulty'],
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // to round to 1 decimals 4.6666666 => 4.7
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // 'this' only points to current NEW document being created, do not work for updates
          return val < this.price;
        },
        message:
          'Discount price ({VALUE}) should be below regular price, come on fools',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
tourSchema.virtual('possibleIncome').get(function () {
  return this.price * this.maxGroupSize;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'tour',
});

// DOCUMENT MIDDLEWARE
// runs before .save() and .create() but not before (insertMany)
tourSchema.pre('save', function (next) {
  console.log('pre save this', this);
  next();
});

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.pre('save', function (next) {
  this.name = this.name.toUpperCase();
  next();
});

// in input we have the user IDs for guides, and we transform them into the user objects
// tourSchema.pre('save', async function (next) {
//   // this.guides is an array of all the user ids
//   const guidesPromises = this.guides.map(async (id) => User.findById(id));
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

tourSchema.post('save', function (doc, next) {
  console.log('post save doc', doc);
  next();
});

// // eslint-disable-next-line prefer-arrow-callback
// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// // eslint-disable-next-line prefer-arrow-callback
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// regular exp to execute this pre-hook for all command that start with find : findOneAndUpdate, find, findOne....
tourSchema.pre(/^find/, function (next) {
  // this represents the query object
  this.find({ secretTour: { $ne: true } });
  // secretTour : false would also work
  // this.find({ price: { $lte: 1000 } });

  // also a regular object so we can set any property
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v  -passwordChangedAt', // excluding __v, role and passwordChanged at from population
  });
  next();
});

// eslint-disable-next-line prefer-arrow-callback
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms`);
  // console.log(docs);

  next();
});

// AGGREGATION MIDDLEWARE
// also exclude the secret tour from the aggregation ....
tourSchema.pre('aggregate', function (next) {
  // add at the beginning of the array of stages of pipeline, before the first match in the getAllTours for example)
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
