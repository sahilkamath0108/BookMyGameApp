const express = require('express');
const router = express.Router();
const sponsorController = require('../controllers/sponsorController');
const auth = require('../middleware/auth');
const { uploadMultiple, handleMulterError } = require('../middleware/upload');

// Public routes (no authentication required)
// GET all sponsors for a tournament
router.get('/tournament/:tournamentId/sponsors', sponsorController.getAllSponsors);

// GET all sponsor images for a tournament
router.get('/tournament/:tournamentId/sponsor-images', sponsorController.getAllSponsorImages);

// GET all sponsor images globally (from all tournaments)
router.get('/global/sponsor-images', sponsorController.getAllSponsorImagesGlobal);

// Test route for debugging sponsor images
router.get('/tournament/:tournamentId/test-sponsor-images', sponsorController.testSponsorImages);

// GET a specific sponsor by ID
router.get('/sponsors/:sponsorId', sponsorController.getSponsorById);

// Protected routes (authentication required)
// Create a new sponsor (admin only) with image upload support
router.post('/tournament/:tournamentId/sponsors', 
  auth.authenticate, 
  uploadMultiple('sponsor_images', 10), // Allow up to 10 image uploads
  handleMulterError,
  sponsorController.createSponsor
);

// Update a sponsor (admin only) with image upload support
router.put('/tournament/:tournamentId/sponsors/:sponsorId', 
  auth.authenticate, 
  uploadMultiple('sponsor_images', 10), // Allow up to 10 image uploads
  handleMulterError,
  sponsorController.updateSponsor
);

// Delete a sponsor (admin only)
router.delete('/tournament/:tournamentId/sponsors/:sponsorId', 
  auth.authenticate, 
  sponsorController.deleteSponsor
);

module.exports = router; 