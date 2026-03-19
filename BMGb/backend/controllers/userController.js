const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');
const { uploadToS3, deleteFromS3, getKeyFromUrl, getPresignedUrl } = require('../utils/s3Service');

// Initialize Google OAuth client with client ID and client secret
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Track used auth codes to prevent duplicate exchanges
const usedAuthCodes = new Map(); // Change to Map to store timestamp

// Register new user
const register = async (req, res) => {
    try {
        const { password, ...userData } = req.body;

        // Check if email exists
        const existingUser = await User.findOne({ 
            where: { email: userData.email }
        });
        
        if (existingUser) {
            return res.status(409).json({
                status: 'fail',
                message: 'Email already registered'
            });
        }

        // Create user without hashing the password here
        const user = await User.create({
            ...userData,
            password 
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '1y' }
        );

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.Name || 'Gamer');
            
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Continue with registration even if email fails
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user.toJSON();

        res.status(201).json({
            status: 'success',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                status: 'fail',
                message: error.errors[0].message
            });
        }

        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                status: 'fail',
                message: 'Email already registered'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error registering user'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and validate credentials
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '1y' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user.toJSON();

        res.status(200).json({
            status: 'success',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error logging in'
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user.toJSON();

        // Handle profile image URL generation
        if (userWithoutPassword.profile_pic) {
            try {
                
                
                // Check if profile_pic is a direct URL (Google profile image) or S3 key
                if (userWithoutPassword.profile_pic.startsWith('http')) {
                    // Direct URL from Google - use it directly
                    userWithoutPassword.profile_pic_url = userWithoutPassword.profile_pic;
                    
                } else {
                    // S3 key - generate pre-signed URL
                    const refreshResult = await user.refreshProfileImage();
                    
                    
                    
                    if (refreshResult.status === 'success') {
                        userWithoutPassword.profile_pic_url = refreshResult.url;
                        userWithoutPassword.profile_pic_key = refreshResult.key;
                        
                    } else {
                        console.error('Failed to refresh profile image URL:', refreshResult.message);
                        userWithoutPassword.profile_pic_url = null;
                    }
                }
            } catch (error) {
                console.error('Error processing profile image:', error);
                userWithoutPassword.profile_pic_url = null;
            }
        } else {
            
            userWithoutPassword.profile_pic_url = null;
        }

        // Get user's active tournaments and stats
        let activeTournaments = [];
        let stats = {};
        
        try {
            // Get active tournaments
            const tournamentsResult = await user.getActiveTournaments();
            if (tournamentsResult.status === 'success') {
                activeTournaments = tournamentsResult.data || [];
            } else {
                console.warn('Unable to fetch active tournaments:', tournamentsResult.message);
            }
            
            // Get stats
            const statsResult = await user.getOverallStats();
            if (statsResult.status === 'success') {
                stats = statsResult.data || {};
            } else {
                console.warn('Unable to fetch user stats:', statsResult.message);
            }
        } catch (dataError) {
            console.error('Error fetching user data:', dataError);
            // Continue with the available user data
        }

        res.status(200).json({
            status: 'success',
            data: {
                ...userWithoutPassword,
                activeTournaments,
                stats
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching profile'
        });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { email, password, profile_pic, ...updateData } = req.body;

        // Don't allow email updates
        if (email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Email cannot be updated'
            });
        }

        const user = await User.findByPk(req.user.user_id);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // If updating password, hash it
        // if (password) {
        //     const salt = await bcrypt.genSalt(10);
        //     updateData.password = await bcrypt.hash(password, salt);
        // }
        updateData.password = password

        await user.update(updateData);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user.toJSON();

        res.status(200).json({
            status: 'success',
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Profile update error:', error);

        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                status: 'fail',
                message: error.errors[0].message
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error updating profile'
        });
    }
};

// Delete a user -> resticted and won't be called 
const deleteUser = async (req, res) => {
    const userId = req.user.user_id; // Get the user ID from the authenticated user

    try {
        // Find the user by ID
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete the user
        await user.destroy();

        return res.status(200).json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({ message: `Error deleting user: ${error.message}` });
    }
};

// Endpoints for View Posts for Each tournament and subsequent responses 
// View past tournaments and their stats 
// View payments made to participate in tournaments

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forgot password - send OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'No user found with this email'
            });
        }

        // Generate OTP and set expiry (15 minutes from now)
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Update user with OTP and expiry
        await user.update({
            reset_otp: otp,
            reset_otp_expires: otpExpiry
        });

        // Send email with OTP
        try {
            await sendOTPEmail(email, otp);
            res.status(200).json({
                status: 'success',
                message: 'OTP sent to your email'
            });
        } catch (error) {
            // Revert OTP if email fails
            await user.update({
                reset_otp: null,
                reset_otp_expires: null
            });
            throw new Error('Failed to send OTP email');
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error processing forgot password request'
        });
    }
};

