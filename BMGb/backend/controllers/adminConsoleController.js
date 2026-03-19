const { Tournament, TournamentTeam, TournamentParticipant, User, sequelize } = require('../models');
const { validateUUID } = require('../utils/validation');
const { Op } = require('sequelize');

// Helper function to refresh profile images for users
const refreshUserProfileImages = async (users) => {
  if (!Array.isArray(users)) return users;
  
  const refreshedUsers = await Promise.all(
    users.map(async (user) => {
      if (!user || !user.profile_pic) return user;
      
      try {
        // Find the user instance to use the model method
        const userInstance = await User.findByPk(user.user_id);
        if (!userInstance) return user;
        
        // Use the model method to refresh the profile image URL
        const refreshResult = await userInstance.refreshProfileImage();
        
        if (refreshResult.status === 'success') {
          return {
            ...user,
            profile_pic_url: refreshResult.url,
            profile_pic_key: refreshResult.key
          };
        }
      } catch (error) {
        console.error(`Error refreshing profile image for user ${user.user_id}:`, error);
      }
      
      return user;
    })
  );
  
  return refreshedUsers;
};

// Get all teams for a tournament
exports.getTournamentTeams = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    // Validate UUID
    if (!validateUUID(tournamentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'error',
        message: 'Tournament not found'
      });
    }

    // Check if tournament is team-based or individual
    const isTeamBased = tournament.Team_Size_Limit > 1;
    let teams = [];
    let participants = [];

    if (isTeamBased) {
      // For team-based tournaments, get all teams that have members
      teams = await TournamentTeam.findAll({
        where: { Tournament_Id: tournamentId }
      });

      // Filter out teams with no members and fetch member details
      const teamsWithMembers = [];
      for (const team of teams) {
        if (!team.team_members || team.team_members.length === 0) {
          continue;
        }

        // Extract user IDs from team_members array
        const userIds = team.team_members.map(member => member.id);
        
        // Fetch full user details for each team member
        const teamMembers = await User.findAll({
          where: { user_id: userIds },
          attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
        });

        // Refresh profile images for team members
        const refreshedMembers = await refreshUserProfileImages(teamMembers.map(user => user.toJSON()));

        // Add team to the list with members properly formatted
        const teamWithMembers = team.toJSON();
        teamWithMembers.Members = refreshedMembers;
        teamsWithMembers.push(teamWithMembers);
      }

      // Replace teams array with the filtered and detailed teams
      teams = teamsWithMembers;

      // Also get all participants for team tournaments
      participants = await TournamentParticipant.findAll({
        where: { 
          tournament_id: tournamentId,
          user_id: { [Op.ne]: null } // Only include participants with a user_id (actual players)
        },
        include: [
          {
            model: User,
            attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
          }
        ],
        order: [['last_update_at', 'ASC']]
      });

      // Refresh profile images for participants
      for (let i = 0; i < participants.length; i++) {
        if (participants[i].User) {
          const refreshedUser = await refreshUserProfileImages([participants[i].User.toJSON()]);
          participants[i] = {
            ...participants[i].toJSON(),
            User: refreshedUser[0]
          };
        }
      }

      // Add participant info to teams
      teams = teams.map(team => {
        // Make sure Members exists and has items
        if (team.Members && team.Members.length > 0) {
          // Add any additional participant data that might be useful
          team.Members = team.Members.map(member => {
            const participantData = participants.find(p => 
              p.user_id === member.user_id
            );
            
            if (participantData) {
              member.participantId = participantData.participant_id;
              member.joinDate = participantData.last_update_at; // Using last_update_at for join date
              // Add other fields as needed
            }
            
            return member;
          });
        }
        
        return team;
      });

      return res.status(200).json({
        status: 'success',
        data: {
          isTeamBased: true,
          teams: teams,
          participants: participants
        }
      });
    } else {
      // For individual tournaments, get all participants as "single-person teams"
      participants = await TournamentParticipant.findAll({
        where: { 
          tournament_id: tournamentId,
          user_id: { [Op.ne]: null } // Only include participants with a user_id (actual players)
        },
        include: [
          {
            model: User,
            attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
          }
        ],
        order: [['last_update_at', 'ASC']]
      });

      // Refresh profile images for participants
      for (let i = 0; i < participants.length; i++) {
        if (participants[i].User) {
          const refreshedUser = await refreshUserProfileImages([participants[i].User.toJSON()]);
          participants[i] = {
            ...participants[i].toJSON(),
            User: refreshedUser[0]
          };
        }
      }

      // Format participants as "teams" with one member each for consistent frontend handling
      const singlePlayerTeams = participants.map((participant, index) => {
        const participantJson = participant;
        
        // For solo tournaments, we create virtual team representations
        // This avoids complex database queries and potential JSON parsing issues
        const soloTeamId = `solo-${participantJson.user_id}-${participantJson.participant_id}-${index}`;
        
        return {
          Team_id: soloTeamId,
          Team_Number: participantJson.participant_id,
          Tournament_Id: participantJson.tournament_id,
          Team_Password: null,
          created_at: participantJson.last_update_at,
          updated_at: participantJson.last_update_at,
          is_real_team: false,
          real_team_id: null, // We don't track real teams for solo tournaments to keep it simple
          participant_id: participantJson.participant_id,
          user_id: participantJson.user_id,
          participant_index: index,
          Members: [participantJson.User]
        };
      });

      return res.status(200).json({
        status: 'success',
        data: {
          isTeamBased: false,
          teams: singlePlayerTeams,
          participants: participants
        }
      });
    }
  } catch (error) {
    console.error('Error fetching tournament teams:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tournament teams',
      error: error.message
    });
  }
};

