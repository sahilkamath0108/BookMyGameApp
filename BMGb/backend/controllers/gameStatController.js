const { TournamentGameStat, User, Tournament, TournamentMatchUp, UserAdmin, TournamentTeam, TournamentParticipant } = require('../models');
const { Op } = require('sequelize');
const { sendStatsUpdateEmail } = require('../utils/emailService');

/**
 * Create a new game stat entry
 * @route POST /api/game-stats
 */
const createGameStat = async (req, res) => {
  try {
    const { user_id, tournament_id, stats, matchup_id } = req.body;

    // Validate required fields
    if (!user_id || !tournament_id || !stats) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields: user_id, tournament_id, stats'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournament_id);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if user is admin for this tournament
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, tournament_id);
    
    if (!isSuperAdmin && !isTempAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges'
      });
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if matchup exists if provided
    if (matchup_id) {
      const matchup = await TournamentMatchUp.findByPk(matchup_id);
      if (!matchup) {
        return res.status(404).json({
          status: 'fail',
          message: 'Matchup not found'
        });
      }
    }

    // Create game stat
    const gameStat = await TournamentGameStat.create({
      user_id,
      tournament_id,
      matchup_id,
      stats
    });

    res.status(201).json({
      status: 'success',
      data: {
        gameStat
      }
    });
  } catch (error) {
    console.error('Error creating game stat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating game stat'
    });
  }
};

/**
 * Create multiple game stat entries in bulk
 * @route POST /api/game-stats/bulk
 */
const createBulkGameStats = async (req, res) => {
  try {
    const { tournament_id, matchup_id, entries, position } = req.body;

    // Validate required fields with more detailed error messages
    if (!tournament_id) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required field: tournament_id'
      });
    }

    if (!entries) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required field: entries'
      });
    }

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Entries must be an array of player statistics'
      });
    }

    if (entries.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Entries array cannot be empty'
      });
    }

    // Validate entry format
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.user_id) {
        return res.status(400).json({
          status: 'fail',
          message: `Entry at index ${i} is missing user_id`
        });
      }
      
      // Initialize stats to empty object if missing
      if (!entry.stats) {
        entry.stats = {};
      } else if (typeof entry.stats !== 'object') {
        return res.status(400).json({
          status: 'fail',
          message: `Entry at index ${i} has invalid stats object`
        });
      }
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournament_id);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Validate position for non-bracket tournaments
    if (position !== null && position !== undefined && !matchup_id) {
      // Position validation only applies to non-bracket tournaments (where matchup_id is null)
      
      // Check if position is a valid number
      const positionNum = parseInt(position);
      if (isNaN(positionNum)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Position must be a valid number'
        });
      }

      // Check if position is positive (greater than 0)
      if (positionNum <= 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Position must be greater than 0 (1st place, 2nd place, etc.)'
        });
      }

      // Get total number of teams/participants in the tournament to validate position
      let maxValidPosition;
      
      if (tournament.Is_Team_Based) {
        // For team-based tournaments, count teams
        const totalTeams = await TournamentTeam.count({
          where: { Tournament_Id: tournament_id }
        });
        maxValidPosition = totalTeams;
      } else {
        // For solo tournaments, count participants
        const totalParticipants = await TournamentParticipant.count({
          where: { tournament_id: tournament_id }
        });
        maxValidPosition = totalParticipants;
      }

      // Check if position is within valid range
      if (positionNum > maxValidPosition) {
        return res.status(400).json({
          status: 'fail',
          message: `Position ${positionNum} is invalid. Maximum valid position is ${maxValidPosition} (total ${tournament.Is_Team_Based ? 'teams' : 'participants'} in tournament)`
        });
      }

      // Check for duplicate positions - ensure no other player/team has this position
      const userIdsToUpdate = entries.map(entry => entry.user_id);
      const existingPositionRecord = await TournamentGameStat.findOne({
        where: {
          tournament_id: tournament_id,
          matchup_id: null, // Non-bracket tournament
          position: positionNum,
          user_id: {
            [Op.notIn]: userIdsToUpdate // Exclude users we're currently updating
          }
        }
      });

      if (existingPositionRecord) {
        // Get the user details for better error message
        const existingUser = await User.findByPk(existingPositionRecord.user_id, {
          attributes: ['user_id', 'Name', 'email']
        });
        
        return res.status(400).json({
          status: 'fail',
          message: `Position ${positionNum} is already assigned to ${existingUser ? existingUser.Name : 'another player'} (${existingUser ? existingUser.email : existingPositionRecord.user_id}). Each position must be unique in the tournament.`
        });
      }
    }

    // Check if user is admin for this tournament
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, tournament_id);
    
    if (!isSuperAdmin && !isTempAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges'
      });
    }

    // Check if matchup exists if provided
    if (matchup_id) {
      const matchup = await TournamentMatchUp.findByPk(matchup_id);
      if (!matchup) {
        return res.status(404).json({
          status: 'fail',
          message: 'Matchup not found'
        });
      }
    }

    // Validate user_ids exist
    const userIds = entries.map(entry => entry.user_id);
    
    const users = await User.findAll({
      where: { user_id: userIds }
    });

    if (users.length !== userIds.length) {
      const foundUserIds = users.map(user => user.user_id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      
      return res.status(400).json({
        status: 'fail',
        message: `One or more user IDs are invalid: ${missingUserIds.join(', ')}`
      });
    }

    // Use upsert functionality instead of delete and create
    const upsertResults = await TournamentGameStat.bulkUpsert(entries, tournament_id, matchup_id, position);
    
    // Send email notifications to participants after successful update
    try {
      await sendStatsUpdateNotifications(tournament_id, entries, matchup_id);
    } catch (emailError) {
      console.error('Error sending stats update emails:', emailError);
      // Don't fail the main operation if email fails
    }

    res.status(200).json({
      status: 'success',
      data: {
        count: upsertResults.length,
        created: upsertResults.filter(r => r.created).length,
        updated: upsertResults.filter(r => !r.created).length,
        gameStats: upsertResults.map(r => r.instance)
      }
    });
  } catch (error) {
    console.error('Error creating bulk game stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating bulk game stats'
    });
  }
};

