const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, deleteUser, forgotPassword, verifyOTP, googleAuth, googleCallback, uploadProfileImage, deleteProfileImage, refreshProfileImageUrl } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadSingle, handleMulterError } = require('../middleware/upload');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);

// Google Auth routes
router.get('/google', googleAuth);
router.post('/google/callback', googleCallback);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.patch('/gamer-tag', authenticate, updateProfile);

// Image upload routes
router.post('/profile/image', authenticate, uploadSingle('profileImage'), handleMulterError, uploadProfileImage);
router.delete('/profile/image', authenticate, deleteProfileImage);
router.get('/profile/image/refresh', authenticate, refreshProfileImageUrl);

// Delete user route
router.delete('/delete', authenticate, deleteUser);

module.exports = router; 