// Get team details (members) for a specific team
exports.getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // For solo team IDs, return a simple error since we'll handle these in the frontend
    // using the team data that was already loaded
    if (teamId.startsWith('solo-')) {
      return res.status(400).json({
        status: 'error',
        message: 'Solo team details should be handled using local team data, not API calls'
      });
    }
    
    // Validate UUID for real teams
    if (!validateUUID(teamId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid team ID format'
      });
    }

    // First try to find the team with tournament details
    let team = await TournamentTeam.findByPk(teamId, {
      include: [
        {
          model: Tournament,
          as: 'Tournament',
          attributes: ['tournament_id', 'tournament_Name', 'GameName', 'Team_Size_Limit']
        }
      ]
    });

    let memberDetails = [];
    let teamData = null;

    if (team) {
      
      // Fetch team members from team_members array
      if (team.team_members && team.team_members.length > 0) {
        const userIds = team.team_members.map(member => member.id);
        memberDetails = await User.findAll({
          where: { user_id: userIds },
          attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
        });

        // Add leadership status to each member
        memberDetails = memberDetails.map(member => {
          const memberJson = member.toJSON();
          const teamMember = team.team_members.find(m => m.id === member.user_id);
          if (teamMember) {
            memberJson.isLeader = teamMember.leader || false;
          }
          return memberJson;
        });

        // Refresh profile images for team members
        memberDetails = await refreshUserProfileImages(memberDetails);
      }

      // Create response with team and members
      teamData = team.toJSON();
      teamData.Members = memberDetails;
    } else {
      // If no team found, check if it's a participant ID from a solo tournament
      
      const participant = await TournamentParticipant.findByPk(teamId, {
        include: [
          {
            model: User,
            attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
          },
          {
            model: Tournament,
            attributes: ['tournament_id', 'tournament_Name', 'GameName', 'Team_Size_Limit']
          }
        ]
      });

      if (participant) {
        
        // Create a "fake" team object from the participant
        const participantJson = participant.toJSON();
        
        // Refresh profile image for the participant user
        const refreshedUser = await refreshUserProfileImages([participantJson.User]);
        
        // If no real team exists, create a fake team representation with unique ID
        teamData = {
          Team_id: `solo-${participantJson.user_id}-${participantJson.participant_id}-single`,
          Team_Number: participantJson.participant_id,
          Tournament_Id: participantJson.tournament_id,
          Team_Password: null,
          created_at: participantJson.last_update_at,
          updated_at: participantJson.last_update_at,
          is_real_team: false,
          participant_id: participantJson.participant_id,
          user_id: participantJson.user_id,
          Members: refreshedUser,
          Tournament: participantJson.Tournament
        };
      } else {
        // Neither team nor participant found
        return res.status(404).json({
          status: 'error',
          message: 'Team or participant not found'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        team: teamData
      }
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team details',
      error: error.message
    });
  }
};

// Get tournament overview statistics (for admin dashboard)
exports.getTournamentStats = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    // Validate UUID
    if (!validateUUID(tournamentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid tournament ID format'
      });
    }

    // Find tournament
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'error',
        message: 'Tournament not found'
      });
    }
    
    // Get basic statistics
    const isTeamBased = tournament.Team_Size_Limit > 1;
    
    // Count participants directly from TournamentParticipant table
    const totalParticipants = await TournamentParticipant.count({
      where: { 
        tournament_id: tournamentId,
        user_id: { [Op.ne]: null } // Only count participants with a user_id
      }
    });
    
    let totalTeams = 0;
    
    if (isTeamBased) {
      // For team tournaments
      totalTeams = await TournamentTeam.count({
        where: { Tournament_Id: tournamentId }
      });
    } else {
      // For individual tournaments, each participant is a "team"
      totalTeams = totalParticipants;
    }
    
    // Calculate available slots
    const maxPlayers = tournament.Max_Players_Allowed;
    const availableSlots = Math.max(0, maxPlayers - totalParticipants);
    
    // Calculate registration percentage
    const registrationPercentage = maxPlayers > 0 ? 
      Math.round((totalParticipants / maxPlayers) * 100) : 0;
    
    return res.status(200).json({
      status: 'success',
      data: {
        tournamentName: tournament.tournament_Name,
        isTeamBased,
        totalTeams,
        totalParticipants,
        maxPlayers,
        availableSlots,
        registrationPercentage,
        teamSizeLimit: tournament.Team_Size_Limit
      }
    });
  } catch (error) {
    console.error('Error fetching tournament statistics:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tournament statistics',
      error: error.message
    });
  }
};

// Get the real team ID for a participant
exports.getParticipantTeam = async (req, res) => {
  try {
    const { participantId } = req.params;
    
    // Validate UUID
    if (!validateUUID(participantId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid participant ID format'
      });
    }

    // Find the participant
    const participant = await TournamentParticipant.findByPk(participantId);
    if (!participant) {
      return res.status(404).json({
        status: 'error',
        message: 'Participant not found'
      });
    }

    // Check if the participant has a user_id
    if (!participant.user_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Participant has no associated user'
      });
    }

    // For solo tournaments, return virtual team ID without complex database queries
    
      return res.status(200).json({
        status: 'success',
        data: {
          participant_id: participantId,
          user_id: participant.user_id,
        team_id: `solo-${participant.user_id}-${participantId}-0`, // Use 0 as index since we don't have it here
          is_real_team: false
        }
      });
  } catch (error) {
    console.error('Error finding participant team:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to find participant team',
      error: error.message
    });
  }
}; 