/**
 * Get game stats for a user in a tournament
 * @route GET /api/game-stats/tournament/:tournamentId/user/:userId
 */
const getUserTournamentStats = async (req, res) => {
  try {
    const { tournamentId, userId } = req.params;
    const { aggregated } = req.query;

    // Validate required fields
    if (!tournamentId || !userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required parameters: tournamentId, userId'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Get individual stats records
    const individualStats = await TournamentGameStat.findAll({
      where: {
        user_id: userId,
        tournament_id: tournamentId
      },
      order: [['created_at', 'ASC']]
    });
    
    // Get aggregated stats using the static method
    const aggregatedStats = await TournamentGameStat.getPlayerTournamentStats(userId, tournamentId);

    // Return different formats based on query parameter
    if (aggregated === 'true') {
      // Return only aggregated stats
      res.status(200).json({
        status: 'success',
        data: {
          stats: aggregatedStats
        }
      });
    } else if (aggregated === 'false') {
      // Return only individual stats
      res.status(200).json({
        status: 'success',
        data: {
          stats: individualStats
        }
      });
    } else {
      // Return both by default
      res.status(200).json({
        status: 'success',
        data: {
          individualStats,
          aggregatedStats
        }
      });
    }
  } catch (error) {
    console.error('Error fetching user tournament stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user tournament stats'
    });
  }
};

/**
 * Get game stats for a specific matchup
 * @route GET /api/game-stats/matchup/:matchupId
 */
const getMatchupStats = async (req, res) => {
  try {
    const { matchupId } = req.params;

    // Find the matchup to get its tournament_id
    const matchup = await TournamentMatchUp.findByPk(matchupId);
    if (!matchup) {
      return res.status(404).json({
        status: 'fail',
        message: 'Matchup not found'
      });
    }

    // Get all stats for this matchup
    const stats = await TournamentGameStat.findAll({
      where: { matchup_id: matchupId },
      order: [['created_at', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching matchup stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching matchup stats'
    });
  }
};

/**
 * Update a game stat entry
 * @route PATCH /api/game-stats/:statId
 */
const updateGameStat = async (req, res) => {
  try {
    const { statId } = req.params;
    const { stats } = req.body;

    // Validate required fields
    if (!stats || typeof stats !== 'object') {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing or invalid stats object'
      });
    }

    // Find the stat record
    const gameStat = await TournamentGameStat.findByPk(statId);
    if (!gameStat) {
      return res.status(404).json({
        status: 'fail',
        message: 'Game stat not found'
      });
    }

    // Check if user is admin for this tournament or the owner of the stat
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, gameStat.tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, gameStat.tournament_id);
    const isOwner = req.user.user_id === gameStat.user_id;
    
    if (!isSuperAdmin && !isTempAdmin && !isOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges or ownership'
      });
    }

    // Update the stat
    await gameStat.update({ stats });

    // Send email notification for individual stat update
    try {
      const entries = [{
        user_id: gameStat.user_id,
        stats: gameStat.stats,
        position: gameStat.position
      }];
      await sendStatsUpdateNotifications(gameStat.tournament_id, entries, gameStat.matchup_id);
    } catch (emailError) {
      console.error('Error sending stats update email:', emailError);
      // Don't fail the main operation if email fails
    }

    res.status(200).json({
      status: 'success',
      data: {
        gameStat
      }
    });
  } catch (error) {
    console.error('Error updating game stat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating game stat'
    });
  }
};

/**
 * Delete a game stat entry
 * @route DELETE /api/game-stats/:statId
 */
const deleteGameStat = async (req, res) => {
  try {
    const { statId } = req.params;

    // Find the stat record
    const gameStat = await TournamentGameStat.findByPk(statId);
    if (!gameStat) {
      return res.status(404).json({
        status: 'fail',
        message: 'Game stat not found'
      });
    }

    // Check if user is admin for this tournament
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, gameStat.tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, gameStat.tournament_id);
    
    if (!isSuperAdmin && !isTempAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges'
      });
    }

    // Delete the stat
    await gameStat.destroy();

    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting game stat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting game stat'
    });
  }
};

/**
 * Delete all game stats for a matchup
 * @route DELETE /api/game-stats/matchup/:matchupId
 */
