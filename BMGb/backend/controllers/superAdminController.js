const { User, UserAdmin, Tournament, TournamentTeam, TournamentParticipant, TournamentGameStat } = require('../models');
const { Op } = require('sequelize');

// Add a new temp admin to a tournament
const addTempAdmin = async (req, res) => {
  const { email, tournamentId } = req.body;
  const requestingUserId = req.user.user_id;

  // Validate input
  if (!email || !tournamentId) {
    return res.status(400).json({ message: 'Email and tournament ID are required' });
  }

  try {
    // Get tournament details
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if requesting user is a temp admin for this tournament
    const requestingAdmin = await UserAdmin.findOne({
      where: {
        user_id: requestingUserId,
        associated_tournament_id: tournamentId
      }
    });
    
    if (!requestingAdmin) {
      return res.status(403).json({ message: 'You do not have permission to add temp admins for this tournament' });
    }

    // Check if the requesting admin is an owner
    if (requestingAdmin.role !== 'super_admin'){
      return res.status(403).json({ message: 'Only tournament owners can add temp admins' });
    }

    // Find the user to be made temp admin by email
    const userToAdd = await User.findOne({ where: { email } });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found with the provided email' });
    }

    // Check if user is already a temp admin
    const existingTempAdmin = await UserAdmin.findOne({
      where: {
        user_id: userToAdd.user_id,
        associated_tournament_id: tournamentId
      }
    });

    if (existingTempAdmin) {
      return res.status(400).json({ message: 'User is already a temp admin for this tournament' });
    }

    // Check if user is already a participant in this tournament
    
    const existingParticipant = await TournamentParticipant.findOne({
      where: {
        user_id: userToAdd.user_id,
        tournament_id: tournamentId
      }
    });

    if (existingParticipant) {
      
      return res.status(400).json({ 
        status: 'error',
        message: 'Cannot add user as admin because they are already participating in this tournament' 
      });
    }

    // Also check if user is part of any team in this tournament
    
    const userInTeam = await TournamentTeam.findOne({
      where: {
        Tournament_Id: tournamentId,
        team_members: {
          [Op.contains]: [{ id: userToAdd.user_id }]
        }
      }
    });

    if (userInTeam) {
      
      return res.status(400).json({ 
        status: 'error',
        message: 'Cannot add user as admin because they are already part of a team in this tournament' 
      });
    }

    

    // Create new temp admin with tournament's end time
    const newTempAdmin = await UserAdmin.create({
      user_id: userToAdd.user_id,
      associated_tournament_id: tournamentId,
      start_time: new Date(),
      end_time: tournament.Event_End_Time,
      role: 'temp_admin'
    });

    return res.status(201).json({
      status: 'success',
      data: {
        tempAdmin: newTempAdmin
      }
    });

  } catch (error) {
    return res.status(500).json({ message: `Error adding temp admin: ${error.message}` });
  }
};

// Remove a temp admin from a tournament
const removeTempAdmin = async (req, res) => {
  const { email, tournamentId } = req.body;
  const requestingUserId = req.user.user_id;

  // Validate input
  if (!email || !tournamentId) {
    return res.status(400).json({ message: 'Email and tournament ID are required' });
  }

  try {
    // Check if requesting user is an admin for this tournament
    const requestingAdmin = await UserAdmin.findOne({
      where: {
        user_id: requestingUserId,
        associated_tournament_id: tournamentId
      }
    });
    
    if (!requestingAdmin) {
      return res.status(403).json({ message: 'You do not have permission to remove temp admins from this tournament' });
    }

    // Check if the requesting admin is an owner
    if (requestingAdmin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only tournament owners can remove temp admins' });
    }

    // Find the user to be removed by email
    const userToRemove = await User.findOne({ where: { email } });
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found with the provided email' });
    }

    // Check if user is a temp admin
    const tempAdminToRemove = await UserAdmin.findOne({
      where: {
        user_id: userToRemove.user_id,
        associated_tournament_id: tournamentId,
        role: 'temp_admin'
      }
    });

    if (!tempAdminToRemove) {
      return res.status(404).json({ message: 'User is not a temp admin for this tournament' });
    }
    
    // Remove temp admin
    await tempAdminToRemove.destroy();

    return res.status(200).json({
      status: 'success',
      message: 'Temp admin removed successfully'
    });

  } catch (error) {
    return res.status(500).json({ message: `Error removing temp admin: ${error.message}` });
  }
};

