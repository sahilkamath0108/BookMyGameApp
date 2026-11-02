/**
 * In-memory stand-in for the Stripe SDK. Sessions start unpaid, as in real Stripe;
 * tests call markSessionPaid to simulate the customer completing checkout.
 */
const sessions = new Map();
let nextId = 1;

const client = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn()
    }
  }
};

function reset() {
  sessions.clear();
  client.checkout.sessions.create.mockReset();
  client.checkout.sessions.retrieve.mockReset();

  client.checkout.sessions.create.mockImplementation(async (params) => {
    const id = `cs_test_${nextId++}`;
    const session = {
      id,
      url: `https://checkout.stripe.test/${id}`,
      payment_intent: null,
      payment_status: 'unpaid',
      metadata: params.metadata
    };
    sessions.set(id, session);
    return session;
  });

  client.checkout.sessions.retrieve.mockImplementation(async (id) => {
    const session = sessions.get(id);
    if (!session) {
      throw new Error(`No such checkout.session: ${id}`);
    }
    return session;
  });
}

function markSessionPaid(id) {
  const session = sessions.get(id);
  if (!session) {
    throw new Error(`Unknown session in test: ${id}`);
  }
  session.payment_status = 'paid';
  session.payment_intent = `pi_${id}`;
}

reset();

module.exports = () => client;
module.exports.client = client;
module.exports.reset = reset;
module.exports.markSessionPaid = markSessionPaid;
