const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/bookingModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // get the tour
  const tour = await Tour.findById(req.params.tourId);
  // console.log(tour);

  // create the stripe session
  // TODO: we could add an error message after cancel_url / but maybe needs some changes in front-end .js files...
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get(
    //   'host'
    // )}/createBookingCheckout?tour=${tour.id}&user=${req.user.id}&price=${
    //   tour.price
    // }`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/${tour.slug}`,
    customer_email: `${req.user.email}`,
    client_reference_id: `${req.params.tourId}`,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          'https://images.unsplash.com/photo-1468581264429-2548ef9eb732?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
        ],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // answer with the session
  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = async (session) => {
  console.log('createBookingCheckout');
  const tour = session.client_reference_id;
  const user = (await User.find({ email: session.customer_email })).id;
  const price = session.line_items[0].amount / 100;

  console.log(tour, user, price);

  const newbooking = await Booking.create({ tour, user, price });
  console.log(newbooking);

  // redirect to homepage
  // res.redirect(`${req.protocol}://${req.get('host')}/`);
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  console.log('webhookCheckout', signature);
  let event;

  try {
    // trying to build the event from the body
    // if it fails, either the signature or the payload are wrong
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET_KEY
    );
  } catch (err) {
    console.err('⚠️ Webhook signature verification failed.', err.message);
    res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('CHECKOUT SESSION COMPLETED WE DID IT');
    createBookingCheckout(event.data.object);
  }

  // res.status(200).json({ received: true });
  res.status(200).send();
};

exports.getAllBookings = factory.getAll(Booking);
exports.createBooking = factory.createOne(Booking);

exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