// Get all admins for a tournament
const getTournamentAdmins = async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    // Verify tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Get all admins for this tournament
    const admins = await UserAdmin.findAll({
      where: {
        associated_tournament_id: tournamentId
      },
      include: [{
        model: User,
        attributes: ['user_id', 'Name', 'GamerTag', 'email']
      }]
    });

    // Get current time to determine active status
    const now = new Date();
    
    // Format the admin data
    const formattedAdmins = admins.map(admin => ({
      user_id: admin.User.user_id,
      name: admin.User.Name,
      gamerTag: admin.User.GamerTag,
      email: admin.User.email,
      role: admin.role,
      isActive: admin.start_time <= now && admin.end_time > now,
      startTime: admin.start_time,
      endTime: admin.end_time
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        tournamentId,
        tournamentName: tournament.tournament_Name,
        admins: formattedAdmins
      }
    });
  } catch (error) {
    return res.status(500).json({ message: `Error fetching tournament admins: ${error.message}` });
  }
};

// Check if the user is an admin for a tournament
const checkUserAdminStatus = async (req, res) => {
  const { tournamentId } = req.params;
  const userId = req.user.user_id;
  
  try {
    // Get current time
    const now = new Date();
    
    // Find admin record
    const admin = await UserAdmin.findOne({
      where: {
        user_id: userId,
        associated_tournament_id: tournamentId,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gt]: now }
      }
    });
    
    if (!admin) {
      return res.status(200).json({
        status: 'success',
        data: {
          isAdmin: false
        }
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        isAdmin: true,
        role: admin.role,
        startTime: admin.start_time,
        endTime: admin.end_time
      }
    });
  } catch (error) {
    return res.status(500).json({ message: `Error checking admin status: ${error.message}` });
  }
};

// Search users by email or name for autocomplete suggestions
const searchUsers = async (req, res) => {
  const { query, tournamentId } = req.params;
  const requestingUserId = req.user.user_id;

  try {
    // Check if requesting user is an admin for this tournament
    const requestingAdmin = await UserAdmin.findOne({
      where: {
        user_id: requestingUserId,
        associated_tournament_id: tournamentId
      }
    });
    
    if (!requestingAdmin) {
      return res.status(403).json({ message: 'You do not have permission to view users for this tournament' });
    }

    // Search for users with email or name containing the query string
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: `%${query}%` } },
          { Name: { [Op.iLike]: `%${query}%` } }
        ]
      },
      attributes: ['user_id', 'Name', 'email'],
      limit: 10 // Limit results to prevent large responses
    });

    return res.status(200).json({
      status: 'success',
      data: users
    });
  } catch (error) {
    return res.status(500).json({ message: `Error searching users: ${error.message}` });
  }
};

