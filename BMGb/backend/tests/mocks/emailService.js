// Every send function resolves without sending, whatever the controller asks for.
const senders = {};

module.exports = new Proxy(senders, {
  get(target, name) {
    if (typeof name === 'string' && !(name in target)) {
      target[name] = jest.fn().mockResolvedValue({ status: 'success' });
    }
    return target[name];
  }
});
