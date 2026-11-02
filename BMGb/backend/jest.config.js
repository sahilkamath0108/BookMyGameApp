module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  // Test files share one database and truncate it between tests.
  maxWorkers: 1,
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  // Runs before any app module is loaded, so config/database.js only ever sees test settings.
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  // Mapped rather than jest.mock()ed per file, so no test can reach a live service by forgetting a mock.
  moduleNameMapper: {
    '^stripe$': '<rootDir>/tests/mocks/stripe.js',
    'utils/emailService$': '<rootDir>/tests/mocks/emailService.js',
    'utils/s3Service$': '<rootDir>/tests/mocks/s3Service.js'
  },
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    '!utils/emailService.js',
    '!utils/s3Service.js'
  ]
};
