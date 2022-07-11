import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51LIrmwIuA4xCEmt7GgH8dHNVnhaflmtDrEzHhaB5SBRCxRmcYnmwn3ZFznruNNlW7MBX1FRFRj9XPu6su35e2mmR00V25u0j7t'
);

export const bookTour = async (tourId) => {
  try {
    const session = await axios.get(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });

    console.log(session);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
