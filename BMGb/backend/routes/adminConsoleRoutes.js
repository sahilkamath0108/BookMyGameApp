const express = require('express');
const router = express.Router();
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const adminConsoleController = require('../controllers/adminConsoleController');
const { checkTournamentAdminAccess } = require('../middleware/adminMiddleware');
const { cleanupExpiredReservations } = require('../utils/cronService');

// Add checkTournamentAdminAccess middleware to ensure only admins can access these routes
// Route to get all teams for a tournament
router.get('/tournament/:tournamentId/teams', authenticate, adminConsoleController.getTournamentTeams);

// Route to get details of a specific team
router.get('/teams/:teamId', authenticate, checkTournamentAdminAccess, adminConsoleController.getTeamDetails);

// Route to get tournament statistics
router.get('/tournament/:tournamentId/stats', authenticate, adminConsoleController.getTournamentStats);

// Get participant team ID
router.get('/participant/:participantId/team', authenticate, adminConsoleController.getParticipantTeam);

// Add a new route for manually triggering the cleanup job
router.post('/cleanup-expired-reservations', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const result = await cleanupExpiredReservations();
    
    res.status(200).json({
      status: 'success',
      message: 'Cleanup job executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error running manual cleanup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute cleanup job',
      error: error.message
    });
  }
});

module.exports = router; 