const deleteMatchupStats = async (req, res) => {
  try {
    const { matchupId } = req.params;

    // Verify matchup exists
    const matchup = await TournamentMatchUp.findByPk(matchupId);
    if (!matchup) {
      return res.status(404).json({
        status: 'fail',
        message: 'Matchup not found'
      });
    }

    // Check if user is admin for this tournament
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, matchup.tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, matchup.tournament_id);
    
    if (!isSuperAdmin && !isTempAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges'
      });
    }

    // Delete all stats for this matchup
    const deleteCount = await TournamentGameStat.destroy({
      where: { matchup_id: matchupId }
    });

    res.status(200).json({
      status: 'success',
      data: {
        deletedRecords: deleteCount
      }
    });
  } catch (error) {
    console.error('Error deleting matchup stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting matchup stats'
    });
  }
};

/**
 * Get aggregated stats for a team in a tournament
 * @route GET /api/game-stats/team/:teamId/tournament/:tournamentId
 */
const getTeamTournamentStats = async (req, res) => {
  try {
    const { teamId, tournamentId } = req.params;
    const { includeIndividual } = req.query;

    // Validate required fields
    if (!teamId || !tournamentId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required parameters: teamId, tournamentId'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if team exists
    const team = await TournamentTeam.findByPk(teamId);
    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    // Verify team belongs to tournament
    if (team.Tournament_Id !== tournamentId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Team does not belong to the specified tournament'
      });
    }

    // Get team stats
    const teamStats = await TournamentGameStat.getTeamAggregatedStats(teamId, tournamentId);
    
    if (teamStats.error) {
      return res.status(400).json({
        status: 'fail',
        message: teamStats.message
      });
    }

    // If includeIndividual is false, remove individual stats from response to reduce payload size
    if (includeIndividual === 'false') {
      Object.values(teamStats.members).forEach(member => {
        delete member.individual_stats;
      });
    }

    // Get team member names from User model
    const userIds = Object.keys(teamStats.members);
    const users = await User.findAll({
      where: { user_id: userIds },
      attributes: ['user_id', 'Name', 'GamerTag']
    });

    // Add user names to the response
    const userMap = {};
    users.forEach(user => {
      userMap[user.user_id] = {
        Name: user.Name,
        GamerTag: user.GamerTag
      };
    });

    // Enhance the member data with user names
    Object.keys(teamStats.members).forEach(userId => {
      if (userMap[userId]) {
        teamStats.members[userId].Name = userMap[userId].Name;
        teamStats.members[userId].GamerTag = userMap[userId].GamerTag;
      }
    });

    res.status(200).json({
      status: 'success',
      data: teamStats
    });
  } catch (error) {
    console.error('Error fetching team tournament stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching team tournament stats'
    });
  }
};

/**
 * Upsert (update or create) multiple game stat entries in bulk
 * @route PUT /api/game-stats/bulk
 */