// Remove a member from a tournament
const removeTournamentMember = async (req, res) => {
  const { userId, tournamentId } = req.body;
  const requestingUserId = req.user.user_id;

  // Validate input
  if (!userId || !tournamentId) {
    return res.status(400).json({ message: 'User ID and tournament ID are required' });
  }

  try {
    // Get tournament details to check if it's a team or solo tournament
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check tournament phase - only allow removal during 'Coming Soon' and 'Accepting Registrations' phases
    if (!['Coming Soon', 'Accepting Registrations'].includes(tournament.Status)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Cannot remove players after tournament registration phase has ended. Tournament is currently in "' + tournament.Status + '" phase.'
      });
    }

    // Check if requester is an admin for this tournament or a team leader
    const isAdmin = await UserAdmin.findOne({
      where: {
        user_id: requestingUserId,
        associated_tournament_id: tournamentId,
        start_time: { [Op.lte]: new Date() },
        end_time: { [Op.gt]: new Date() }
      }
    });

    // Find the team that the user to be removed belongs to
    let userTeam = null;
    const allTeams = await TournamentTeam.findAll({
      where: { Tournament_Id: tournamentId }
    });

    // Look through each team's members to find the user
    for (const team of allTeams) {
      const teamMembers = team.team_members || [];
      if (teamMembers.some(member => member.id === userId)) {
        userTeam = team;
        break;
      }
    }

    // If user is not in any team, they're not a participant
    if (!userTeam) {
      return res.status(404).json({ message: 'User is not a participant in this tournament' });
    }

    // Check if requester is the team leader of this team
    const isTeamLeader = userTeam.team_members.some(
      member => member.id === requestingUserId && member.leader === true
    );

    // Only allow admins or team leaders to remove members
    if (!isAdmin && !isTeamLeader) {
      return res.status(403).json({ 
        message: 'You do not have permission to remove members from this tournament' 
      });
    }

    // If the requester is a team leader and not an admin, they can only remove team members but not themselves
    if (isTeamLeader && !isAdmin && userId === requestingUserId) {
      return res.status(403).json({ 
        message: 'Team leaders cannot remove themselves. Contact an admin to leave the tournament.' 
      });
    }

    // Clean up tournament game stats for the user being removed
    try {
      const deletedStatsCount = await TournamentGameStat.destroy({
        where: {
          user_id: userId,
          tournament_id: tournamentId
        }
      });
      
    } catch (statsError) {
      console.error('Error deleting tournament game stats:', statsError);
      // Continue with removal even if stats cleanup fails
    }

    // Process based on tournament type
    if (tournament.Team_Size_Limit === 1) {
      // Solo tournament: Empty the team and reset team details
      await userTeam.update({ 
        team_members: [],
        Team_Name: null,
        Team_Password: null
      });
      
      // Remove from participant table
      await TournamentParticipant.destroy({
        where: {
          user_id: userId,
          tournament_id: tournamentId
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Player removed successfully from solo tournament',
        team: {
          team_id: userTeam.Team_id,
          team_number: userTeam.Team_Number,
          teamIsEmpty: true
        }
      });
    } else {
      // Team tournament: Remove the member from the team
      const updatedMembers = userTeam.team_members.filter(member => member.id !== userId);
      
      // If removing the leader, assign a new leader if there are remaining members
      if (userTeam.team_members.some(member => member.id === userId && member.leader) && updatedMembers.length > 0) {
        // Assign first remaining member as leader
        updatedMembers[0].leader = true;
      }

      // Prepare update object
      const updateData = { team_members: updatedMembers };
      
      // If team becomes empty, reset team name and password
      if (updatedMembers.length === 0) {
        updateData.Team_Name = null;
        updateData.Team_Password = null;
      }

      // Update the team with new members list and reset details if empty
      await userTeam.update(updateData);

      // Remove from participant table
      await TournamentParticipant.destroy({
        where: {
          user_id: userId,
          tournament_id: tournamentId
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Player removed successfully from tournament team',
        team: {
          team_id: userTeam.Team_id,
          team_number: userTeam.Team_Number,
          remaining_members: updatedMembers.length,
          teamIsEmpty: updatedMembers.length === 0,
          teamDetailsReset: updatedMembers.length === 0
        }
      });
    }
  } catch (error) {
    return res.status(500).json({ message: `Error removing tournament member: ${error.message}` });
  }
};

// Export the functions
module.exports = {
  addTempAdmin,
  removeTempAdmin,
  getTournamentAdmins,
  checkUserAdminStatus,
  searchUsers,
  removeTournamentMember
}; 


// need to change and update this file to match the new schema