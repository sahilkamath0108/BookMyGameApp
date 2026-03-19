const express = require('express');
const router = express.Router();
const { addTempAdmin, removeTempAdmin, getTournamentAdmins, checkUserAdminStatus, searchUsers, removeTournamentMember } = require('../controllers/superAdminController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/add', addTempAdmin);
router.delete('/remove', removeTempAdmin);

// Get all admins for a tournament
router.get('/tournament/:tournamentId/admins', getTournamentAdmins);

// Check if the current user is an admin for a tournament
router.get('/tournament/:tournamentId/check', checkUserAdminStatus);

// Search users by email or name for autocomplete
router.get('/tournament/:tournamentId/search-users/:query', searchUsers);

// Remove a member from a tournament
router.delete('/tournament/remove-member', removeTournamentMember);

module.exports = router; 