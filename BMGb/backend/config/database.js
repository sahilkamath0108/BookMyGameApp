const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // SSL stays on unless explicitly disabled; a local test database has no SSL.
    dialectOptions: process.env.DB_SSL === 'false' ? {} : {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    define: {
      schema: 'bookmygame'
    }
  }
);

// Test the connection and create schema
async function testConnection() {
  try {
    await sequelize.authenticate();
    // Create schema if it doesn't exist
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS bookmygame;');
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = {
  sequelize,
  testConnection
}; 