// Verify OTP and generate reset token
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'No user found with this email'
            });
        }

        // Check if OTP exists and is valid
        if (!user.reset_otp || !user.reset_otp_expires) {
            return res.status(400).json({
                status: 'fail',
                message: 'No OTP request found'
            });
        }

        // Check if OTP has expired
        if (new Date() > new Date(user.reset_otp_expires)) {
            // Clear expired OTP
            await user.update({
                reset_otp: null,
                reset_otp_expires: null
            });
            return res.status(400).json({
                status: 'fail',
                message: 'OTP has expired'
            });
        }

        // Verify OTP
        if (user.reset_otp !== otp) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid OTP'
            });
        }

        // Generate password reset token
        const token = jwt.sign(
            { id: user.user_id, purpose: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Clear used OTP
        await user.update({
            reset_otp: null,
            reset_otp_expires: null
        });

        res.status(200).json({
            status: 'success',
            message: 'OTP verified successfully',
            data: { token }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error verifying OTP'
        });
    }
};

// Google OAuth entry point (generates auth URL)
const googleAuth = async (req, res) => {
    try {
        // Generate the auth URL using the configured OAuth client
        const authUrl = googleClient.generateAuthUrl({
            access_type: 'offline',
            scope: ['email', 'profile'],
            prompt: 'consent'
        });
        
        // Return the URL for the frontend to redirect to
        res.status(200).json({
            status: 'success',
            data: { url: authUrl }
        });
    } catch (error) {
        console.error('Google Auth URL generation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error generating Google authentication URL'
        });
    }
};

