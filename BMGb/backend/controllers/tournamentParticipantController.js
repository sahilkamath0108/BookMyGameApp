const { User, Tournament, TournamentParticipant, TournamentTeam, UserAdmin, TournamentGameStat } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Check if the current user is a participant in the tournament
 */
const checkParticipationStatus = async (req, res) => {
  const userId = req.user.user_id;
  const { tournamentId } = req.params;

  if (!tournamentId) {
    return res.status(400).json({ message: 'Tournament ID is required' });
  }

  try {
    // Check if user is an admin for this tournament
    const isAdmin = await UserAdmin.findOne({
      where: {
        user_id: userId,
        associated_tournament_id: tournamentId,
        start_time: { [Op.lte]: new Date() },
        end_time: { [Op.gt]: new Date() }
      }
    });
    
    const adminInfo = isAdmin ? {
      isAdmin: true,
      adminRole: isAdmin.role
    } : {
      isAdmin: false
    };

    // Check for direct participation (single player tournaments)
    const directParticipation = await TournamentParticipant.findOne({
      where: {
        user_id: userId,
        tournament_id: tournamentId,
        participation_status: 'confirmed'
      }
    });

    if (directParticipation) {
      // For single player tournaments, check if they have a team
      const soloTeam = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          team_members: {
            [Op.contains]: [{ id: userId }]
          }
        }
      });

      return res.status(200).json({
        status: 'success',
        data: {
          isParticipating: true,
          participationType: 'single',
          participantId: directParticipation.participant_id,
          teamId: soloTeam ? soloTeam.Team_id : null,
          ...adminInfo
        }
      });
    }

    // Check for team participation (team tournaments)
    // Looking for teams where the user is a member based on the team_members array
    const teams = await TournamentTeam.findAll({
      where: {
        Tournament_Id: tournamentId
      }
    });

    // Find teams where the user is a member
    const userTeam = teams.find(team => 
      team.team_members.some(member => member.id === userId)
    );

    if (userTeam) {
      
      
      // Check if user is the team leader
      const isTeamLeader = userTeam.team_members.some(
        member => member.id === userId && member.leader === true
      );

      const memberInfo = userTeam.team_members.map(member => ({
        id: member.id,
        leader: member.leader || false
      }));
      return res.status(200).json({
        status: 'success',
        data: {
          isParticipating: true,
          participationType: 'team',
          teamId: userTeam.Team_id,
          teamName: userTeam.Team_Name || `Team #${userTeam.Team_Number}`,
          Team_Name: userTeam.Team_Name,
          teamNumber: userTeam.Team_Number || null,
          teamMembers: memberInfo,
          isTeamLeader: Boolean(isTeamLeader),
          teamLeader: Boolean(isTeamLeader),
          ...adminInfo
        }
      });
    }
    
    // User is not participating
    return res.status(200).json({
      status: 'success',
      data: {
        isParticipating: false,
        ...adminInfo
      }
    });
  } catch (error) {
    console.error('Error checking participation status:', error);
    return res.status(500).json({
      message: `Error checking participation status: ${error.message}`
    });
  }
};

/**
 * Get user's team details for a specific tournament
 */
