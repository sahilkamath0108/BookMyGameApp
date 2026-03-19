const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const { getPresignedUrl } = require('../utils/s3Service');

const User = sequelize.define('Users', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    unique: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // GamerTags are user_ids across games -> to be stored in json
  GamerTag: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // profile_pic, cover_photo -> URLs or S3 keys
  profile_pic: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'S3 key for the profile image'
  },
  profile_pic_url: {
    type: DataTypes.TEXT,
  },
  cover_photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'S3 key for the cover photo'
  },
  cover_photo_url: {
    type: DataTypes.VIRTUAL,
    get() {
      return null; // This will be populated with presigned URL when needed
    }
  },
  // timestamp with timezone -> DataTypes.DATE
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  overall_gamer_rating: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  reset_otp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_otp_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
  if (!password) {
    return { status: 'fail', message: 'Password is required' };
  }
  
  if (!this.password) {
    console.error('User has no password set');
    return { status: 'fail', message: 'Authentication error' };
  }
  
  try {
    const isMatch = await bcrypt.compare(password, this.password);
    return isMatch 
      ? { status: 'success', message: 'Password is valid' } 
      : { status: 'fail', message: 'Invalid password' };
  } catch (error) {
    console.error('Error validating password:', error);
    return { status: 'error', message: 'Error validating password' };
  }
};

// Get user's active tournaments
User.prototype.getActiveTournaments = async function() {
  try {
    const { Tournament, TournamentParticipant, TournamentTeam } = require('./index');

    // Verify models are loaded properly
    if (!Tournament || !TournamentParticipant || !TournamentTeam) {
      console.error('Required models not found for getActiveTournaments');
      return { 
        status: 'error', 
        message: 'Tournament model dependencies not available',
        data: [] 
      };
    }

    // First, find participant records for this user
    let userParticipations = [];
    try {
      userParticipations = await TournamentParticipant.findAll({
        where: { 
          user_id: this.user_id,
          participation_status: 'confirmed' // Only include confirmed participants
        }
      });
    } catch (participantError) {
      console.error('Error fetching user participations:', participantError);
      // Continue with empty participations
    }
    
    // Extract tournament IDs from participations
    const participantTournamentIds = userParticipations.map(p => p.tournament_id);
    
    // Get the tournaments by their IDs
    let directParticipationTournaments = [];
    if (participantTournamentIds.length > 0) {
      try {
        directParticipationTournaments = await Tournament.findAll({
          where: { 
            tournament_id: participantTournamentIds,
            Status: 'In Progress'  // Match the exact status from enum
          }
        });
      } catch (tournamentError) {
        console.error('Error fetching direct participation tournaments:', tournamentError);
        // Continue with empty tournaments
      }
    }

    // Then, get tournaments where user is part of a team
    // Find team records that include this user
    let teamParticipations = [];
    try {
      teamParticipations = await TournamentTeam.findAll({
        where: sequelize.literal(`EXISTS (SELECT 1 FROM unnest("team_members") AS member WHERE member->>'id' = '${this.user_id}')`)
      });
    } catch (teamError) {
      console.error('Error fetching team participations:', teamError);
      // Continue with empty team participations
    }
    
    // Extract tournament IDs from team participations
    const teamTournamentIds = teamParticipations.map(t => t.Tournament_Id);
    
    // Get the team tournaments by their IDs
    let teamTournaments = [];
    if (teamTournamentIds.length > 0) {
      try {
        teamTournaments = await Tournament.findAll({
          where: { 
            tournament_id: teamTournamentIds,
            Status: 'In Progress',
            Team_Size_Limit: sequelize.literal('"Team_Size_Limit" > 1') // Only for team tournaments
          }
        });
      } catch (teamTournamentError) {
        console.error('Error fetching team tournaments:', teamTournamentError);
        // Continue with empty team tournaments
      }
    }

    // Combine and deduplicate tournaments
    const allTournaments = [...directParticipationTournaments, ...teamTournaments];
    const uniqueTournaments = Array.from(new Set(allTournaments.map(t => t.tournament_id)))
      .map(id => allTournaments.find(t => t.tournament_id === id))
      .filter(Boolean); // Filter out any undefined values

    if (!uniqueTournaments.length) {
      return { 
        status: 'success',
        message: 'No active tournaments found', 
        data: [] 
      };
    }

    // Enhance tournament data with additional information
    let enhancedTournaments = [];
    try {
      enhancedTournaments = await Promise.all(uniqueTournaments.map(async (tournament) => {
        if (!tournament) return null;
        
        let availableSlots = { availableSlots: 0 };
        let leaderboard = { data: [] };
        let timeline = null;
        
        try {
          availableSlots = await tournament.getAvailableSlots();
        } catch (error) {
          console.error(`Error getting available slots for tournament ${tournament.tournament_id}:`, error);
        }
        
        try {
          leaderboard = await tournament.getLeaderboard();
        } catch (error) {
          console.error(`Error getting leaderboard for tournament ${tournament.tournament_id}:`, error);
        }
        
        if (tournament.Is_Bracket_Competition) {
          try {
            timeline = await tournament.getTimeline();
          } catch (error) {
            console.error(`Error getting timeline for tournament ${tournament.tournament_id}:`, error);
          }
        }

        return {
          ...tournament.toJSON(),
          availableSlots: availableSlots.availableSlots,
          leaderboard: leaderboard.data,
          timeline: timeline?.data
        };
      }));

      // Filter out any null values from failed tournament enhancements
      enhancedTournaments = enhancedTournaments.filter(Boolean);
    } catch (enhancementError) {
      console.error('Error enhancing tournament data:', enhancementError);
      // Fall back to basic tournament data
      enhancedTournaments = uniqueTournaments.map(tournament => tournament.toJSON());
    }

    return { 
      status: 'success',
      data: enhancedTournaments 
    };

  } catch (error) {
    console.error('Error fetching active tournaments:', error);
    return { 
      status: 'error', 
      message: `Error fetching active tournaments: ${error.message}` 
    };
  }
};

