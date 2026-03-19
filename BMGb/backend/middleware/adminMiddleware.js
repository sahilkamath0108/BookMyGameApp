const { UserAdmin, TournamentTeam } = require('../models');
const { validateUUID } = require('../utils/validation');

// Middleware to check if user has admin access to the specified tournament
exports.checkTournamentAdminAccess = async (req, res, next) => {
  try {
    // Get tournamentId from params or body (depending on the request)
    let tournamentId = req.params.tournamentId || 
                       req.body.tournamentId || 
                       req.query.tournamentId;
                         
    // Get teamId for team-specific routes
    const teamId = req.params.teamId;
    
    // If no tournamentId found and we have a teamId, we need to get the tournament ID from the team
    if (!tournamentId && teamId) {
      // Validate teamId
      if (!validateUUID(teamId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid team ID format'
        });
      }

      try {
        // Find the team and get its tournament ID
        const team = await TournamentTeam.findByPk(teamId);
        if (!team) {
          return res.status(404).json({
            status: 'error',
            message: 'Team not found'
          });
        }
        
        tournamentId = team.Tournament_Id;
      } catch (error) {
        console.error('Error fetching team for admin check:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Server error while checking team information',
          error: error.message
        });
      }
    }
    
    // Now verify we have a tournamentId
    if (!tournamentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Tournament ID is required for admin operations'
      });
    }

    // Get the requesting user's ID
    const userId = req.user.user_id;

    // Check if user is an admin for this tournament
    const admin = await UserAdmin.findOne({
      where: { 
        user_id: userId,
        associated_tournament_id: tournamentId
      }
    });

    if (!admin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You are not an admin for this tournament.'
      });
    }

    // Add adminRole to the request for potential use in controllers
    req.adminRole = admin.role;
    
    // User is an admin for this tournament, proceed
    next();
  } catch (error) {
    console.error('Error checking admin access:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error while checking admin access',
      error: error.message
    });
  }
}; 