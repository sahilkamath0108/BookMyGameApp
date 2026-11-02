const app = require('./app');
const { sequelize, testConnection } = require('./config/database');
const { initCronJobs } = require('./utils/cronService');

// Test database connection and sync models
const initializeDatabase = async () => {
  try {
    // First test connection and create schema
    await testConnection();

    // Then sync all models with force:true for development only
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
    process.exit(1);
  }
};

// Initialize database before starting the server
initializeDatabase();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/docs`);

  initCronJobs();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});
