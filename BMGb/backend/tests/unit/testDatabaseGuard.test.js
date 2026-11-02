const { assertSafeTestDatabase, applyTestEnv } = require('../setup/env');

describe('test database guard', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepts a local database whose name ends in _test', () => {
    expect(() => assertSafeTestDatabase({ name: 'bmg_test', host: '127.0.0.1' })).not.toThrow();
  });

  it('rejects a database not named *_test', () => {
    expect(() => assertSafeTestDatabase({ name: 'bookmygame', host: 'localhost' })).toThrow(/_test/);
  });

  it('rejects a remote host', () => {
    expect(() => assertSafeTestDatabase({ name: 'bmg_test', host: 'db.example.com' })).toThrow(/not local/);
  });

  it('replaces production DB settings rather than inheriting them', () => {
    process.env.DB_NAME = 'production';
    process.env.DB_HOST = 'db.example.com';

    applyTestEnv({ TEST_DB_NAME: 'other_test', TEST_DB_HOST: 'localhost' });

    expect(process.env.DB_NAME).toBe('other_test');
    expect(process.env.DB_HOST).toBe('localhost');
    expect(process.env.DB_SSL).toBe('false');
  });
});