const getUserTeamByTournament = async (req, res) => {
  const userId = req.user.user_id;
  const { tournamentId } = req.params;

  if (!tournamentId) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Tournament ID is required' 
    });
  }

  try {
    // Find teams for this tournament where the user is a member
    const teams = await TournamentTeam.findAll({
      where: {
        Tournament_Id: tournamentId
      }
    });

    // Find the team where user is a member
    const userTeam = teams.find(team => 
      team.team_members && team.team_members.some(member => member.id === userId)
    );

    if (!userTeam) {
      return res.status(404).json({
        status: 'error',
        message: 'You are not a member of any team in this tournament'
      });
    }

    // Get full user details for each team member
    const memberIds = userTeam.team_members.map(member => member.id);
    const memberUsers = await User.findAll({
      where: { user_id: { [Op.in]: memberIds } },
      attributes: ['user_id', 'Name', 'GamerTag', 'email', 'profile_pic']
    });

    // Refresh profile images for all team members using the same pattern as admin console
    const refreshedMembers = await Promise.all(
      memberUsers.map(async (user) => {
        if (!user || !user.profile_pic) return user.toJSON();
        
        try {
          // Use the instance method to refresh profile image
          const refreshResult = await user.refreshProfileImage();
          
          if (refreshResult && refreshResult.status === 'success') {
            return {
              ...user.toJSON(),
              profile_pic_url: refreshResult.url,
              profile_pic_key: refreshResult.key
            };
          }
        } catch (error) {
          console.error(`Error refreshing profile image for user ${user.user_id}:`, error);
        }
        
        return user.toJSON();
      })
    );

    // Combine user info with leader info to form a complete team entry
    const memberInfo = userTeam.team_members.map(member => {
      const userDetails = refreshedMembers.find(user => user.user_id === member.id);
      const isLeader = member.leader === true;
      
      return {
        user_id: member.id,
        Name: userDetails ? userDetails.Name : 'Unknown',
        GamerTag: userDetails ? userDetails.GamerTag : '',
        email: userDetails ? userDetails.email : '',
        profile_pic_url: userDetails ? userDetails.profile_pic_url : null,
        isLeader
      };
    });

    // Prepare a plain JavaScript object without Sequelize instances
    const teamData = {
      Team_id: userTeam.Team_id || null,
      Team_Number: userTeam.Team_Number || null,
      Team_Name: userTeam.Team_Name || null,
      team_name: userTeam.Team_Name || null, // Add lowercase for backward compatibility 
      Team_Password: userTeam.Team_Password || null,
      Members: memberInfo || []
    };

    return res.status(200).json({
      status: 'success',
      data: {
        team: teamData
      }
    });
  } catch (error) {
    console.error('Error fetching user team details:', error);
    return res.status(500).json({
      status: 'error',
      message: `Error fetching user team details: ${error.message}`
    });
  }
};

/**
 * Remove a team member as a team leader
 */
const removeTeamMember = async (req, res) => {
  const leaderId = req.user.user_id; // Current user ID (team leader)
  const { memberId, tournamentId } = req.body;

  if (!memberId || !tournamentId) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Member ID and tournament ID are required' 
    });
  }

  try {
    // Start a transaction to ensure data consistency across operations
    const result = await sequelize.transaction(async (t) => {
      // First, get tournament details to check its phase/status
      const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Check tournament phase - only allow removal during 'Coming Soon' and 'Accepting Registrations' phases
      if (!['Coming Soon', 'Accepting Registrations'].includes(tournament.Status)) {
        throw new Error('Cannot remove players after tournament registration phase has ended. Tournament is currently in "' + tournament.Status + '" phase.');
      }

      // Find teams for this tournament
      const teams = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });

      // Find the team where the leader is a member
      const userTeam = teams.find(team => 
        team.team_members && team.team_members.some(member => 
          member.id === leaderId && member.leader === true
        )
      );

      if (!userTeam) {
        throw new Error('You are not a team leader for any team in this tournament');
      }

      // Check if member is in the team
      const isMemberInTeam = userTeam.team_members.some(member => member.id === memberId);
      
      if (!isMemberInTeam) {
        throw new Error('Member not found in your team');
      }

      // Check if trying to remove self
      if (memberId === leaderId) {
        throw new Error('You cannot remove yourself from the team');
      }

      // Check if trying to remove another leader
      const isRemovingLeader = userTeam.team_members.some(member => 
        member.id === memberId && member.leader === true
      );

      if (isRemovingLeader) {
        throw new Error('You cannot remove another team leader');
      }

      // Clean up tournament game stats for the member being removed
      const deletedStatsCount = await TournamentGameStat.destroy({
        where: {
          user_id: memberId,
          tournament_id: tournamentId
        },
        transaction: t
      });
      

      // Filter out the member to be removed
      const updatedMembers = userTeam.team_members.filter(member => member.id !== memberId);

      // Check if team will be empty after removing the member
      const teamWillBeEmpty = updatedMembers.length === 0;
      
      // Prepare update data
      const updateData = { team_members: updatedMembers };
      
      // If team will be empty, reset team name and password
      if (teamWillBeEmpty) {
        updateData.Team_Name = null;
        updateData.Team_Password = null;
      }

      // Update the team
      await TournamentTeam.update(
        updateData,
        { 
          where: { Team_id: userTeam.Team_id },
          transaction: t
        }
      );

      // Also remove the participant record
      const deletedParticipant = await TournamentParticipant.destroy({
        where: { 
          user_id: memberId,
          tournament_id: tournamentId
        },
        transaction: t
      });

      
      
      return {
        success: true,
        message: 'Team member removed successfully',
        updatedTeam: {
          Team_id: userTeam.Team_id,
          updatedMembers,
          teamIsEmpty: teamWillBeEmpty
        }
      };
    });

    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        updatedTeam: result.updatedTeam
      }
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return res.status(error.message.includes('You are not') ? 403 : 500).json({
      status: 'error',
      message: error.message || 'Error removing team member'
    });
  }
};