const upsertBulkGameStats = async (req, res) => {
  try {
    const { tournament_id, matchup_id, entries, position } = req.body;

    // Validate required fields with more detailed error messages
    if (!tournament_id) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required field: tournament_id'
      });
    }

    if (!entries) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required field: entries'
      });
    }

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Entries must be an array of player statistics'
      });
    }

    if (entries.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Entries array cannot be empty'
      });
    }

    // Validate entry format
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.user_id) {
        return res.status(400).json({
          status: 'fail',
          message: `Entry at index ${i} is missing user_id`
        });
      }
      
      // Initialize stats to empty object if missing
      if (!entry.stats) {
        entry.stats = {};
      } else if (typeof entry.stats !== 'object') {
        return res.status(400).json({
          status: 'fail',
          message: `Entry at index ${i} has invalid stats object`
        });
      }
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournament_id);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Validate position for non-bracket tournaments
    if (position !== null && position !== undefined && !matchup_id) {
      // Position validation only applies to non-bracket tournaments (where matchup_id is null)
      
      // Check if position is a valid number
      const positionNum = parseInt(position);
      if (isNaN(positionNum)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Position must be a valid number'
        });
      }

      // Check if position is positive (greater than 0)
      if (positionNum <= 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Position must be greater than 0 (1st place, 2nd place, etc.)'
        });
      }

      // Get total number of teams/participants in the tournament to validate position
      let maxValidPosition;
      
      if (tournament.Is_Team_Based) {
        // For team-based tournaments, count teams
        const totalTeams = await TournamentTeam.count({
          where: { Tournament_Id: tournament_id }
        });
        maxValidPosition = totalTeams;
      } else {
        // For solo tournaments, count participants
        const totalParticipants = await TournamentParticipant.count({
          where: { tournament_id: tournament_id }
        });
        maxValidPosition = totalParticipants;
      }

      // Check if position is within valid range
      if (positionNum > maxValidPosition) {
        return res.status(400).json({
          status: 'fail',
          message: `Position ${positionNum} is invalid. Maximum valid position is ${maxValidPosition} (total ${tournament.Is_Team_Based ? 'teams' : 'participants'} in tournament)`
        });
      }

      // Check for duplicate positions - ensure no other player/team has this position
      const userIdsToUpdate = entries.map(entry => entry.user_id);
      const existingPositionRecord = await TournamentGameStat.findOne({
        where: {
          tournament_id: tournament_id,
          matchup_id: null, // Non-bracket tournament
          position: positionNum,
          user_id: {
            [Op.notIn]: userIdsToUpdate // Exclude users we're currently updating
          }
        }
      });

      if (existingPositionRecord) {
        // Get the user details for better error message
        const existingUser = await User.findByPk(existingPositionRecord.user_id, {
          attributes: ['user_id', 'Name', 'email']
        });
        
        return res.status(400).json({
          status: 'fail',
          message: `Position ${positionNum} is already assigned to ${existingUser ? existingUser.Name : 'another player'} (${existingUser ? existingUser.email : existingPositionRecord.user_id}). Each position must be unique in the tournament.`
        });
      }

    }

    // Check if user is admin for this tournament
    const isSuperAdmin = await UserAdmin.isSuperAdmin(req.user.user_id, tournament_id);
    const isTempAdmin = await UserAdmin.isTempAdmin(req.user.user_id, tournament_id);
    
    if (!isSuperAdmin && !isTempAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized - requires tournament admin privileges'
      });
    }

    // Check if matchup exists if provided
    if (matchup_id) {
      const matchup = await TournamentMatchUp.findByPk(matchup_id);
      if (!matchup) {
        return res.status(404).json({
          status: 'fail',
          message: 'Matchup not found'
        });
      }
    }

    // Validate user_ids exist
    const userIds = entries.map(entry => entry.user_id);
    
    const users = await User.findAll({
      where: { user_id: userIds }
    });

    if (users.length !== userIds.length) {
      const foundUserIds = users.map(user => user.user_id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      
      return res.status(400).json({
        status: 'fail',
        message: `One or more user IDs are invalid: ${missingUserIds.join(', ')}`
      });
    }

    // Use upsert functionality
    const upsertResults = await TournamentGameStat.bulkUpsert(entries, tournament_id, matchup_id, position);
    // Send email notifications to participants after successful update
    try {
      await sendStatsUpdateNotifications(tournament_id, entries, matchup_id);
    } catch (emailError) {
      console.error('Error sending stats update emails:', emailError);
      // Don't fail the main operation if email fails
    }

    res.status(200).json({
      status: 'success',
      data: {
        count: upsertResults.length,
        created: upsertResults.filter(r => r.created).length,
        updated: upsertResults.filter(r => !r.created).length,
        gameStats: upsertResults.map(r => r.instance)
      }
    });
  } catch (error) {
    console.error('Error upserting bulk game stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error upserting bulk game stats'
    });
  }
};

/**
 * Get tournament stats for non-bracket tournaments (team/participant stats with positions)
 * @route GET /api/game-stats/tournament/:tournamentId/non-bracket
 */
const getTournamentNonBracketStats = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId, userIds } = req.query;

    // Validate required fields
    if (!tournamentId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required parameter: tournamentId'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    let whereCondition = {
      tournament_id: tournamentId,
      matchup_id: null // For non-bracket tournaments
    };

    // If specific user IDs are provided, filter by them
    if (userIds) {
      const userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',');
      whereCondition.user_id = userIdArray;
    }

    // Get all stats for this tournament (non-bracket)
    const stats = await TournamentGameStat.findAll({
      where: whereCondition,
      order: [['created_at', 'DESC']]
    });

    // Group stats by user_id to get the latest stats for each user
    const statsByUser = {};
    stats.forEach(stat => {
      if (!statsByUser[stat.user_id] || new Date(stat.updated_at) > new Date(statsByUser[stat.user_id].updated_at)) {
        statsByUser[stat.user_id] = stat;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats: Object.values(statsByUser)
      }
    });
  } catch (error) {
    console.error('Error fetching tournament non-bracket stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching tournament non-bracket stats'
    });
  }
};

/**
 * Get comprehensive tournament statistics for a user
 * This endpoint properly calculates stats based on tournament type (bracket/non-bracket, team/individual)
 * @route GET /api/game-stats/user/:userId/comprehensive-stats
 */
const getUserComprehensiveStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required parameter: userId'
      });
    }

    // Get all tournaments the user participated in
    const userParticipations = await TournamentParticipant.findAll({
      where: {
        user_id: userId,
        participation_status: 'confirmed'
      },
      include: [
        {
          model: Tournament,
          attributes: [
            'tournament_id', 'tournament_Name', 'GameName', 'Team_Size_Limit',
            'Is_Bracket_Competition', 'Event_Start_Time', 'Event_End_Time', 'Status'
          ]
        }
      ]
    });

    if (userParticipations.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          tournaments: [],
          overallStats: {
            totalTournaments: 0,
            totalMatches: 0,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            bestRank: null
          }
        }
      });
    }

    const tournamentStats = [];
    let overallTotalMatches = 0;
    let overallTotalWins = 0;
    let overallTotalLosses = 0;
    let bestOverallRank = null;

    // Process each tournament
    for (const participation of userParticipations) {
      const tournament = participation.Tournament;
      const tournamentId = tournament.tournament_id;

      let tournamentData = {
        tournament: tournament.toJSON(),
        stats: {
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          rank: null,
          position: null
        },
        gameStats: {},
        teamInfo: null
      };

      try {
        // Get user's team info for this tournament
        const userTeam = await TournamentTeam.findOne({
          where: {
            Tournament_Id: tournamentId,
            team_members: { [Op.contains]: [{ id: userId }] }
          }
        });
        
        // If direct lookup fails, try alternative approaches
        if (!userTeam) {
          
          // Get all teams for this tournament and check manually
          const allTeams = await TournamentTeam.findAll({
            where: { Tournament_Id: tournamentId }
          });
          
          
          // Check each team's members manually
          for (const team of allTeams) {
            const teamMembers = team.team_members || [];
            
            // Check if user is in this team (handle both string and number user IDs)
            const userInTeam = teamMembers.some(member => 
              member.id === userId || 
              member.id === parseInt(userId) || 
              member.id === userId.toString()
            );
            
            if (userInTeam) {
              tournamentData.teamInfo = {
                Team_id: team.Team_id,
                Team_Number: team.Team_Number,
                Team_Name: team.Team_Name,
                isLeader: teamMembers.find(m => 
                  (m.id === userId || m.id === parseInt(userId) || m.id === userId.toString()) && m.leader
                ) ? true : false
              };
              break;
            }
          }
        } else {
          tournamentData.teamInfo = {
            Team_id: userTeam.Team_id,
            Team_Number: userTeam.Team_Number,
            Team_Name: userTeam.Team_Name,
            isLeader: userTeam.team_members.find(m => m.id === userId)?.leader || false
          };
        }

        // Get all game stats for this user in this tournament
        const gameStats = await TournamentGameStat.findAll({
          where: {
            user_id: userId,
            tournament_id: tournamentId
          },
          order: [['created_at', 'ASC']]
        });

        // Calculate stats based on tournament type
        if (tournament.Is_Bracket_Competition) {
          // BRACKET TOURNAMENT: Calculate wins/losses from matchups
          
          if (tournamentData.teamInfo) {
            const { TournamentMatchUp } = require('../models');
            
            // Get all matchups where this team participated
            const teamMatchups = await TournamentMatchUp.findAll({
              where: {
                tournament_id: tournamentId,
                [Op.or]: [
                  { player1: tournamentData.teamInfo.Team_id },
                  { player2: tournamentData.teamInfo.Team_id }
                ]
              },
              order: [['created_at', 'ASC']]
            });

            // Count wins and losses from completed matchups
            let wins = 0;
            let losses = 0;
            
            teamMatchups.forEach(matchup => {
              if (matchup.winner) {
                if (matchup.winner === tournamentData.teamInfo.Team_id) {
                  wins++;
                } else {
                  losses++;
                }
              } else {
                
              }
            });

            tournamentData.stats.totalMatches = wins + losses;
            tournamentData.stats.wins = wins;
            tournamentData.stats.losses = losses;
            
            
          } else {
            
          }
          
          // If still no matches found from matchups, fall back to game stats for bracket tournaments too
          if (tournamentData.stats.totalMatches === 0 && gameStats.length > 0) {
            tournamentData.stats.totalMatches = gameStats.length;
            
            // Try to determine wins from game stats
            let wins = 0;
            gameStats.forEach((stat, index) => {
              const stats = stat.stats || {};
              
              // More flexible win detection
              const hasWin = stats.win === 1 || stats.win === true || stats.win === "1" ||
                            stats.wins > 0 || stats.victory === 1 || stats.victory === true ||
                            stats.first_place === 1 || stats.first_place === true ||
                            stats.place === 1 || stats.rank === 1 || stat.position === 1;
              
              if (hasWin) {
                wins++;
              }
            });
            
            tournamentData.stats.wins = wins;
            tournamentData.stats.losses = tournamentData.stats.totalMatches - wins;
          }
        } else {
          // NON-BRACKET TOURNAMENT: Calculate from game stats and positions
          
          // For non-bracket tournaments, each game stat entry represents a match/game
          tournamentData.stats.totalMatches = gameStats.length;
          
          // Count wins from game stats with more flexible detection
          let wins = 0;
          let losses = 0;
          
          gameStats.forEach((stat, index) => {
            const stats = stat.stats || {};
            
            // More comprehensive win indicators
            const hasWin = stats.win === 1 || stats.win === true || stats.win === "1" ||
                          stats.wins > 0 || stats.victory === 1 || stats.victory === true ||
                          stats.first_place === 1 || stats.first_place === true ||
                          stats.place === 1 || stats.rank === 1 || stat.position === 1 ||
                          stats.winner === 1 || stats.winner === true ||
                          stats.champion === 1 || stats.champion === true;
            
            // Loss indicators
            const hasLoss = stats.loss === 1 || stats.loss === true || stats.loss === "1" ||
                           stats.losses > 0 || stats.defeat === 1 || stats.defeat === true ||
                           stats.eliminated === 1 || stats.eliminated === true;
            
            if (hasWin) {
              wins++;
            } else if (hasLoss) {
              losses++;
            } else {
              // If no explicit win/loss, try to infer from position or other indicators
              if (stat.position) {
                if (stat.position === 1) {
                  wins++;
                } else if (stat.position > 1) {
                  losses++;
                }
              } else {
                // If we have game stats but no clear win/loss indicators, 
                // assume it's a completed game and try to determine outcome from performance
                const hasKills = stats.kills > 0 || stats.eliminations > 0 || stats.frags > 0;
                const hasDeaths = stats.deaths > 0 || stats.eliminated > 0;
                
                if (hasKills && !hasDeaths) {
                  // Likely a win if player has kills but no deaths
                  wins++;
                } else if (hasKills || hasDeaths) {
                  // If we have any combat stats, assume it's a completed game
                  // For now, we'll count it as a loss if we can't determine it's a win
                  losses++;
                } else {
                  // If no clear indicators at all, still count as a match played
                  losses++;
                }
              }
            }
          });
          
          tournamentData.stats.wins = wins;
          tournamentData.stats.losses = losses;
        }

        // Calculate win rate
        if (tournamentData.stats.totalMatches > 0) {
          tournamentData.stats.winRate = Math.round((tournamentData.stats.wins / tournamentData.stats.totalMatches) * 100);
        }

        // IMPORTANT: If user has team info but no matches recorded, they still participated
        if (tournamentData.stats.totalMatches === 0 && tournamentData.teamInfo) {
          tournamentData.stats.totalMatches = 1; // Count participation as 1 match
          // Don't change wins/losses as they might be 0/0 which is valid for pending matches
        }

        // Get final tournament position/rank
        if (tournament.Is_Bracket_Competition) {
          // For bracket tournaments, calculate rank based on rounds played
          
          if (tournamentData.teamInfo) {
            const { TournamentMatchUp } = require('../models');
            
            // Get all matchups for this tournament to understand the bracket structure
            const allTournamentMatchups = await TournamentMatchUp.findAll({
              where: { tournament_id: tournamentId },
              order: [['round_tag', 'ASC']]
            });
            
            // Get team's matchups to find the last round they played
            const teamMatchups = await TournamentMatchUp.findAll({
              where: {
                tournament_id: tournamentId,
                [Op.or]: [
                  { player1: tournamentData.teamInfo.Team_id },
                  { player2: tournamentData.teamInfo.Team_id }
                ]
              },
              order: [['round_tag', 'ASC']]
            });
            
            
            if (teamMatchups.length > 0) {
              // Define round order for proper ranking
              const roundOrder = [
                'RoundOf64',
                'RoundOf32', 
                'RoundOf16',
                'RoundOf8',
                'SemiFinal',
                'Final',
                'ThirdPlace'
              ];
              
              // Analyze team's performance in each round
              let wonRounds = [];
              let lostRounds = [];
              let furthestRoundIndex = -1;
              
              teamMatchups.forEach(matchup => {
                const roundIndex = roundOrder.indexOf(matchup.round_tag);
                
                if (roundIndex > furthestRoundIndex) {
                  furthestRoundIndex = roundIndex;
                }
                
                if (matchup.winner === tournamentData.teamInfo.Team_id) {
                  wonRounds.push({ round: matchup.round_tag, index: roundIndex });
                } else if (matchup.winner && matchup.winner !== tournamentData.teamInfo.Team_id) {
                  lostRounds.push({ round: matchup.round_tag, index: roundIndex });
                } else {
                  
                }
              });
              
              
              // Determine final position based on performance
              if (furthestRoundIndex >= 0) {
                const furthestRound = roundOrder[furthestRoundIndex];
                
                // Check if team won the final
                const finalMatch = teamMatchups.find(m => m.round_tag === 'Final');
                const semiFinalMatch = teamMatchups.find(m => m.round_tag === 'SemiFinal');
                const thirdPlaceMatch = teamMatchups.find(m => m.round_tag === 'ThirdPlace');
                
                if (finalMatch && finalMatch.winner === tournamentData.teamInfo.Team_id) {
                  // Won the tournament
                  tournamentData.stats.rank = 1;
                  tournamentData.stats.position = 1;
                } else if (finalMatch && finalMatch.winner && finalMatch.winner !== tournamentData.teamInfo.Team_id) {
                  // Lost the final - 2nd place
                  tournamentData.stats.rank = 2;
                  tournamentData.stats.position = 2;
                } else if (thirdPlaceMatch && thirdPlaceMatch.winner === tournamentData.teamInfo.Team_id) {
                  // Won third place match
                  tournamentData.stats.rank = 3;
                  tournamentData.stats.position = 3;
                } else if (thirdPlaceMatch && thirdPlaceMatch.winner && thirdPlaceMatch.winner !== tournamentData.teamInfo.Team_id) {
                  // Lost third place match - 4th
                  tournamentData.stats.rank = 4;
                  tournamentData.stats.position = 4;
                } else if (semiFinalMatch && semiFinalMatch.winner !== tournamentData.teamInfo.Team_id) {
                  // Lost in semifinals - could be 3rd or 4th depending on third place match
                  if (thirdPlaceMatch) {
                    // Third place match exists, so this is either 3rd or 4th
                    tournamentData.stats.rank = 4; // Assume 4th if lost semifinal and third place match exists
                    tournamentData.stats.position = 4;
                  } else {
                    // No third place match, so tied for 3rd
                    tournamentData.stats.rank = 3;
                    tournamentData.stats.position = 3;
                  }
                } else {
                  // For other rounds, calculate based on round progression
                  // The rank is determined by how far they progressed
                  
                  // If they won all their matches so far and no final exists yet
                  if (lostRounds.length === 0 && !finalMatch) {
                    // Undefeated so far - likely rank 1 or advancing
                    tournamentData.stats.rank = 1;
                    tournamentData.stats.position = 1;
                  } else {
                    // Calculate rank based on furthest round reached
                    // Higher round index = better performance = lower rank number
                    const calculatedRank = Math.max(1, roundOrder.length - furthestRoundIndex);
                    tournamentData.stats.rank = calculatedRank;
                    tournamentData.stats.position = calculatedRank;
                  }
                }
                
              } else {
                // If no valid rounds found, but team has matchups, assign a default rank
                tournamentData.stats.rank = teamMatchups.length;
                tournamentData.stats.position = teamMatchups.length;
              }
            } else {
              // If no matchups but team exists, they might be eliminated in first round
              tournamentData.stats.rank = 1;
              tournamentData.stats.position = 1;
            }
          } else {
          }
        } else {
          // For non-bracket tournaments, use position from TournamentGameStat
          
          // Look for position in game stats (latest position takes precedence)
          let finalPosition = null;
          
          // Check all game stats for position, prioritizing the latest one
          for (let i = gameStats.length - 1; i >= 0; i--) {
            const stat = gameStats[i];
            if (stat.position !== null && stat.position !== undefined) {
              finalPosition = stat.position;
              break;
            }
          }
          
          // If no position found in individual records, check if there's a team-wide position
          if (finalPosition === null && tournamentData.teamInfo) {
            
            // Get any game stat record for this tournament that might have team position
            const teamGameStats = await TournamentGameStat.findAll({
              where: {
                tournament_id: tournamentId,
                position: { [Op.not]: null }
              },
              order: [['updated_at', 'DESC']]
            });
            
            // Look for position assigned to any team member
            const { TournamentTeam } = require('../models');
            const teamMemberIds = tournamentData.teamInfo ? 
              (await TournamentTeam.findByPk(tournamentData.teamInfo.Team_id))?.team_members?.map(m => m.id) || [] : 
              [];
            
            for (const teamStat of teamGameStats) {
              if (teamMemberIds.includes(teamStat.user_id)) {
                finalPosition = teamStat.position;
                break;
              }
            }
          }
          
          if (finalPosition !== null) {
            tournamentData.stats.position = finalPosition;
            tournamentData.stats.rank = finalPosition;
          } else {
          }
        }
        
        if (tournamentData.stats.rank === null || tournamentData.stats.rank === undefined) {
          
          if (tournament.Is_Bracket_Competition) {
            // For bracket tournaments without rank, assign based on participation
            if (tournamentData.stats.totalMatches > 0) {
              // If they played matches, assign a middle rank
              tournamentData.stats.rank = Math.max(1, tournamentData.stats.totalMatches);
              tournamentData.stats.position = Math.max(1, tournamentData.stats.totalMatches);
            } else if (tournamentData.teamInfo) {
              // If team exists but no matches, they participated but maybe didn't advance
              tournamentData.stats.rank = 1; // First round participation
              tournamentData.stats.position = 1;
            }
          } else {
            // For non-bracket tournaments without rank
            if (gameStats.length > 0) {
              // Check if any game stat has position data
              const positionsFound = gameStats.filter(stat => stat.position !== null && stat.position !== undefined);
              if (positionsFound.length > 0) {
                // Use the best (lowest) position found
                const bestPosition = Math.min(...positionsFound.map(stat => stat.position));
                tournamentData.stats.rank = bestPosition;
                tournamentData.stats.position = bestPosition;
              } else {
                // No position data, but they have game stats - assign based on performance
                const totalKills = gameStats.reduce((sum, stat) => sum + (stat.stats?.kills || 0), 0);
                const totalDeaths = gameStats.reduce((sum, stat) => sum + (stat.stats?.deaths || 0), 0);
                
                if (totalKills > totalDeaths) {
                  tournamentData.stats.rank = 1; // Good performance
                  tournamentData.stats.position = 1;
                } else {
                  tournamentData.stats.rank = gameStats.length; // Average performance
                  tournamentData.stats.position = gameStats.length;
                }
              }
            } else if (tournamentData.teamInfo) {
              // No game stats but team exists - they participated
              tournamentData.stats.rank = 1;
              tournamentData.stats.position = 1;
            }
          }
        }

        // Aggregate game statistics
        const aggregatedGameStats = {};
        gameStats.forEach(stat => {
          const stats = stat.stats || {};
          Object.entries(stats).forEach(([key, value]) => {
            // Skip win/loss indicators as we've already processed them
            if (!['win', 'wins', 'loss', 'losses', 'victory', 'defeat', 'first_place', 'winner', 'champion', 'eliminated'].includes(key.toLowerCase())) {
              if (typeof value === 'number') {
                aggregatedGameStats[key] = (aggregatedGameStats[key] || 0) + value;
              }
            }
          });
        });
        
        tournamentData.gameStats = aggregatedGameStats;

        // Update overall stats
        overallTotalMatches += tournamentData.stats.totalMatches;
        overallTotalWins += tournamentData.stats.wins;
        overallTotalLosses += tournamentData.stats.losses;
        
        // Track best rank
        if (tournamentData.stats.rank) {
          if (!bestOverallRank || tournamentData.stats.rank < bestOverallRank) {
            bestOverallRank = tournamentData.stats.rank;
          }
        }
      } catch (error) {
        console.error(`Error processing tournament ${tournamentId}:`, error);
        // Continue with other tournaments even if one fails
      }

      tournamentStats.push(tournamentData);
    }

    // Calculate overall win rate
    const overallWinRate = overallTotalMatches > 0 ? 
      Math.round((overallTotalWins / overallTotalMatches) * 100) : 0;

    const overallStats = {
      totalTournaments: tournamentStats.length,
      totalMatches: overallTotalMatches,
      totalWins: overallTotalWins,
      totalLosses: overallTotalLosses,
      winRate: overallWinRate,
      bestRank: bestOverallRank
    };

    res.status(200).json({
      status: 'success',
      data: {
        tournaments: tournamentStats,
        overallStats: overallStats
      }
    });

  } catch (error) {
    console.error('Error fetching comprehensive user stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching comprehensive user statistics'
    });
  }
};

