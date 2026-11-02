const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stops a reservation's checkout session from being paid, so nobody is charged for
 * a slot that has been released. Stripe sessions must stay open for at least 30
 * minutes when created, which is longer than the 10-minute reservation window.
 * Returns false if the customer has already paid. Throws if Stripe refuses, which
 * includes the customer paying at this moment, so the caller must keep the reservation.
 */
const closeCheckoutSession = async (sessionId) => {
  if (!sessionId) {
    return true;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === 'complete' || session.payment_status === 'paid') {
    return false;
  }
  if (session.status === 'open') {
    await stripe.checkout.sessions.expire(sessionId);
  }
  return true;
};

module.exports = { closeCheckoutSession };
