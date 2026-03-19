const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentGameStat = sequelize.define('TournamentGameStat', {
  stat_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  tournament_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  game_name: {
    type : DataTypes.STRING,
  },
  stats: {
    type: DataTypes.JSONB,
    comment: "{'goals':2} || {'kills': 15} -> Stored Json will vary based on the game being played"
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Final position in tournament (1st, 2nd, 3rd, etc.)",
    validate: {
      isPositive(value) {
        if (value !== null && value !== undefined) {
          if (!Number.isInteger(value) || value <= 0) {
            throw new Error('Position must be a positive integer (1, 2, 3, etc.)');
          }
        }
      }
    }
  },
  matchup_id: {
    type: DataTypes.UUID,
    references: {
      model: 'TournamentMatchUps',
      key: 'matchup_id'
    }
    // if null, then it is a free for all game, all teams/people compete against each other
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tournament_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['tournament_id', 'user_id', 'matchup_id']
    },
    {
      // Ensure unique positions within non-bracket tournaments
      // This prevents two players from having the same rank in the same tournament
      fields: ['tournament_id', 'position'],
      unique: true,
      where: {
        matchup_id: null, // Only for non-bracket tournaments
        position: {
          [require('sequelize').Op.ne]: null // Only when position is not null
        }
      },
      name: 'unique_position_per_non_bracket_tournament'
    }
  ]
});

// Static method to get player tournament stats
TournamentGameStat.getPlayerTournamentStats = async function(userId, tournamentId) {
  const stats = await this.findAll({
    where: {
      user_id: userId,
      tournament_id: tournamentId
    },
    order: [['created_at', 'ASC']]
  });

  return stats.reduce((acc, stat) => {
    const gameStats = stat.stats;
    Object.keys(gameStats).forEach(key => {
      if (!acc[key]) acc[key] = 0;
      acc[key] += gameStats[key];
    });
    return acc;
  }, {});
};

// Static method to get team aggregated stats
TournamentGameStat.getTeamAggregatedStats = async function(teamId, tournamentId) {
  const { TournamentTeam } = require('./index');
  
  // Find the team and extract team members
  const team = await TournamentTeam.findByPk(teamId);
  if (!team || !team.team_members || team.team_members.length === 0) {
    return { error: true, message: 'Team not found or has no members' };
  }
  
  if (team.Tournament_Id !== tournamentId) {
    return { error: true, message: 'Team does not belong to the specified tournament' };
  }
  
  // Extract user IDs from team members
  const userIds = team.team_members.map(member => member.id);
  
  // Get all stats for these users in this tournament
  const allStats = await this.findAll({
    where: {
      user_id: userIds,
      tournament_id: tournamentId
    },
    order: [['created_at', 'ASC']]
  });
  
  // Group stats by user
  const statsByUser = {};
  userIds.forEach(userId => {
    statsByUser[userId] = {
      user_id: userId,
      isLeader: team.team_members.find(m => m.id === userId)?.leader || false,
      individual_stats: [],
      aggregated_stats: {}
    };
  });
  
  // Populate individual stats and calculate aggregated stats per user
  allStats.forEach(stat => {
    const userId = stat.user_id;
    
    if (statsByUser[userId]) {
      // Add individual stat record
      statsByUser[userId].individual_stats.push({
        stat_id: stat.stat_id,
        stats: stat.stats,
        created_at: stat.created_at,
        matchup_id: stat.matchup_id
      });
      
      // Aggregate stats
      const gameStats = stat.stats;
      Object.keys(gameStats).forEach(key => {
        if (!statsByUser[userId].aggregated_stats[key]) {
          statsByUser[userId].aggregated_stats[key] = 0;
        }
        statsByUser[userId].aggregated_stats[key] += gameStats[key];
      });
    }
  });
  
  // Calculate team totals
  const teamTotals = {};
  Object.values(statsByUser).forEach(userData => {
    Object.entries(userData.aggregated_stats).forEach(([key, value]) => {
      if (!teamTotals[key]) teamTotals[key] = 0;
      teamTotals[key] += value;
    });
  });
  
  return {
    team_id: teamId,
    team_name: team.Team_Name || `Team #${team.Team_Number}`,
    tournament_id: tournamentId,
    member_count: userIds.length,
    members: statsByUser,
    team_totals: teamTotals
  };
};