/**
 * Helper function to send email notifications when stats are updated
 * @param {string} tournament_id - Tournament ID
 * @param {Array} entries - Array of stat entries with user_id and stats
 * @param {string} matchup_id - Matchup ID (for bracket tournaments)
 */
const sendStatsUpdateNotifications = async (tournament_id, entries, matchup_id = null) => {
  try {
    
    
    // Get tournament details
    const tournament = await Tournament.findByPk(tournament_id, {
      attributes: ['tournament_id', 'tournament_Name', 'Is_Bracket_Competition']
    });
    
    if (!tournament) {
      console.error('Tournament not found for email notifications:', tournament_id);
      return;
    }
    
    const isBracketTournament = tournament.Is_Bracket_Competition;
    let matchupDetails = null;
    
    // For bracket tournaments, get matchup details
    if (isBracketTournament && matchup_id) {
      const matchup = await TournamentMatchUp.findByPk(matchup_id, {
        include: [
          {
            model: TournamentTeam,
            as: 'Team1',
            include: [{
              model: User,
              as: 'Members',
              attributes: ['user_id', 'Name', 'email'],
              through: { attributes: [] } // Exclude junction table attributes
            }]
          },
          {
            model: TournamentTeam,
            as: 'Team2',
            include: [{
              model: User,
              as: 'Members',
              attributes: ['user_id', 'Name', 'email'],
              through: { attributes: [] } // Exclude junction table attributes
            }]
          }
        ]
      });
      
      if (matchup) {
        // Get team names for display
        const getTeamName = (team) => {
          if (!team) return 'TBD';
          if (team.Team_Name) return team.Team_Name;
          if (team.Members && team.Members.length > 0) return team.Members[0].Name;
          return `Team ${team.Team_id?.slice(-4) || 'Unknown'}`;
        };
        
        matchupDetails = {
          round: matchup.round_tag || matchup.round || 1,
          team1Name: getTeamName(matchup.Team1),
          team2Name: getTeamName(matchup.Team2)
        };
      }
    }
    
    // Process each user's stats and send email
    for (const entry of entries) {
      try {
        // Get user details
        const user = await User.findByPk(entry.user_id, {
          attributes: ['user_id', 'Name', 'email']
        });
        
        if (!user || !user.email) {
          
          continue;
        }
        
        // Prepare stats data for email
        let statsData = { ...entry.stats };
        
        // For non-bracket tournaments, include position if available
        if (!isBracketTournament && entry.position) {
          statsData.position = entry.position;
        }
        
        // For bracket tournaments, add opponent information
        let emailMatchupDetails = null;
        if (isBracketTournament && matchupDetails) {
          // Determine opponent team based on user's team
          let opponentTeam = 'Unknown Opponent';
          
          // Check if user is in team1 or team2
          const isInTeam1 = matchupDetails.team1Name.includes(user.Name);
          const isInTeam2 = matchupDetails.team2Name.includes(user.Name);
          
          if (isInTeam1) {
            opponentTeam = matchupDetails.team2Name;
          } else if (isInTeam2) {
            opponentTeam = matchupDetails.team1Name;
          } else {
            // If user name is not in team names, just pick the other team
            opponentTeam = matchupDetails.team1Name !== user.Name ? matchupDetails.team1Name : matchupDetails.team2Name;
          }
          
          emailMatchupDetails = {
            round: matchupDetails.round,
            opponentTeam: opponentTeam
          };
        }
        
        // Send email notification
        await sendStatsUpdateEmail(
          user.email,
          user.Name,
          tournament.tournament_Name,
          statsData,
          isBracketTournament,
          emailMatchupDetails
        );
        
      } catch (userEmailError) {
        console.error(`Error sending email to user ${entry.user_id}:`, userEmailError);
        // Continue with other users even if one fails
      }
    }
    
    
  } catch (error) {
    console.error('Error in sendStatsUpdateNotifications:', error);
    throw error;
  }
};

module.exports = {
  createGameStat,
  createBulkGameStats,
  getUserTournamentStats,
  getMatchupStats,
  updateGameStat,
  deleteGameStat,
  deleteMatchupStats,
  getTeamTournamentStats,
  upsertBulkGameStats,
  getTournamentNonBracketStats,
  getUserComprehensiveStats
}; 