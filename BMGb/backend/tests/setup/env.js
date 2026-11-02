/**
 * Points the app at the test database before anything else loads.
 *
 * DB settings come only from TEST_DB_* variables, and are written to process.env
 * up front. dotenv never overrides a variable that is already set, so values in a
 * developer's .env cannot redirect the suite (and its TRUNCATEs) at a real database.
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

function assertSafeTestDatabase({ name, host }) {
  if (!/_test$/.test(name || '')) {
    throw new Error(`Refusing to run tests: database name "${name}" must end in "_test".`);
  }
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(`Refusing to run tests: database host "${host}" is not local.`);
  }
}

function applyTestEnv(source = process.env) {
  const db = {
    name: source.TEST_DB_NAME || 'bmg_test',
    user: source.TEST_DB_USER || 'bmg_test',
    password: source.TEST_DB_PASSWORD === undefined ? 'bmg_test' : source.TEST_DB_PASSWORD,
    host: source.TEST_DB_HOST || '127.0.0.1',
    port: source.TEST_DB_PORT || '5433'
  };

  assertSafeTestDatabase(db);

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_NAME: db.name,
    DB_USER: db.user,
    DB_PASSWORD: db.password,
    DB_HOST: db.host,
    DB_PORT: db.port,
    DB_SSL: 'false',
    JWT_SECRET: 'test-jwt-secret',
    STRIPE_SECRET_KEY: 'sk_test_not_a_real_key'
  });
}

applyTestEnv();

module.exports = { applyTestEnv, assertSafeTestDatabase };
