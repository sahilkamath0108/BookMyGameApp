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
 * Platform admins can perform actions a tournament's own admins must not. Access
 * comes from PLATFORM_ADMIN_USER_IDS, a comma-separated list of user ids. If it is
 * unset, nobody has access.
 */
const isPlatformAdmin = (user) => {
    const adminIds = (process.env.PLATFORM_ADMIN_USER_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    return Boolean(user) && adminIds.includes(user.user_id);
};

const requirePlatformAdmin = (req, res, next) => {
    if (!isPlatformAdmin(req.user)) {
        return res.status(403).json({
            status: 'fail',
            message: 'Access denied. Platform admin privileges required.'
        });
    }

    next();
};

module.exports = {
    authenticate,
    isPlatformAdmin,
    requirePlatformAdmin
}; 