const express = require('express');
const router = express.Router();
const { checkParticipationStatus, getUserTeamByTournament, removeTeamMember, leaveTeam } = require('../controllers/tournamentParticipantController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Check if a user is a participant in a tournament
router.get('/tournament/:tournamentId/check', checkParticipationStatus);

// Get user's team details for a specific tournament
router.get('/tournament/:tournamentId/team', getUserTeamByTournament);

// Remove a team member (team leader only)
router.delete('/tournament/:tournamentId/member', removeTeamMember);

// Leave a team (for any team member including self)
router.delete('/tournament/:tournamentId/leave', leaveTeam);

module.exports = router; 