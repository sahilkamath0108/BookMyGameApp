const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { sequelize, testConnection } = require('./config/database');
const { initCronJobs } = require('./utils/cronService');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tournaments', require('./routes/tournamentRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/tournament-posts', require('./routes/tournamentPostRoutes'));
app.use('/api/matchups', require('./routes/matchupRoutes'));
app.use('/api/participants', require('./routes/tournamentParticipantRoutes'));
app.use('/api/admin-console', require('./routes/adminConsoleRoutes'));
app.use('/api/game-stats', require('./routes/gameStatRoutes'));
app.use('/api/sponsors', require('./routes/sponsorRoutes'));
// app.use('/api/teams', require('./routes/teamRoutes'));
// app.use('/api/posts', require('./routes/postRoutes'));
// app.use('/api/payments', require('./routes/paymentRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

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