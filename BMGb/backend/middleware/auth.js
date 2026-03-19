const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'fail',
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'User no longer exists'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'fail',
                message: 'Token expired'
            });
        }
        next(error);
    }
};

/**
 * Middleware to check if user is a super admin
 * This checks if the user's role is 'superadmin'
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        // User should already be authenticated
        if (!req.user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Authentication required'
            });
        }
        
        // Check if user has superadmin role
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied. Super admin privileges required.'
            });
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    requireSuperAdmin
}; 