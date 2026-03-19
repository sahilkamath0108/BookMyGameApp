const express = require('express');
const router = express.Router();
const {
    generateInitialMatchups,
    generateNextRoundMatchups,
    getTournamentMatchups,
    getMatchupById,
    updateMatchupWinner,
    deleteMatchup,
    deleteAllTournamentMatchups,
    deleteLatestRoundMatchups,
    getGlobalLeaderboard,
    getTeamMatchups,
    getUserLatestMatchup,
    updateMatchupRoomDetails
} = require('../controllers/matchupController');
const { authenticate } = require('../middleware/auth');

// Route to generate initial matchups for a tournament
router.post('/tournament/:tournamentId/generate', authenticate, generateInitialMatchups);

// Route to generate next round matchups based on previous round winners
router.post('/tournament/:tournamentId/next-round', authenticate, generateNextRoundMatchups);

// Route to get all matchups for a tournament
router.get('/tournament/:tournamentId', getTournamentMatchups);

// Route to get all matchups for a specific team in a tournament
router.get('/tournament/:tournamentId/team/:teamId', getTeamMatchups);

// Route to get the latest matchup for the current user's team in a tournament
router.get('/tournament/:tournamentId/user/latest', authenticate, getUserLatestMatchup);

// Route to get a specific matchup by ID
router.get('/:matchup_id', getMatchupById);

// Route to update a matchup with a winner
router.patch('/:matchup_id/winner', authenticate, updateMatchupWinner);

// Route to update matchup room details
router.patch('/:matchup_id/room', authenticate, updateMatchupRoomDetails);

// Route to delete a matchup
router.delete('/:matchup_id', authenticate, deleteMatchup);

// Route to delete all matchups for a tournament
router.delete('/tournament/:tournamentId', authenticate, deleteAllTournamentMatchups);

// Route to delete the latest round of matchups for a tournament
router.delete('/tournament/:tournamentId/latest-round', authenticate, deleteLatestRoundMatchups);

// Route to get global leaderboard data
router.get('/leaderboard/global', getGlobalLeaderboard);

module.exports = router; 