// Google OAuth callback handler
const googleCallback = async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                status: 'fail',
                message: 'Authorization code is required'
            });
        }

        // Check if this code has already been used recently (within last 2 minutes)
        const now = Date.now();
        const codeUsedTime = usedAuthCodes.get(code);
        
        if (codeUsedTime) {
            const timeDiff = now - codeUsedTime;
            if (timeDiff < 2 * 60 * 1000) { // 2 minutes - shorter window
                
                
                // For very recent duplicates (< 10 seconds), this is likely a double request
                if (timeDiff < 10000) {
                    
                    return res.status(429).json({
                        status: 'fail',
                        message: 'Duplicate request detected. Please wait...',
                        code: 'DUPLICATE_REQUEST',
                        retryAfter: 5
                    });
                }
                
                return res.status(400).json({
                    status: 'fail',
                    message: 'Authorization code has already been used. Please try logging in again.',
                    code: 'DUPLICATE_AUTH_CODE'
                });
            } else {
                // Code is old enough, remove it and allow reuse
                usedAuthCodes.delete(code);
            }
        }
        
        // Mark this code as used with current timestamp
        usedAuthCodes.set(code, now);
        
        // Cleanup old codes (older than 10 minutes)
        const cleanupThreshold = now - (10 * 60 * 1000);
        for (const [storedCode, timestamp] of usedAuthCodes.entries()) {
            if (timestamp < cleanupThreshold) {
                usedAuthCodes.delete(storedCode);
            }
        }

        
        
        try {
            // Exchange the authorization code for tokens
            const { tokens } = await googleClient.getToken({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI
            });
            
            if (!tokens || !tokens.id_token) {
                console.error('Token exchange succeeded but no ID token was returned');
                // Remove the code from used list since it failed
                usedAuthCodes.delete(code);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to obtain ID token from Google'
                });
            }
            
            
            
            // Get ID token from the tokens
            const idToken = tokens.id_token;
            
            // Verify the ID token
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            // Get user information from the token
            const payload = ticket.getPayload();
            const { email, name, picture } = payload;
            
            

            // Look up user by email
            let user = await User.findOne({ where: { email } });
            let isNewUser = false;

            // If user doesn't exist, create a new one
            if (!user) {
                isNewUser = true;
                
                
                // Generate a random password for the user
                const password = Math.random().toString(36).slice(-8);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                // Create user
                user = await User.create({
                    email,
                    Name: name || 'Google User',
                    password: hashedPassword,
                    profile_pic: picture || null
                });
                
                // Send welcome email to new user
                try {
                    await sendWelcomeEmail(email, name || 'Google User');
                    
                } catch (emailError) {
                    console.error('Error sending welcome email:', emailError);
                    // Continue with registration even if email fails
                }
            } else {
                
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.user_id },
                process.env.JWT_SECRET,
                { expiresIn: '1y' }
            );

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user.toJSON();

            // Add Google as the auth provider
            userWithoutPassword.oauth_provider = 'Google';

            // Handle profile image URL for Google OAuth users
            if (userWithoutPassword.profile_pic) {
                try {
                    
                    
                    // Check if profile_pic is a direct URL (Google profile image) or S3 key
                    if (userWithoutPassword.profile_pic.startsWith('http')) {
                        // Direct URL from Google - use it directly
                        userWithoutPassword.profile_pic_url = userWithoutPassword.profile_pic;
                        
                    } else {
                        // S3 key - generate pre-signed URL
                        const refreshResult = await user.refreshProfileImage();
                        
                        
                        
                        if (refreshResult.status === 'success') {
                            userWithoutPassword.profile_pic_url = refreshResult.url;
                            userWithoutPassword.profile_pic_key = refreshResult.key;
                            
                        } else {
                            console.error('Failed to refresh profile image URL:', refreshResult.message);
                            userWithoutPassword.profile_pic_url = null;
                        }
                    }
                } catch (error) {
                    console.error('Error processing profile image:', error);
                    userWithoutPassword.profile_pic_url = null;
                }
            } else {
                
                userWithoutPassword.profile_pic_url = null;
            }

            res.status(200).json({
                status: 'success',
                data: {
                    user: userWithoutPassword,
                    token,
                    isNewUser
                }
            });
        } catch (tokenError) {
            console.error('Token exchange error:', tokenError);
            
            // Remove the code from used list since it failed
            usedAuthCodes.delete(code);
            
            // Check for specific error types
            if (tokenError.message && tokenError.message.includes('invalid_grant')) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'The authorization code has expired or already been used. Please try logging in again.',
                    code: 'INVALID_GRANT'
                });
            }
            throw tokenError;
        }
    } catch (error) {
        console.error('Google callback error:', error);
        
        // Remove the code from used list on any error
        if (req.body.code) {
            usedAuthCodes.delete(req.body.code);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Error processing Google authentication'
        });
    }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'No image file provided'
            });
        }

        // Get user ID from auth middleware
        const userId = req.user.user_id;

        // Find the user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Check if user already has a profile image
        if (user.profile_pic) {
            // Delete the old image from S3
            await deleteFromS3(user.profile_pic);
            
        }

        // Upload new image to S3
        const uploadResult = await uploadToS3(req.file, `users/${userId}/profile`);
        
        if (uploadResult.status !== 'success') {
            return res.status(500).json({
                status: 'fail',
                message: 'Failed to upload image'
            });
        }

        // Store only the S3 key in the database, not the full URL or pre-signed URL
        await user.update({ profile_pic: uploadResult.key });
        

        // Return the pre-signed URL for immediate use
        res.status(200).json({
            status: 'success',
            data: {
                profileImageUrl: uploadResult.url,
                profileImageKey: uploadResult.key
            }
        });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error uploading profile image'
        });
    }
};

// Delete profile image
const deleteProfileImage = async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.user_id;

        // Find the user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Check if user has a profile image
        if (!user.profile_pic) {
            return res.status(400).json({
                status: 'fail',
                message: 'No profile image to delete'
            });
        }

        // Use the stored key directly to delete from S3
        const imageKey = user.profile_pic;
        
        
        // Delete the image from S3
        const deleteResult = await deleteFromS3(imageKey);
        if (deleteResult.status !== 'success') {
            return res.status(500).json({
                status: 'fail',
                message: 'Failed to delete image from storage'
            });
        }

        // Update user profile to remove image reference
        await user.update({ profile_pic: null });

        res.status(200).json({
            status: 'success',
            message: 'Profile image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting profile image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error deleting profile image'
        });
    }
};

// Refresh profile image URL - dedicated endpoint
const refreshProfileImageUrl = async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.user_id;

        // Find the user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Check if user has a profile image
        if (!user.profile_pic) {
            return res.status(404).json({
                status: 'fail',
                message: 'No profile image found'
            });
        }

        // Use the model method to refresh the profile image URL
        const refreshResult = await user.refreshProfileImage();
        
        
        if (refreshResult.status !== 'success') {
            return res.status(500).json({
                status: 'fail',
                message: refreshResult.message || 'Failed to generate profile image URL'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                profileImageUrl: refreshResult.url,
                profileImageKey: refreshResult.key
            }
        });
    } catch (error) {
        console.error('Error refreshing profile image URL:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error refreshing profile image URL'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    deleteUser,
    forgotPassword,
    verifyOTP,
    googleAuth,
    googleCallback,
    uploadProfileImage,
    deleteProfileImage,
    refreshProfileImageUrl
}; 