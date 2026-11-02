/**
 * Rebuilds the schema once per run. Runs outside Jest's module system, so it
 * applies the safety guard itself before touching the database.
 */
module.exports = async () => {
  require('./env');

  const { sequelize } = require('../../config/database');
  require('../../models');

  try {
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS bookmygame;');
    await sequelize.sync({ force: true });
  } catch (error) {
    const { DB_HOST, DB_PORT, DB_NAME } = process.env;
    throw new Error(
      `Could not prepare the test database at ${DB_HOST}:${DB_PORT}/${DB_NAME}: ${error.message}\n` +
      'Start it with "npm run test:db:up", or see tests/README.md.'
    );
  } finally {
    await sequelize.close();
  }
};