// Get user's gaming statistics
User.prototype.getOverallStats = async function() {
  try {
    const { TournamentGameStat } = require('./index');
    
    // Check if the model exists
    if (!TournamentGameStat) {
      console.error('TournamentGameStat model not found');
      return { status: 'error', message: 'Statistics model not available', data: {} };
    }
    
    // Retrieve all stats for the user without aggregation
    const stats = await TournamentGameStat.findAll({
      where: { user_id: this.user_id },
      attributes: ['tournament_id', 'stats'],
      raw: true
    });

    if (!stats || !stats.length) {
      return { status: 'success', message: 'No gaming statistics found', data: {} };
    }
    
    // Manually aggregate stats by tournament_id
    const formattedStats = stats.reduce((acc, stat) => {
      if (stat && stat.tournament_id && stat.stats) {
        if (!acc[stat.tournament_id]) {
          acc[stat.tournament_id] = {};
        }
        
        // Merge the JSONB stats
        Object.entries(stat.stats).forEach(([key, value]) => {
          // If the key already exists, add the values, otherwise set it
          if (acc[stat.tournament_id][key] !== undefined) {
            acc[stat.tournament_id][key] += value;
          } else {
            acc[stat.tournament_id][key] = value;
          }
        });
      }
      return acc;
    }, {});
    
    return { 
      status: 'success', 
      message: 'Statistics retrieved successfully',
      data: formattedStats 
    };
  } catch (error) {
    console.error('Error fetching gaming statistics:', error);
    return { 
      status: 'error', 
      message: `Error fetching gaming statistics: ${error.message}`,
      data: {} 
    };
  }
};

// Check admin access
User.prototype.hasAdminAccess = async function(tournamentId) {
  try {
    if (!tournamentId) {
      return { status: 'fail', message: 'Tournament ID is required' };
    }

    const { SuperAdmin, TempAdmin, Tournament } = require('./index');
    
    // Check if required models exist
    if (!SuperAdmin || !TempAdmin || !Tournament) {
      console.error('Required models for admin check not found');
      return { status: 'error', message: 'Admin check functionality is unavailable' };
    }
    
    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return { status: 'fail', message: 'Tournament not found' };
    }

    // Check super admin status
    let isSuperAdmin = false;
    try {
      isSuperAdmin = await SuperAdmin.isSuperAdmin(this.user_id);
    } catch (superAdminError) {
      console.error('Error checking super admin status:', superAdminError);
      // Continue with temp admin check
    }
    
    if (isSuperAdmin) {
      return { 
        status: 'success',
        message: 'User has super admin access',
        isAdmin: true,
        role: 'super_admin'
      };
    }
    
    // Check temp admin status
    let isTempAdmin = false;
    try {
      isTempAdmin = await TempAdmin.isAdminForTournament(this.user_id, tournamentId);
    } catch (tempAdminError) {
      console.error('Error checking temp admin status:', tempAdminError);
      return { status: 'error', message: 'Error checking admin status' };
    }
    
    if (isTempAdmin) {
      return { 
        status: 'success',
        message: 'User has temporary admin access',
        isAdmin: true,
        role: 'temp_admin'
      };
    }
    
    // User has no admin access
    return { 
      status: 'success',
      message: 'User does not have admin access',
      isAdmin: false,
      role: null
    };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { 
      status: 'error', 
      message: `Error checking admin access: ${error.message}` 
    };
  }
};

// Method to refresh profile image URL
User.prototype.refreshProfileImage = async function() {
  try {
    if (!this.profile_pic) {
      return { 
        status: 'error', 
        message: 'User has no profile image',
        url: null
      };
    }
    
    // Get a fresh presigned URL for the profile image key
    const presignedUrlResult = await getPresignedUrl(this.profile_pic);
    
    if (presignedUrlResult.status !== 'success') {
      return { 
        status: 'error', 
        message: presignedUrlResult.message || 'Failed to generate presigned URL',
        url: null
      };
    }
    
    return {
      status: 'success',
      url: presignedUrlResult.url,
      key: this.profile_pic
    };
  } catch (error) {
    console.error('Error refreshing profile image URL:', error);
    return { 
      status: 'error', 
      message: `Error refreshing profile image URL: ${error.message}`,
      url: null
    };
  }
};

module.exports = User; 