/**
 * Allow a user to leave their team
 */
const leaveTeam = async (req, res) => {
  const userId = req.user.user_id; // Current user ID
  const { tournamentId } = req.params;

  if (!tournamentId) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Tournament ID is required' 
    });
  }

  try {
    // Start a transaction to ensure data consistency across operations
    const result = await sequelize.transaction(async (t) => {
      // First, get tournament details to check its phase/status
      const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Check tournament phase - only allow leaving during 'Coming Soon' and 'Accepting Registrations' phases
      if (!['Coming Soon', 'Accepting Registrations'].includes(tournament.Status)) {
        throw new Error('Cannot quit tournament after registration phase has ended. Tournament is currently in "' + tournament.Status + '" phase.');
      }

      // Find teams for this tournament
      const teams = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });

      // Find the team where user is a member
      const userTeam = teams.find(team => 
        team.team_members && team.team_members.some(member => member.id === userId)
      );

      if (!userTeam) {
        throw new Error('You are not a member of any team in this tournament');
      }

      // Check if user is the team leader
      const isTeamLeader = userTeam.team_members.some(member => 
        member.id === userId && member.leader === true
      );

      // Clean up tournament game stats for the user leaving
      const deletedStatsCount = await TournamentGameStat.destroy({
        where: {
          user_id: userId,
          tournament_id: tournamentId
        },
        transaction: t
      });
      

      // Get current team members and remove the user
      const updatedMembers = userTeam.team_members.filter(member => member.id !== userId);
      
      // If user is the leader and there are other members, assign leadership to another member
      if (isTeamLeader && updatedMembers.length > 0) {
        // Assign first remaining member as leader
        updatedMembers[0].leader = true;
      }

      // Check if team will be empty
      const teamIsEmpty = updatedMembers.length === 0;
      
      // Prepare update data
      const updateData = { team_members: updatedMembers };
      
      // If team becomes empty, reset team name and password
      if (teamIsEmpty) {
        updateData.Team_Name = null;
        updateData.Team_Password = null;
      }

      // Update the team with new members list, even if it becomes empty
      // We keep the team in the database to preserve team slots
      await userTeam.update(updateData, { transaction: t });
      

      // Remove the participant record
      const deletedParticipant = await TournamentParticipant.destroy({
        where: { 
          user_id: userId,
          tournament_id: tournamentId
        },
        transaction: t
      });

      
      
      return {
        success: true,
        message: 'Successfully left the team',
        wasTeamLeader: isTeamLeader,
        teamIsEmpty: teamIsEmpty
      };
    });

    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        wasTeamLeader: result.wasTeamLeader,
        teamIsEmpty: result.teamIsEmpty
      }
    });
  } catch (error) {
    console.error('Error leaving team:', error);
    return res.status(error.message.includes('You are not') ? 404 : 500).json({
      status: 'error',
      message: error.message || 'Error leaving team'
    });
  }
};

module.exports = {
  checkParticipationStatus,
  getUserTeamByTournament,
  removeTeamMember,
  leaveTeam
}; 