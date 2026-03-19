const express = require('express');
const router = express.Router();
const { 
    createTournament, 
    getTournamentDetails, 
    updateTournamentStatus, 
    searchTournaments, 
    getUpcomingTournaments,
    getPastTournaments,
    deleteTournament,
    createTournamentTeam,
    joinTournamentTeam,
    joinSinglePlayerTournament,
    updateTournament,
    confirmSlotPayment,
    getUserTournaments,
    reserveSinglePlayerSlot,
    confirmSinglePlayerSlot,
    getUserHostedTournaments,
    cancelTeamReservation,
    cancelSinglePlayerReservation,
    approveTournament,
    getJoinableTeams,
    uploadTournamentBanners,
    deleteTournamentBanner,
    getPrivateTournamentByCode,
    deleteMainBanner
} = require('../controllers/tournamentController');
const { authenticate } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleMulterError } = require('../middleware/upload');

// Get all tournaments for the current user
router.get('/user/my-tournaments', authenticate, getUserTournaments);

// Get all tournaments hosted by the current user
router.get('/user/hosted-tournaments', authenticate, getUserHostedTournaments);

router.get('/search', searchTournaments);
router.get('/upcoming', getUpcomingTournaments);
router.get('/past', getPastTournaments);

// Get private tournament by code - must be defined BEFORE the :tournamentId route
router.get('/private/:code', authenticate, getPrivateTournamentByCode);

// Get tournament by ID
router.get('/:tournamentId', authenticate, getTournamentDetails);

// Tournament routes
router.post('/create', authenticate, uploadSingle('banner'), handleMulterError, createTournament);

router.patch('/:tournamentId/status', authenticate, updateTournamentStatus);
router.patch('/:tournamentId', authenticate, uploadSingle('banner'), handleMulterError, updateTournament);
router.delete('/:tournamentId', authenticate, deleteTournament);

// Team routes
router.get('/:tournamentId/teams', getJoinableTeams); // Get joinable teams for a tournament
router.post('/:tournamentId/team1', authenticate, createTournamentTeam);
router.post('/:tournamentId/team2', authenticate, confirmSlotPayment);
router.post('/:tournamentId/team/join', authenticate, joinTournamentTeam); // Requires teamPassword and teamNumber
router.delete('/:tournamentId/team/cancel', authenticate, cancelTeamReservation); // NEW: Cancel team reservation

// Single player tournament routes
router.post('/:tournamentId/player1', authenticate, reserveSinglePlayerSlot); // Step 1: Reserve slot
router.post('/:tournamentId/player2', authenticate, confirmSinglePlayerSlot); // Step 2: Confirm payment
router.delete('/:tournamentId/player/cancel', authenticate, cancelSinglePlayerReservation); // NEW: Cancel player reservation

// Tournament approval routes
router.patch('/:tournamentId/approve', authenticate, approveTournament);

// Tournament banner routes
router.post('/:tournamentId/banners', authenticate, uploadMultiple('banners', 5), handleMulterError, uploadTournamentBanners);
router.delete('/:tournamentId/banner/:bannerIndex', authenticate, deleteTournamentBanner);
router.delete('/:tournamentId/main-banner', authenticate, deleteMainBanner);

module.exports = router; 