// Static method to check for position conflicts in non-bracket tournaments
TournamentGameStat.checkPositionConflict = async function(tournamentId, position, excludeUserIds = []) {
  if (!position || !tournamentId) {
    return null;
  }

  const positionNum = parseInt(position);
  if (isNaN(positionNum) || positionNum <= 0) {
    throw new Error('Position must be a positive integer');
  }

  const { Op } = require('sequelize');
  const whereCondition = {
    tournament_id: tournamentId,
    matchup_id: null, // Non-bracket tournament
    position: positionNum
  };

  // Exclude specific user IDs if provided (useful when updating existing records)
  if (excludeUserIds.length > 0) {
    whereCondition.user_id = {
      [Op.notIn]: excludeUserIds
    };
  }

  const existingRecord = await this.findOne({
    where: whereCondition,
    include: [{
      model: require('./index').User,
      attributes: ['user_id', 'Name', 'email']
    }]
  });

  if (existingRecord) {
    const user = existingRecord.User;
    return {
      conflict: true,
      position: positionNum,
      conflictingUser: {
        user_id: existingRecord.user_id,
        name: user ? user.Name : 'Unknown User',
        email: user ? user.email : 'Unknown Email'
      },
      message: `Position ${positionNum} is already assigned to ${user ? user.Name : 'another player'} (${user ? user.email : existingRecord.user_id}). Each position must be unique in the tournament.`
    };
  }

  return { conflict: false, position: positionNum };
};

// Static method to bulk upsert (update or create) game stats
TournamentGameStat.bulkUpsert = async function(entries, tournamentId, matchupId = null, position = null) {
  const results = [];
  
  // Validate position if provided for non-bracket tournaments
  if (position !== null && position !== undefined && !matchupId) {
    const positionNum = parseInt(position);
    
    // Basic validation - position must be a positive integer
    if (isNaN(positionNum) || positionNum <= 0) {
      throw new Error('Position must be a positive integer (1, 2, 3, etc.)');
    }
    
    // Check for duplicate positions - ensure no other player/team has this position
    const userIdsToUpdate = entries.map(entry => entry.user_id);
    const { Op } = require('sequelize');
    
    const existingPositionRecord = await this.findOne({
      where: {
        tournament_id: tournamentId,
        matchup_id: null, // Non-bracket tournament
        position: positionNum,
        user_id: {
          [Op.notIn]: userIdsToUpdate // Exclude users we're currently updating
        }
      }
    });

    if (existingPositionRecord) {
      // Get user details for better error message
      const { User } = require('./index');
      const existingUser = await User.findByPk(existingPositionRecord.user_id, {
        attributes: ['user_id', 'Name', 'email']
      });
      
      throw new Error(`Position ${positionNum} is already assigned to ${existingUser ? existingUser.Name : 'another player'} (${existingUser ? existingUser.email : existingPositionRecord.user_id}). Each position must be unique in the tournament.`);
    }
    
    
  }
  
  for (const entry of entries) {
    const { user_id, stats } = entry;
    
    // Define the where condition for finding existing record
    const whereCondition = {
      user_id: user_id,
      tournament_id: tournamentId
    };
    
    // Add matchup_id to where condition if provided
    if (matchupId) {
      whereCondition.matchup_id = matchupId;
    } else {
      // If no matchup_id provided, look for records with null matchup_id
      whereCondition.matchup_id = null;
    }
    
    try {
      // Try to find existing record
      const existingRecord = await this.findOne({
        where: whereCondition
      });
      
      if (existingRecord) {
        // Prepare update data
        const updateData = {
          stats: stats,
          updated_at: new Date()
        };
        
        // Add position if provided and validate it
        if (position !== null && position !== undefined) {
          const positionNum = parseInt(position);
          if (isNaN(positionNum) || positionNum <= 0) {
            throw new Error(`Invalid position ${position} for user ${user_id}. Position must be a positive integer.`);
          }
          updateData.position = positionNum;
        }
        
        // Update existing record
        await existingRecord.update(updateData);
        
        // Reload to get fresh data
        await existingRecord.reload();
        
        results.push({
          instance: existingRecord,
          created: false
        });
        
        
      } else {
        // Prepare create data
        const createData = {
          user_id: user_id,
          tournament_id: tournamentId,
          matchup_id: matchupId,
          stats: stats
        };
        
        // Add position if provided and validate it
        if (position !== null && position !== undefined) {
          const positionNum = parseInt(position);
          if (isNaN(positionNum) || positionNum <= 0) {
            throw new Error(`Invalid position ${position} for user ${user_id}. Position must be a positive integer.`);
          }
          createData.position = positionNum;
        }
        
        // Create new record
        const newRecord = await this.create(createData);
        
        results.push({
          instance: newRecord,
          created: true
        });
        
        
      }
    } catch (error) {
      console.error(`Error upserting stats for user ${user_id}:`, error);
      throw error;
    }
  }
  
  return results;
};

module.exports = TournamentGameStat; 