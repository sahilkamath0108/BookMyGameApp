const express = require('express');
const router = express.Router();
const { 
  createGameStat, 
  createBulkGameStats, 
  getUserTournamentStats, 
  getMatchupStats,
  updateGameStat,
  deleteGameStat,
  deleteMatchupStats,
  getTeamTournamentStats,
  upsertBulkGameStats,
  getTournamentNonBracketStats,
  getUserComprehensiveStats
} = require('../controllers/gameStatController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create a new game stat entry
router.post('/', createGameStat);

// Create multiple game stats in bulk
router.post('/bulk', createBulkGameStats);

// Upsert (update or create) multiple game stats in bulk
router.put('/bulk', upsertBulkGameStats);

// Get comprehensive tournament statistics for a user (NEW ENDPOINT)
router.get('/user/:userId/comprehensive-stats', getUserComprehensiveStats);

// Get game stats for a user in a tournament
router.get('/tournament/:tournamentId/user/:userId', getUserTournamentStats);

// Get tournament stats for non-bracket tournaments
router.get('/tournament/:tournamentId/non-bracket', getTournamentNonBracketStats);

// Get game stats for a matchup
router.get('/matchup/:matchupId', getMatchupStats);

// Get aggregated stats for a team in a tournament
router.get('/team/:teamId/tournament/:tournamentId', getTeamTournamentStats);

// Update a game stat entry
router.patch('/:statId', updateGameStat);

// Delete a game stat entry
router.delete('/:statId', deleteGameStat);

// Delete all game stats for a matchup
router.delete('/matchup/:matchupId', deleteMatchupStats);

module.exports = router; 