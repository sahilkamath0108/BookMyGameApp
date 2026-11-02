require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

module.exports = app;
