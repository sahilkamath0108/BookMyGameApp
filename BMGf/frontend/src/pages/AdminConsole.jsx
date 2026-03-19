import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import ImageWithFallback from '../components/ImageWithFallback';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faUser,
  faArrowLeft,
  faExclamationTriangle,
  faSearch,
  faTrophy,
  faChartLine,
  faUserShield,
  faLayerGroup,
  faSitemap,
  faCheck,
  faPlay,
  faSync,
  faTrash,
  faTimes,
  faSpinner,
  faFutbol,
  faSkull,
  faCrosshairs,
  faThumbsUp,
  faShield,
  faFilter,
  faCrown,
  faGamepad,
  faKey,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

// Helper function to safely handle user data
const sanitizeUserData = (user) => {
  if (!user || typeof user !== 'object') {
    return {
      Name: 'Unknown User',
      email: '',
      GamerTag: {},
      user_id: null,
      profile_pic_url: null,
      profile_pic_key: null
    };
  }

  return {
    ...user,
    Name: typeof user.Name === 'string' ? user.Name : 'Unknown User',
    email: typeof user.email === 'string' ? user.email : '',
    GamerTag: typeof user.GamerTag === 'object' ? user.GamerTag : {},
    user_id: user.user_id || null,
    profile_pic_url: user.profile_pic_url || null,
    profile_pic_key: user.profile_pic_key || null
  };
};

const AdminConsole = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isTeamBased, setIsTeamBased] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  
  // Bracket tournament specific states
  const [isBracketTournament, setIsBracketTournament] = useState(false);
  const [matchups, setMatchups] = useState([]);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [showMatchupDetails, setShowMatchupDetails] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [isGeneratingMatchups, setIsGeneratingMatchups] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [matchupsByRound, setMatchupsByRound] = useState({});
  const [matchupSearchTerm, setMatchupSearchTerm] = useState('');
  const [isDeletingRound, setIsDeletingRound] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [updatingRoomDetails, setUpdatingRoomDetails] = useState(false);
  const [roomUpdateError, setRoomUpdateError] = useState('');
  const [roomUpdateSuccess, setRoomUpdateSuccess] = useState(false);
  const [filteredMatchupsByRound, setFilteredMatchupsByRound] = useState({});
  const [confirmRemoveUser, setConfirmRemoveUser] = useState(null);
  const [removeUserLoading, setRemoveUserLoading] = useState(false);
  const [removeUserError, setRemoveUserError] = useState(null);

  // Non-bracket tournament states
  const [selectedTeamStats, setSelectedTeamStats] = useState(null);
  const [showTeamStatsModal, setShowTeamStatsModal] = useState(false);
  const [teamPosition, setTeamPosition] = useState('');
  const [updatingTeamStats, setUpdatingTeamStats] = useState(false);
  const [teamStatsError, setTeamStatsError] = useState('');
  const [teamStatsSuccess, setTeamStatsSuccess] = useState(false);

  // Non-bracket tournament room management states
  const [tournamentRoomCode, setTournamentRoomCode] = useState('');
  const [tournamentRoomPassword, setTournamentRoomPassword] = useState('');
  const [updatingTournamentRoom, setUpdatingTournamentRoom] = useState(false);
  const [tournamentRoomError, setTournamentRoomError] = useState('');
  const [tournamentRoomSuccess, setTournamentRoomSuccess] = useState(false);

  // Add new state variables for player stats
  const [playerStats, setPlayerStats] = useState({});
  const [gameType, setGameType] = useState('fps'); // 'fps' or 'sports'
  const [submittingStats, setSubmittingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [statsSuccess, setStatsSuccess] = useState(false);
  const [leaderboardSearchTerm, setLeaderboardSearchTerm] = useState('');
  const [filteredLeaderboardData, setFilteredLeaderboardData] = useState([]);

  // Fetch tournament data, teams, and stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        

        // Check admin status for this tournament
        try {
          const adminCheckResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/super-admin/tournament/${tournamentId}/check`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (adminCheckResponse.data && adminCheckResponse.data.data) {
            setIsAdmin(adminCheckResponse.data.data.isAdmin);
            setAdminRole(adminCheckResponse.data.data.role);
          } else {
            // Not an admin, redirect back
            setError('You do not have admin access to this tournament');
            setTimeout(() => {
              navigate(`/tournaments/${tournamentId}`);
            }, 3000);
            return;
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setError('Failed to verify admin access');
          setLoading(false);
          return;
        }

        // Fetch tournament details
        const tournamentResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (tournamentResponse.data && tournamentResponse.data.data) {
          const tournamentData = tournamentResponse.data.data;
          setTournament(tournamentData);
          // Check if it's a bracket tournament
          setIsBracketTournament(tournamentData.Is_Bracket_Competition);
          
          // Initialize room code states for non-bracket tournaments
          if (!tournamentData.Is_Bracket_Competition) {
            setTournamentRoomCode(tournamentData.Room_Code || '');
            setTournamentRoomPassword(tournamentData.Room_Password || '');
          }
        }

        // Fetch teams data
        const teamsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/teams`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        

        if (teamsResponse.data && teamsResponse.data.data) {
          // Ensure teams is an array before setting
          const teamsData = Array.isArray(teamsResponse.data.data.teams) 
            ? teamsResponse.data.data.teams 
            : [];
          // Ensure participants is an array before setting
          const participantsData = Array.isArray(teamsResponse.data.data.participants) 
            ? teamsResponse.data.data.participants 
            : [];

          // Debug: Log team data structure for solo tournaments
          if (!teamsResponse.data.data.isTeamBased) {
            console.log('Solo tournament teams data:', teamsData.map(team => ({
              Team_id: team.Team_id,
              participant_id: team.participant_id,
              user_id: team.user_id,
              Members: team.Members?.map(m => ({ user_id: m.user_id, Name: m.Name }))
            })));
          }

          // --- BEGIN: Fetch and merge positions for all teams/participants ---
          // Collect all user IDs from teams and solo participants
          const allUserIds = [];
          teamsData.forEach(team => {
            if (Array.isArray(team.Members)) {
              team.Members.forEach(member => {
                if (member && member.user_id) allUserIds.push(member.user_id);
              });
            }
          });
          participantsData.forEach(participant => {
            if (participant && participant.User && participant.User.user_id) {
              allUserIds.push(participant.User.user_id);
            }
          });

          // Fetch all positions in one API call
          try {
            const token = localStorage.getItem('token');
            const statsResp = await axios.get(
              `${process.env.REACT_APP_BACKEND_URL}api/game-stats/tournament/${tournamentId}/non-bracket`,
              {
                headers: { Authorization: `Bearer ${token}` },
                params: { userIds: allUserIds.join(',') }
              }
            );
            if (statsResp.data && statsResp.data.status === 'success' && statsResp.data.data.stats) {
              const statsArr = statsResp.data.data.stats;
              // Map user_id to position
              const userIdToPosition = {};
              statsArr.forEach(stat => {
                if (stat.user_id && stat.position != null) {
                  userIdToPosition[stat.user_id] = stat.position;
                }
              });
              // Merge position into teams
              teamsData.forEach(team => {
                let foundPosition = null;
                if (Array.isArray(team.Members)) {
                  for (const member of team.Members) {
                    if (member && member.user_id && userIdToPosition[member.user_id] != null) {
                      foundPosition = userIdToPosition[member.user_id];
                      break;
                    }
                  }
                }
                if (foundPosition != null) team.position = foundPosition;
              });
              // Merge position into participants
              participantsData.forEach(participant => {
                if (participant && participant.User && participant.User.user_id) {
                  const pos = userIdToPosition[participant.User.user_id];
                  if (pos != null) participant.position = pos;
                }
              });
            }
          } catch (err) {
            console.error('Failed to fetch/merge positions for leaderboard:', err);
          }
          // --- END: Fetch and merge positions ---

          setTeams(teamsData);
          setFilteredTeams(teamsData);
          setParticipants(participantsData);
          setFilteredParticipants(participantsData);
          setIsTeamBased(teamsResponse.data.data.isTeamBased);
          // For solo tournaments, show participants tab by default
          if (!teamsResponse.data.data.isTeamBased) {
            setActiveTab('participants');
          }
        }

        // Fetch tournament stats
        const statsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (statsResponse.data && statsResponse.data.data) {
          setStats(statsResponse.data.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin console data:', error);
        setError(error.response?.data?.message || 'Failed to load admin console data');
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId, navigate]);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTeams(teams);
      setFilteredParticipants(participants);
    } else {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Filter teams - we'll collect all teams that match the criteria
      let matchingTeams = [];
      
      // First pass: Teams that match by Team Number or Team Name
      if (isTeamBased) {
        const teamMatches = teams.filter(team => {
          const teamNumber = String(team.Team_Number || '');
          const teamName = (team.Team_Name || '').toLowerCase();
          return teamNumber.includes(searchTermLower) || teamName.includes(searchTermLower);
        });
        
        matchingTeams = [...teamMatches];
      }
      
      // Second pass: Teams containing members that match the search term
      const teamsMemberMatches = teams.filter(team => {
        if (!team.Members || team.Members.length === 0) {
          return false;
        }
        
        return team.Members.some(member => {
          // Sanitize the member data first
          const sanitizedMember = sanitizeUserData(member);
          
          // Check if this member matches the search criteria
          return (
            sanitizedMember.Name.toLowerCase().includes(searchTermLower) ||
            sanitizedMember.email.toLowerCase().includes(searchTermLower) 
          );
        });
      });
      
      // Add teams with matching members to our results if they're not already included
      teamsMemberMatches.forEach(team => {
        if (!matchingTeams.some(t => t.Team_id === team.Team_id)) {
          matchingTeams.push(team);
        }
      });
      
      // Filter participants
      const filteredParticipants = participants.filter(participant => {
        if (!participant || !participant.User) return false;
        
        // Sanitize the user data first
        const sanitizedUser = sanitizeUserData(participant.User);
        
        // Now use the sanitized data for searching
        return (
          sanitizedUser.Name.toLowerCase().includes(searchTermLower) ||
          sanitizedUser.email.toLowerCase().includes(searchTermLower)
        );
      });
      
      // Since we now have participants that match, also include their teams
      // This ensures that if you search for a player, you see both the player and their team
      if (filteredParticipants.length > 0) {
        const matchingUserIds = filteredParticipants.map(p => p.user_id).filter(Boolean);
        
        // Find teams that have these participants as members
        const teamsWithMatchingParticipants = teams.filter(team => {
          if (!team.Members || team.Members.length === 0) {
            return false;
          }
          
          return team.Members.some(member => {
            const sanitizedMember = sanitizeUserData(member);
            return matchingUserIds.includes(sanitizedMember.user_id);
          });
        });
        
        // Add these teams if not already included
        teamsWithMatchingParticipants.forEach(team => {
          if (!matchingTeams.some(t => t.Team_id === team.Team_id)) {
            matchingTeams.push(team);
          }
        });
      }
      
      setFilteredTeams(matchingTeams);
      setFilteredParticipants(filteredParticipants);
    }
  }, [searchTerm, teams, participants, isTeamBased]);

  // Handle leaderboard search functionality for non-bracket tournaments
  useEffect(() => {
    if (!leaderboardSearchTerm.trim()) {
      // If no search term, show all data
      if (isBracketTournament) {
        setFilteredLeaderboardData([]);
      } else {
        // For non-bracket tournaments, combine teams and participants
        const allData = [];
        
        // Add teams
        if (teams && teams.length > 0) {
          allData.push(...teams);
        }
        
        // Add solo participants (those not in teams)
        if (participants && participants.length > 0) {
          allData.push(...participants);
        }
        
        setFilteredLeaderboardData(allData);
      }
    } else {
      const searchTermLower = leaderboardSearchTerm.toLowerCase();
      const filteredData = [];
      
      // Only filter teams, not individual participants
      if (teams && teams.length > 0) {
        const matchingTeams = teams.filter(team => {
          const teamNumber = String(team.Team_Number || '');
          const teamName = (team.Team_Name || '').toLowerCase();
          
          // Check if team name or number matches
          if (teamNumber.includes(searchTermLower) || teamName.includes(searchTermLower)) {
            return true;
          }
          
          // Also check if any team member matches, but still only show the team
          if (team.Members && team.Members.length > 0) {
            return team.Members.some(member => {
              const sanitizedMember = sanitizeUserData(member);
              const memberName = sanitizedMember.Name.toLowerCase();
              const memberEmail = sanitizedMember.email.toLowerCase();
              return memberName.includes(searchTermLower) || memberEmail.includes(searchTermLower);
            });
          }
          
          return false;
        });
        
        filteredData.push(...matchingTeams);
      }
      
      // Don't include individual participants in search results
      // Only show teams when searching
      
      setFilteredLeaderboardData(filteredData);
    }
  }, [leaderboardSearchTerm, teams, participants, isBracketTournament]);

  // Function to view team details
  const handleViewTeamDetails = async (teamId) => {
    try {
      setLoading(true);
      
      // For solo tournaments, try to find the team in our local teams array first
      // This avoids unnecessary API calls and uses the data we already have
      if (!isTeamBased && teamId.startsWith('solo-')) {
        const localTeam = teams.find(team => team.Team_id === teamId);
        if (localTeam) {
          
          // Make sure Members is an array and sanitize data
          const teamData = {
            ...localTeam,
            Members: Array.isArray(localTeam.Members) 
              ? localTeam.Members.map(member => sanitizeUserData(member))
              : []
          };
          setSelectedTeam(teamData);
          setShowTeamDetails(true);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to API call for team-based tournaments or if local data not found
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/admin-console/teams/${teamId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.data) {
        const teamData = response.data.data.team;
        
        // Make sure Members is an array
        if (!Array.isArray(teamData.Members)) {
          teamData.Members = [];
        }
        
        // Sanitize all member data
        teamData.Members = teamData.Members.map(member => sanitizeUserData(member));
        
        setSelectedTeam(teamData);
        setShowTeamDetails(true);
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError('Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  // Safe string for team numbers
  const getSafeTeamNumber = (team) => {
    if (!team) return "";
    return typeof team.Team_Number === 'number' || typeof team.Team_Number === 'string'
      ? `${team.Team_Number}`
      : "";
  };

  // Safe team name display
  const getTeamDisplayName = useCallback((team) => {
    if (!team) return "Unknown Team";
    
    // Use Team_Name if available (check both uppercase and lowercase versions)
    if (team.Team_Name) {
      return team.Team_Name;
    }
    
    // Check for lowercase variant (team_name)
    if (team.team_name) {
      return team.team_name;
    }
    
    // Fall back to team number
    const teamNumber = getSafeTeamNumber(team);
    if (teamNumber) {
      return `Team #${teamNumber}`;
    }
    
    // Last resort
    return `Team ${team.Team_id ? team.Team_id.slice(-4) : 'Unknown'}`;
  }, []);

  // Safe member name
  const getSafeMemberName = (member) => {
    const sanitizedMember = sanitizeUserData(member);
    return sanitizedMember.Name;
  };

  // Function to view participant details
  const handleViewParticipantDetails = async (participant) => {
    if (!participant || !participant.User) {
      console.error("Invalid participant data", participant);
      return;
    }
    
    try {
      setLoading(true);
      // Sanitize the user data
      const sanitizedUser = sanitizeUserData(participant.User);
      const participantId = participant.participant_id;
      
      // For solo tournaments, find the corresponding "team" from the teams list
      // This uses the team data that was already loaded when the page loaded
      if (!isTeamBased) {
        const correspondingTeam = teams.find(team => {
          // Check if this team has the same user as the participant
          if (team.Members && team.Members.length > 0) {
            const teamUser = sanitizeUserData(team.Members[0]);
            return teamUser.user_id === sanitizedUser.user_id;
          }
          // Also check by participant_id
          return team.participant_id === participantId;
        });
          
        if (correspondingTeam) {
          
          setSelectedTeam(correspondingTeam);
          setShowTeamDetails(true);
            return;
          }
      }
      
      // For team-based tournaments or if no corresponding team found
      // Create a basic team structure for display
      const basicTeam = {
        Team_id: participantId, // Use participant ID as fallback
        Team_Number: participantId,
          Tournament_Id: tournamentId,
          Team_Password: null,
          created_at: participant.last_update_at,
          updated_at: participant.last_update_at,
        participant_id: participantId,
        user_id: sanitizedUser.user_id,
        is_real_team: false,
          Members: [sanitizedUser]
        };
        
      setSelectedTeam(basicTeam);
        setShowTeamDetails(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to close team details modal
  const handleCloseTeamDetails = () => {
    setShowTeamDetails(false);
    setSelectedTeam(null);
  };

  // Function to handle removing a team member
  const handleRemoveMember = async (userId, teamId) => {
    try {
      setRemoveUserLoading(true);
      setRemoveUserError(null);
      
      // Validate the userId
      if (!userId || typeof userId !== 'string') {
        setRemoveUserError('Invalid user ID');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      
      
      // Check if user is part of the specified team
      if (teamId && selectedTeam) {
        // Check if the user is actually in this team
        const isMemberOfTeam = selectedTeam.Members && 
          selectedTeam.Members.some(member => {
            const sanitizedMember = sanitizeUserData(member);
            return sanitizedMember.user_id === userId;
          });
        
        if (!isMemberOfTeam) {
          setRemoveUserError('User is not a member of this team');
          return;
        }
      }
      
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/super-admin/tournament/remove-member`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          data: { 
            userId: userId,
            tournamentId: tournamentId
          }
        }
      );

      if (response.data?.status === 'success') {
        
        // Show success message
        alert('Team member removed successfully!');
        
        // Refresh teams data
        const teamsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/teams`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (teamsResponse.data && teamsResponse.data.data) {
          // Update teams state
          const teamsData = Array.isArray(teamsResponse.data.data.teams) 
            ? teamsResponse.data.data.teams 
            : [];
            
          const participantsData = Array.isArray(teamsResponse.data.data.participants) 
            ? teamsResponse.data.data.participants 
            : [];
          
          setTeams(teamsData);
          setFilteredTeams(teamsData);
          setParticipants(participantsData);
          setFilteredParticipants(participantsData);
        }
        
        // Refresh stats
        const statsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (statsResponse.data && statsResponse.data.data) {
          setStats(statsResponse.data.data);
        }

        // If we're viewing a team, refresh the team details
        if (selectedTeam && teamId === selectedTeam.Team_id) {
          await handleViewTeamDetails(teamId);
        }
        
        setConfirmRemoveUser(null);
      } else {
        console.warn('Unexpected response format:', response.data);
        setRemoveUserError('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      // Extract error message from response if available
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to remove team member';
      setRemoveUserError(errorMessage);
    } finally {
      setRemoveUserLoading(false);
    }
  };

  // New functions for bracket tournament matchups

  // Fetch existing matchups for the tournament
  const fetchMatchups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check response structure and access the correct property
      if (response.data && response.data.status === 'success') {
        const data = response.data.data;
        
        // Check if the matchups data is in the expected structure
        const matchupsData = data.matchups || [];
        
        // Check if matchupsData is an array before proceeding
        if (Array.isArray(matchupsData)) {
          // Add tournament_id to each matchup if not already present
          const matchupsWithTournamentId = matchupsData.map(matchup => ({
            ...matchup,
            tournament_id: matchup.tournament_id || tournamentId
          }));
          
          setMatchups(matchupsWithTournamentId);
          
          // Organize matchups by round
          const byRound = {};
          let maxRound = 0;
          
          matchupsWithTournamentId.forEach(matchup => {
            // Using round_tag from controller instead of round
            const round = matchup.round_tag || 1;
            if (!byRound[round]) {
              byRound[round] = [];
            }
            
            // Process team data
            const team1 = matchup.Team1 || null;
            const team2 = matchup.Team2 || null;
            
            byRound[round].push({
              matchup_id: matchup.matchup_id,
              team1_id: matchup.player1,
              team2_id: matchup.player2,
              winner_id: matchup.winner,
              round: round,
              scheduled_time: matchup.scheduled_time,
              Team1: team1,
              Team2: team2,
              tournament_id: matchup.tournament_id || tournamentId
            });
            
            if (round > maxRound) {
              maxRound = round;
            }
          });
          
          setMatchupsByRound(byRound);
          setCurrentRound(maxRound);
          
        } else {
          // Handle case where data is not an array
          
          setMatchups([]);
          setMatchupsByRound({});
          setCurrentRound(0);
        }
      } else {
        
        setMatchups([]);
        setMatchupsByRound({});
        setCurrentRound(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matchups:', error);
      setGenerationError('Failed to load matchups');
      setMatchups([]);
      setMatchupsByRound({});
      setCurrentRound(0);
      setLoading(false);
    }
  };

  // Fetch matchups if it's a bracket tournament
  useEffect(() => {
    if (isBracketTournament) {
      fetchMatchups();
    }
  }, [isBracketTournament, tournamentId]);

  // Generate initial matchups
  const handleGenerateInitialMatchups = async () => {
    try {
      setIsGeneratingMatchups(true);
      setGenerationError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}/generate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        await fetchMatchups();
      } else {
        setGenerationError(response.data?.message || 'Failed to generate matchups');
      }
    } catch (error) {
      console.error('Error generating initial matchups:', error);
      setGenerationError(error.response?.data?.message || 'Failed to generate initial matchups');
    } finally {
      setIsGeneratingMatchups(false);
    }
  };

  // Generate next round matchups
  const handleGenerateNextRoundMatchups = async () => {
    try {
      setIsGeneratingMatchups(true);
      setGenerationError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}/next-round`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        await fetchMatchups();
      } else {
        setGenerationError(response.data?.message || 'Failed to generate next round matchups');
      }
    } catch (error) {
      console.error('Error generating next round matchups:', error);
      setGenerationError(error.response?.data?.message || 'Failed to generate next round matchups');
    } finally {
      setIsGeneratingMatchups(false);
    }
  };

  // Get safe team name
  const getSafeTeamName = useCallback((team) => {
    if (!team) return "TBD";
    
    // For solo tournaments, show the username of the first member
    if (!isTeamBased && team.Members && team.Members.length > 0) {
      const firstMember = sanitizeUserData(team.Members[0]);
      return firstMember.Name || "Unknown Player";
    }
    
    // Use getTeamDisplayName to get consistent naming for team tournaments
    return getTeamDisplayName(team);
  }, [getTeamDisplayName, isTeamBased]);

  // Function to get round display name based on number of players
  const getRoundDisplayName = useCallback((round, playerCount) => {
    if (playerCount === 2) {
      return "🏆 FINALS";
    } else if (playerCount === 4) {
      return "🥉 SEMI-FINALS";
    } else if (playerCount === 8) {
      return "🥈 QUARTER-FINALS";
    } else {
      return `Round ${round}`;
    }
  }, []);

  // Set a winner for a matchup and update player stats
  const handleSetMatchupWinner = async (matchupId, winnerId) => {
    try {
      setLoading(true);
      setStatsError(null);
      setStatsSuccess(false);
      
      const token = localStorage.getItem('token');
      
      // Log the request data for debugging
      
      
      // If resetting winner (winnerId is null), delete all stats for this matchup first
      if (winnerId === null && matchupId) {
        try {
          
          await axios.delete(
            `${process.env.REACT_APP_BACKEND_URL}api/game-stats/matchup/${matchupId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
        } catch (error) {
          console.error('Error deleting matchup stats:', error);
          // Continue with resetting winner even if stats deletion fails
        }
      }
      
      // When resetting a winner, send null directly in the request
      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/${matchupId}/winner`,
        { winner_id: winnerId === null ? null : winnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        
        
        // If we have a winner being set (not reset), submit the stats
        if (winnerId !== null) {
          // Make sure we're using the correct tournament_id from selectedMatchup
          
          
          // Extract tournament_id properly and log it
          const tournamentId = selectedMatchup.tournament_id;
          
          
          // Pass the correct tournament_id to handleSubmitPlayerStats
          await handleSubmitPlayerStats(tournamentId, matchupId);
        }
        
        await fetchMatchups();
        // Only close the modal if stats were submitted successfully or no stats to submit
        if (!statsError) {
          setShowMatchupDetails(false);
        }
      } else {
        console.error('Failed to update matchup winner:', response.data);
        setError(response.data?.message || 'Failed to update matchup winner');
      }
    } catch (error) {
      console.error('Error updating matchup winner:', error);
      setError(error.response?.data?.message || 'Failed to update winner');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle player stats submission
  const handleSubmitPlayerStats = async (tournamentId, matchupId) => {
    try {
      setSubmittingStats(true);
      setStatsError(null);
      
      const token = localStorage.getItem('token');
      
      // Check if tournamentId exists
      if (!tournamentId) {
        console.error('Missing tournament_id for stats submission');
        setStatsError('Tournament ID is required but was not provided');
        return;
      }
      
      // Get all players from both teams
      const allPlayers = [];
      
      // Get Team 1 members
      const team1 = findTeamById(selectedMatchup.team1_id);
      if (team1 && Array.isArray(team1.Members)) {
        team1.Members.forEach(member => {
          const sanitizedMember = sanitizeUserData(member);
          if (sanitizedMember.user_id) {
            allPlayers.push(sanitizedMember);
          }
        });
      }
      
      // Get Team 2 members
      const team2 = findTeamById(selectedMatchup.team2_id);
      if (team2 && Array.isArray(team2.Members)) {
        team2.Members.forEach(member => {
          const sanitizedMember = sanitizeUserData(member);
          if (sanitizedMember.user_id) {
            allPlayers.push(sanitizedMember);
          }
        });
      }
      
      // Ensure all players have stats entries
      const entriesMap = {};
      
      // First add all existing stats
      Object.entries(playerStats).forEach(([userId, stats]) => {
        // Ensure all fields have values by combining with default stats
        entriesMap[userId] = {
          ...getDefaultStats(gameType), // Add all default fields
          ...stats                      // Override with any existing values
        };
      });
      
      // Then ensure all players have entries, even if they're zeros
      allPlayers.forEach(player => {
        if (!entriesMap[player.user_id]) {
          
          entriesMap[player.user_id] = getDefaultStats(gameType);
        }
      });
      
      // Create entries array for API
      const entries = Object.entries(entriesMap).map(([userId, stats]) => ({
        user_id: userId,
        stats: stats
      }));
      
      if (entries.length === 0) {
        
        return;
      }
      
      
      
      // Create the request payload
      const payload = {
        tournament_id: tournamentId,
        entries: entries
      };
      
      // Only add matchup_id if it exists
      if (matchupId) {
        payload.matchup_id = matchupId;
      }
      
      // Log request payload in more detail for debugging
      
      
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}api/game-stats/bulk`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.status === 'success') {
        
        setStatsSuccess(true);
        // Update playerStats state with the complete data
        setPlayerStats(entriesMap);
      } else {
        console.error('Failed to submit player stats:', response.data);
        setStatsError(response.data?.message || 'Failed to submit player stats');
      }
    } catch (error) {
      console.error('Error submitting player stats:', error);
      // Log more detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        setStatsError(error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        console.error('Error request:', error.request);
        setStatsError('No response received from server');
      } else {
        console.error('Error message:', error.message);
        setStatsError(error.message || 'Error submitting player stats');
      }
    } finally {
      setSubmittingStats(false);
    }
  };
  
  // Get default stats object based on game type
  const getDefaultStats = (gameType) => {
    if (gameType === 'fps') {
      return { kills: 0, deaths: 0, assists: 0, headshots: 0 };
    } else if (gameType === 'sports') {
      return { goals: 0, assists: 0, saves: 0 };
    }
    return {};
  };

  // Handle player stat change
  const handlePlayerStatChange = (userId, statName, value) => {
    // Convert to number and ensure it's not negative
    const numValue = Math.max(0, parseInt(value) || 0);
    
    // Make sure we store the user_id directly on each stat entry
    setPlayerStats(prev => {
      // Get default stats based on game type
      const defaultStats = getDefaultStats(gameType);
      
      // Ensure we have an object for this user with all default fields
      const userStats = prev[userId] || { ...defaultStats };
      
      // Create a new object with the updated stat, ensuring all fields exist
      const updatedUserStats = {
        ...defaultStats,  // First add all default fields with 0 values
        ...userStats,     // Then add any existing values from before
        [statName]: numValue  // Finally add the newly updated value
      };
      
      
      
      // Return updated state
      return {
        ...prev,
        [userId]: updatedUserStats
      };
    });
  };

  // View matchup details
  const handleViewMatchupDetails = async (matchup) => {
    // Log detailed information about the matchup being selected
    console.log('Selected matchup details:', {
      matchup_id: matchup.matchup_id,
      tournament_id: matchup.tournament_id,
      team1_id: matchup.team1_id,
      team2_id: matchup.team2_id,
      winner_id: matchup.winner_id,
      round: matchup.round,
      round_tag: matchup.round_tag,
      room_code: matchup.room_code,
      room_password: matchup.room_password
    });
    
    // First, try to fetch the latest matchup details from the database
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/${matchup.matchup_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        const latestMatchup = response.data.data;
        
        
        // Use the latest data from database
        setSelectedMatchup({
          ...matchup,
          room_code: latestMatchup.room_code,
          room_password: latestMatchup.room_password
        });
        setRoomCode(latestMatchup.room_code || '');
        setRoomPassword(latestMatchup.room_password || '');
      } else {
        // Fallback to the original matchup data
        setSelectedMatchup(matchup);
        setRoomCode(matchup.room_code || '');
        setRoomPassword(matchup.room_password || '');
      }
    } catch (error) {
      console.error('Error fetching latest matchup details:', error);
      // Fallback to the original matchup data
      setSelectedMatchup(matchup);
      setRoomCode(matchup.room_code || '');
      setRoomPassword(matchup.room_password || '');
    }
    
    setShowMatchupDetails(true);
    
    // Reset state
    setPlayerStats({});
    setStatsError(null);
    setStatsSuccess(false);
    setRoomUpdateError('');
    setRoomUpdateSuccess(false);
    
    // If this is a completed matchup (has a winner), try to fetch existing stats
    if (matchup.winner_id && matchup.matchup_id) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/game-stats/matchup/${matchup.matchup_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.status === 'success' && response.data.data.stats) {
          const statsData = response.data.data.stats;
          
          
          // Convert the array of stats into the format used by playerStats state
          const formattedStats = {};
          statsData.forEach(stat => {
            if (stat.user_id && stat.stats) {
              formattedStats[stat.user_id] = stat.stats;
            }
          });
          
          
          setPlayerStats(formattedStats);
        }
      } catch (error) {
        console.error('Error fetching matchup stats:', error);
        // Don't set an error here, just continue with empty stats
      }
    }
  };

  // Close matchup details modal
  const handleCloseMatchupDetails = () => {
    setShowMatchupDetails(false);
    setSelectedMatchup(null);
    setRoomCode('');
    setRoomPassword('');
    setRoomUpdateError('');
    setRoomUpdateSuccess(false);
  };

  // Handle viewing team stats for non-bracket tournaments
  const handleViewTeamStats = async (teamOrParticipant) => {
    try {
      setSelectedTeamStats(teamOrParticipant);
      setShowTeamStatsModal(true);
      setTeamStatsError('');
      setTeamStatsSuccess(false);
      setTeamPosition('');
      
      // Reset player stats
      setPlayerStats({});
      
      // Get all user IDs for this team/participant
      const userIds = [];
      if (teamOrParticipant.Members) {
        // Team with multiple members
        teamOrParticipant.Members.forEach(member => {
          const sanitizedMember = sanitizeUserData(member);
          if (sanitizedMember.user_id) {
            userIds.push(sanitizedMember.user_id);
          }
        });
      } else if (teamOrParticipant.User) {
        // Single participant
        const sanitizedUser = sanitizeUserData(teamOrParticipant.User);
        if (sanitizedUser.user_id) {
          userIds.push(sanitizedUser.user_id);
        }
      }
      
      // Initialize with default stats first
      const initialStats = {};
      userIds.forEach(userId => {
        initialStats[userId] = getDefaultStats(gameType);
      });
      setPlayerStats(initialStats);
      
      // Try to fetch existing stats and position from backend
      if (userIds.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/game-stats/tournament/${tournamentId}/non-bracket`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              params: { userIds: userIds.join(',') }
            }
          );
          
          if (response.data && response.data.status === 'success' && response.data.data.stats) {
            const existingStats = response.data.data.stats;
            
            
            // Update player stats with existing data
            const updatedStats = { ...initialStats };
            let foundPosition = null            
            existingStats.forEach(stat => {
            foundPosition = stat.position;

              if (stat.user_id && stat.stats) {

                
                updatedStats[stat.user_id] = stat.stats;
              }

              // Get position from any of the stats (they should all have the same position for team members)
              if (stat.position && !foundPosition) {
               

                foundPosition = stat.position;
              }
            });
            
            setPlayerStats(updatedStats);
            
            // Set the position if found
            if (foundPosition) {
             

              setTeamPosition(foundPosition.toString());
            }
          }
        } catch (error) {
          console.error('Error fetching existing stats:', error);
          // Continue with default stats if fetching fails
        }
      }
      
    } catch (error) {
      console.error('Error opening team stats:', error);
      setTeamStatsError('Failed to load team statistics');
    }
  };

  // Close team stats modal
  const handleCloseTeamStatsModal = () => {
    setShowTeamStatsModal(false);
    setSelectedTeamStats(null);
    setTeamPosition('');
    setTeamStatsError('');
    setTeamStatsSuccess(false);
    setPlayerStats({});
  };

  // Handle updating team position and stats
  const handleUpdateTeamStats = async () => {
    if (!selectedTeamStats) return;
    
    try {
      setUpdatingTeamStats(true);
      setTeamStatsError('');
      
      const token = localStorage.getItem('token');
      
      // Prepare the data for submission
      const teamId = selectedTeamStats.Team_id || selectedTeamStats.User?.user_id;
      const position = teamPosition ? parseInt(teamPosition) : null;
      
      // Get all players from the team/participant
      const allPlayers = [];
      
      if (selectedTeamStats.Members) {
        // Team with multiple members
        selectedTeamStats.Members.forEach(member => {
          const sanitizedMember = sanitizeUserData(member);
          if (sanitizedMember.user_id) {
            allPlayers.push(sanitizedMember);
          }
        });
      } else if (selectedTeamStats.User) {
        // Single participant
        const sanitizedUser = sanitizeUserData(selectedTeamStats.User);
        if (sanitizedUser.user_id) {
          allPlayers.push(sanitizedUser);
        }
      }
      
      // Create entries array for stats API
      const entries = allPlayers.map(player => ({
        user_id: player.user_id,
        stats: playerStats[player.user_id] || getDefaultStats(gameType)
      }));
      
      // Submit player stats with position
      if (entries.length > 0) {
        const statsPayload = {
          tournament_id: tournamentId,
          entries: entries,
          position: position // Include position in the payload
        };
        
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}api/game-stats/bulk`,
          statsPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setTeamStatsSuccess(true);
      setTimeout(() => {
        setTeamStatsSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error updating team stats:', error);
      setTeamStatsError(error.response?.data?.message || 'Failed to update team statistics');
    } finally {
      setUpdatingTeamStats(false);
    }
  };

  // Update matchup room details
  const handleUpdateRoomDetails = async () => {
    if (!selectedMatchup || (!roomCode && !roomPassword)) {
      setRoomUpdateError('Please enter at least a room code or password');
      return;
    }

    try {
      setUpdatingRoomDetails(true);
      setRoomUpdateError('');
      setRoomUpdateSuccess(false);

      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/${selectedMatchup.matchup_id}/room`,
        {
          room_code: roomCode.trim() || null,
          room_password: roomPassword.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        setRoomUpdateSuccess(true);
        
        // Update the selected matchup with new room details
        const updatedRoomCode = roomCode.trim() || null;
        const updatedRoomPassword = roomPassword.trim() || null;
        
        setSelectedMatchup(prev => ({
          ...prev,
          room_code: updatedRoomCode,
          room_password: updatedRoomPassword
        }));
        
        // Refresh matchups to get updated data
        await fetchMatchups();
        
        // Show success message with email notification info
        
        
        setTimeout(() => {
          setRoomUpdateSuccess(false);
        }, 5000); // Show success message for 5 seconds
      }
    } catch (error) {
      console.error('Error updating room details:', error);
      setRoomUpdateError(error.response?.data?.message || 'Failed to update room details');
    } finally {
      setUpdatingRoomDetails(false);
    }
  };

  // Update tournament room details for non-bracket tournaments
  const handleUpdateTournamentRoom = async () => {
    if (!tournamentRoomCode && !tournamentRoomPassword) {
      setTournamentRoomError('Please enter at least a room code or password');
      return;
    }

    try {
      setUpdatingTournamentRoom(true);
      setTournamentRoomError('');
      setTournamentRoomSuccess(false);

      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
        {
          Room_Code: tournamentRoomCode.trim() || null,
          Room_Password: tournamentRoomPassword.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        setTournamentRoomSuccess(true);
        
        // Update the tournament state with new room details
        setTournament(prev => ({
          ...prev,
          Room_Code: tournamentRoomCode.trim() || null,
          Room_Password: tournamentRoomPassword.trim() || null
        }));
        
        // Show success message with email notification info
        
        
        setTimeout(() => {
          setTournamentRoomSuccess(false);
        }, 5000); // Show success message for 5 seconds
      }
    } catch (error) {
      console.error('Error updating tournament room details:', error);
      setTournamentRoomError(error.response?.data?.message || 'Failed to update tournament room details');
    } finally {
      setUpdatingTournamentRoom(false);
    }
  };

  // Find team information by ID
  const findTeamById = useCallback((teamId) => {
    if (!teamId) return null;
    
    // Try to find team in the loaded teams list by Team_id
    const teamFromList = teams.find(team => team.Team_id === teamId);
    if (teamFromList) return teamFromList;
    
    // For solo tournaments, also try to find by real_team_id
    // This handles the case where matchups contain real team IDs but teams array has virtual IDs
    if (!isTeamBased) {
      const teamByRealId = teams.find(team => 
        team.real_team_id === teamId || 
        (team.Members && team.Members.length > 0 && team.Members[0].user_id === teamId)
      );
      if (teamByRealId) return teamByRealId;
    }
    
    // If we have a matchup list with team information, try to extract team from there
    for (const round in matchupsByRound) {
      for (const matchup of matchupsByRound[round]) {
        if (matchup.team1_id === teamId && matchup.Team1) {
          return matchup.Team1;
        }
        if (matchup.team2_id === teamId && matchup.Team2) {
          return matchup.Team2;
        }
      }
    }
    
    // For solo tournaments, try to find the participant by user ID
    if (!isTeamBased) {
      const participant = participants.find(p => p.User && p.User.user_id === teamId);
      if (participant && participant.User) {
        // Create a "fake" team object for solo participant
        return {
          Team_id: teamId,
          Team_Number: null,
          Members: [sanitizeUserData(participant.User)]
        };
      }
    }
    
    // If nothing found, return a placeholder with the id
    return { 
      Team_id: teamId,
      Team_Number: teamId.slice(-4), // Use last 4 characters of ID as a number
      Members: []
    };
  }, [teams, matchupsByRound, isTeamBased, participants]);

  // Handle matchup search
  useEffect(() => {
    if (!matchupSearchTerm.trim()) {
      setFilteredMatchupsByRound(matchupsByRound);
      return;
    }

    const searchTermLower = matchupSearchTerm.toLowerCase();
    const filtered = { ...matchupsByRound }; // Clone to preserve all rounds

    // Go through each round and filter its matchups
    Object.keys(filtered).forEach(round => {
      const roundMatchups = matchupsByRound[round].filter(matchup => {
        const team1 = findTeamById(matchup.team1_id);
        const team2 = findTeamById(matchup.team2_id);
        
        // Get team names for searching
        const team1Name = getSafeTeamName(team1).toLowerCase();
        const team2Name = getSafeTeamName(team2).toLowerCase();
        
        // Get team numbers as strings for searching
        const team1Number = team1?.Team_Number?.toString() || '';
        const team2Number = team2?.Team_Number?.toString() || '';
        
        // For solo tournaments, also search by user email
        let team1Email = '';
        let team2Email = '';
        if (!isTeamBased) {
          if (team1?.Members && team1.Members.length > 0) {
            const firstMember = sanitizeUserData(team1.Members[0]);
            team1Email = firstMember.email?.toLowerCase() || '';
          }
          if (team2?.Members && team2.Members.length > 0) {
            const firstMember = sanitizeUserData(team2.Members[0]);
            team2Email = firstMember.email?.toLowerCase() || '';
          }
        }
        
        // Match if either team name, team number, or email contains the search term
        return team1Name.includes(searchTermLower) || 
               team2Name.includes(searchTermLower) ||
               team1Number.includes(searchTermLower) || 
               team2Number.includes(searchTermLower) ||
               team1Email.includes(searchTermLower) ||
               team2Email.includes(searchTermLower);
      });
      
      // Update the filtered matchups for this round
      filtered[round] = roundMatchups;
    });
    
    setFilteredMatchupsByRound(filtered);
  }, [matchupSearchTerm, matchupsByRound, findTeamById, getSafeTeamName]);

  // Delete latest round of matchups
  const handleDeleteLatestRound = async () => {
    try {
      if (!window.confirm(`Are you sure you want to delete ${getRoundDisplayName(currentRound, (matchupsByRound[currentRound]?.length || 0) * 2)}? This action cannot be undone.`)) {
        return;
      }
      
      setIsDeletingRound(true);
      setGenerationError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}/latest-round`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        
        await fetchMatchups();
      } else {
        console.error('Failed to delete latest round:', response.data);
        setGenerationError(response.data?.message || 'Failed to delete the latest round');
      }
    } catch (error) {
      console.error('Error deleting latest round:', error);
      setGenerationError(error.response?.data?.message || 'Error deleting the latest round');
    } finally {
      setIsDeletingRound(false);
    }
  };

  // When matchups are loaded, set filtered matchups to all matchups initially
  useEffect(() => {
    setFilteredMatchupsByRound(matchupsByRound);
  }, [matchupsByRound]);

  // Detect game type based on tournament name or game name
  useEffect(() => {
    if (tournament) {
      const tournamentNameLower = (tournament.tournament_Name || '').toLowerCase();
      const gameNameLower = (tournament.GameName || '').toLowerCase();
      
      // Check for FPS games
      if (
        gameNameLower.includes('valorant') || 
        gameNameLower.includes('csgo') || 
        gameNameLower.includes('call of duty') ||
        gameNameLower.includes('apex') ||
        tournamentNameLower.includes('valorant') || 
        tournamentNameLower.includes('csgo') || 
        tournamentNameLower.includes('call of duty') ||
        tournamentNameLower.includes('apex')
      ) {
        setGameType('fps');
      }
      // Check for sports games
      else if (
        gameNameLower.includes('fifa') || 
        gameNameLower.includes('football') || 
        gameNameLower.includes('soccer') ||
        gameNameLower.includes('basketball') ||
        gameNameLower.includes('nba') ||
        tournamentNameLower.includes('fifa') || 
        tournamentNameLower.includes('football') || 
        tournamentNameLower.includes('soccer') ||
        tournamentNameLower.includes('basketball') ||
        tournamentNameLower.includes('nba')
      ) {
        setGameType('sports');
      }
      // Default to FPS if can't determine
      else {
        setGameType('fps');
      }
    }
  }, [tournament]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
            ? 'from-purple-300/20 to-pink-300/20' 
            : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
          <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
            ? 'from-blue-300/20 to-cyan-300/20' 
            : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
          <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
        </div>
        
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isLight 
              ? 'border-purple-600' 
              : 'border-[#F05454]'}`}></div>
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isLight 
              ? 'border-pink-600' 
              : 'border-[#F05454]'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className={`${isLight 
            ? 'bg-red-100 border-red-400 text-red-700' 
            : 'bg-red-500 bg-opacity-20 border border-red-500 text-red-300'} p-4 rounded-lg mb-6 flex items-center gap-2`}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className={`flex items-center gap-2 ${isLight 
              ? 'text-[#F05454] hover:text-white border border-[#F05454] hover:bg-[#F05454]' 
              : 'text-[#F05454] hover:text-[#e03e3e] border border-[#F05454] hover:bg-[#F05454] hover:text-white'} transition duration-200 px-4 py-2 rounded-lg`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Tournament Details</span>
          </button>
        </div>
      </div>
    );
  }

  // Safeguard stats properties
  const safeStats = stats || {};
  const maxPlayers = typeof safeStats.maxPlayers === 'number' ? safeStats.maxPlayers : 0;
  const teamSizeLimit = typeof safeStats.teamSizeLimit === 'number' ? safeStats.teamSizeLimit : 0;
  const availableSlots = typeof safeStats.availableSlots === 'number' ? safeStats.availableSlots : 0;
  
  // Calculate registration percentage safely
  const registrationPercentage = 
    maxPlayers > 0 && participants.length > 0 
      ? Math.round((participants.length / maxPlayers) * 100) 
      : 0;

  // Render a player stat input field
  const renderPlayerStatInput = (player, statName, icon, label, readOnly = false) => {
    const userId = player.user_id;
    const currentValue = (playerStats[userId] && playerStats[userId][statName]) || 0;
    
    return (
      <div className="flex items-center gap-2 mt-1">
        <FontAwesomeIcon icon={icon} className={`${isLight ? 'text-gray-500' : 'text-gray-400'} w-4`} />
        <label className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} w-16`}>{label}:</label>
        {readOnly ? (
          <div className={`${isLight 
            ? 'bg-gray-200 text-gray-800 border border-gray-300' 
            : 'bg-gray-800 text-white border border-gray-700'} rounded px-2 py-1 w-16 text-center`}>
            {currentValue}
          </div>
        ) : (
          <input 
            type="number" 
            min="0"
            value={currentValue}
            onChange={(e) => handlePlayerStatChange(userId, statName, e.target.value)}
            className={`${isLight 
              ? 'bg-white text-gray-800 border border-gray-300' 
              : 'bg-gray-800 text-white border border-gray-700'} rounded px-2 py-1 w-16 text-center`}
          />
        )}
      </div>
    );
  };

  // Render player stats form based on game type
  const renderPlayerStats = (player, readOnly = false) => {
    if (gameType === 'fps') {
      return (
        <div className={`mt-2 ${isLight 
          ? 'bg-gray-200/50' 
          : 'bg-gray-800 bg-opacity-50'} p-2 rounded`}>
          {renderPlayerStatInput(player, 'kills', faSkull, 'Kills', readOnly)}
          {renderPlayerStatInput(player, 'deaths', faSkull, 'Deaths', readOnly)}
          {renderPlayerStatInput(player, 'assists', faThumbsUp, 'Assists', readOnly)}
          {renderPlayerStatInput(player, 'headshots', faCrosshairs, 'Headshots', readOnly)}
        </div>
      );
    } else if (gameType === 'sports') {
      return (
        <div className={`mt-2 ${isLight 
          ? 'bg-gray-200/50' 
          : 'bg-gray-800 bg-opacity-50'} p-2 rounded`}>
          {renderPlayerStatInput(player, 'goals', faFutbol, 'Goals', readOnly)}
          {renderPlayerStatInput(player, 'assists', faThumbsUp, 'Assists', readOnly)}
          {renderPlayerStatInput(player, 'saves', faShield, 'Saves', readOnly)}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
          ? 'from-purple-300/20 to-pink-300/20' 
          : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
        <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
          ? 'from-blue-300/20 to-cyan-300/20' 
          : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
          ? 'from-orange-300/20 to-red-300/20' 
          : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
      </div>

      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className={`flex items-center gap-2 ${isLight 
            ? 'text-[#F05454] hover:text-white border border-[#F05454] hover:bg-[#F05454]' 
            : 'text-[#F05454] hover:text-[#e03e3e] border border-[#F05454] hover:bg-[#F05454] hover:text-white'} transition duration-200 px-4 py-2 rounded-lg mb-6`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tournament Details</span>
        </button>

        {/* Enhanced Gaming Header */}
        <div className="mb-8">
          {/* Gaming Status Badge */}
          <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight 
            ? 'from-purple-400/10 to-pink-400/10 border-purple-400/20' 
            : 'from-purple-600/20 to-pink-600/20 border-purple-500/30'} px-6 py-2 rounded-full border mb-6`}>
            <FontAwesomeIcon icon={faUserShield} className={`${isLight ? 'text-purple-600' : 'text-purple-400'} animate-pulse`} />
            <span className={`text-sm font-semibold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
              {adminRole === 'super_admin' ? '👑 SUPREME COMMANDER' : '🛡️ BATTLE ADMIN'}
            </span>
            <FontAwesomeIcon icon={faUserShield} className={`${isLight ? 'text-purple-600' : 'text-purple-400'} animate-pulse`} />
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold bg-gradient-to-r ${isLight 
            ? 'from-purple-600 via-pink-600 to-red-600' 
            : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
            ⚔️ COMMAND CENTER
          </h1>
          
          {tournament && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className={`flex items-center gap-2 ${isLight 
                ? 'bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-300/50' 
                : 'bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50'}`}>
                <span className="text-2xl">🏆</span>
                <span className={`font-semibold text-xl ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                  {tournament.tournament_Name || 'Epic Tournament'}
                </span>
              </div>
              
              {isBracketTournament && (
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-blue-600/10 to-cyan-600/10 border border-blue-500/20 text-blue-700' 
                  : 'from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-blue-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faSitemap} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} animate-pulse`} />
                  <span className="font-semibold">🏟️ BRACKET WARS</span>
                </div>
              )}
            </div>
          )}
          
          <p className={`text-xl ${isLight ? 'text-gray-600' : 'text-gray-300'} max-w-2xl`}>
            🎮 Managing warriors and overseeing epic battles across the tournament realm
          </p>
        </div>

        {/* Enhanced Gaming Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-purple-500/5 to-pink-500/5 border border-purple-500/20 hover:border-purple-500/40' 
            : 'from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-500/50'} backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>⚔️ Total Warriors</h3>
              <FontAwesomeIcon icon={faUser} className={`${isLight ? 'text-purple-600' : 'text-purple-400'} text-xl animate-pulse`} />
            </div>
            <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>{participants.length}</p>
            <p className={`text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'} font-semibold`}>
              of {maxPlayers} warriors ({registrationPercentage}%)
            </p>
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 hover:border-cyan-500/40' 
            : 'from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50'} backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                {isTeamBased ? '🛡️ Battle Squads' : '🎯 Combat Slots'}
              </h3>
              <FontAwesomeIcon
                icon={isTeamBased ? faUsers : faUser}
                className={`${isLight ? 'text-cyan-600' : 'text-cyan-400'} text-xl animate-pulse`}
              />
            </div>
            <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
              {isTeamBased ? teams.length : availableSlots}
            </p>
            <p className={`text-sm ${isLight ? 'text-cyan-700' : 'text-cyan-300'} font-semibold`}>
              {isTeamBased
                ? `${teamSizeLimit} warriors per squad`
                : `${availableSlots} slots remaining`}
            </p>
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 hover:border-yellow-500/40' 
            : 'from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-500/50'} backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                📊 Battle Readiness
              </h3>
              <FontAwesomeIcon icon={faChartLine} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} text-xl animate-pulse`} />
            </div>
            <div className={`mb-4 h-4 ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded-full overflow-hidden shadow-inner`}>
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-1000 animate-pulse" 
                style={{ width: `${registrationPercentage}%` }}
              ></div>
            </div>
            <p className={`text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'} font-semibold text-center`}>
              🔥 {registrationPercentage}% Battle Ready
            </p>
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-red-500/5 to-pink-500/5 border border-red-500/20 hover:border-red-500/40' 
            : 'from-red-500/10 to-pink-500/10 border border-red-500/30 hover:border-red-500/50'} backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-red-700' : 'text-red-300'}`}>🏆 Battle Mode</h3>
              <FontAwesomeIcon icon={faTrophy} className={`${isLight ? 'text-red-600' : 'text-red-400'} text-xl animate-pulse`} />
            </div>
            <p className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
              {isTeamBased ? '👥 SQUAD WARS' : '⚔️ SOLO COMBAT'}
            </p>
            <p className={`text-sm ${isLight ? 'text-red-700' : 'text-red-300'} font-semibold`}>
              {isTeamBased
                ? `${teamSizeLimit} warriors unite as one`
                : 'Every warrior for themselves'}
            </p>
          </div>
        </div>

        {/* New Layout: Left sidebar for teams, right area for detailed content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Enhanced Left sidebar - Teams list (1/3 width on large screens) */}
          <div className={`lg:w-1/3 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-cyan-600 to-blue-600' 
                : 'from-cyan-400 to-blue-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={isTeamBased ? faUsers : faUser} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                {isTeamBased ? '🛡️ Battle Squads' : '⚔️ Warriors'}
              </h2>
              
              {/* Enhanced Search Input */}
              <div className="relative w-40">
                <input 
                  type="text" 
                  placeholder="🔍 Hunt warriors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 text-sm rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-cyan-500 text-gray-800 placeholder-gray-500 focus:shadow-cyan-400/25' 
                    : 'bg-black/40 backdrop-blur-sm border border-gray-600 focus:border-cyan-500 text-white placeholder-gray-400 focus:shadow-cyan-500/25'} focus:outline-none focus:shadow-lg transition-all duration-300`}
                />
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'} text-sm`}
                />
              </div>
            </div>

            {/* Enhanced Teams List */}
            {filteredTeams.length === 0 ? (
              <div className="h-[400px] overflow-y-auto text-center py-12">
                <div className="relative mb-8">
                  <FontAwesomeIcon icon={isTeamBased ? faUsers : faUser} className={`text-6xl ${isLight ? 'text-gray-400' : 'text-gray-600'} animate-pulse`} />
                  <div className={`absolute -top-2 -right-2 w-6 h-6 ${isLight ? 'bg-red-500' : 'bg-red-500'} rounded-full animate-ping`}></div>
                </div>
                <h3 className={`text-xl font-bold mb-4 ${isLight 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-800' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-600'} bg-clip-text text-transparent`}>
                  {searchTerm
                    ? '🔍 No Warriors Found'
                    : isTeamBased ? '🛡️ No Squads Assembled' : '⚔️ No Warriors Enlisted'}
                </h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'} mb-8 max-w-md mx-auto`}>
                  {searchTerm
                    ? `No squads match "${searchTerm}". Try a different search term.`
                    : 'The battlefield awaits brave warriors to join the epic battle!'}
                </p>
              </div>
            ) : (
              <div className="h-[400px] overflow-y-auto">
                <ul className="space-y-4">
                  {filteredTeams.map((team, index) => {
                    // Safe checks for team data
                    if (!team || typeof team !== 'object') {
                      return null;
                    }
                    
                    const teamId = team.Team_id || team.id || '';
                    const teamNumber = getSafeTeamNumber(team);
                    const members = Array.isArray(team.Members) ? team.Members : [];
                    const memberCount = members.length;
                    // If no members, don't render the team
                    if (memberCount === 0) {
                      return null;
                    }
                    const firstMember = members[0] ? sanitizeUserData(members[0]) : null;
                    const firstMemberName = firstMember ? firstMember.Name : 'Unnamed Player';
                    
                    // Generate a truly unique key for each team
                      // For solo tournaments, always use user_id + participant_id + index for absolute uniqueness
                      let uniqueTeamKey;
                      if (!isTeamBased && firstMember) {
                        // Solo tournament: use user_id + participant_id + index for uniqueness
                        uniqueTeamKey = `team-solo-${firstMember.user_id}-${team.participant_id || 'unknown'}-${index}`;
                      } else if (teamId) {
                        // Team tournament: use team_id + index
                        uniqueTeamKey = `team-${teamId}-${index}`;
                      } else {
                        // Fallback: use multiple identifiers + index
                        uniqueTeamKey = `team-fallback-${team.participant_id || team.user_id || 'unknown'}-${index}`;
                      }
                    
                    return (
                      <li 
                        key={uniqueTeamKey}
                        onClick={() => handleViewTeamDetails(teamId)}
                        className={`group p-4 rounded-xl bg-gradient-to-r ${isLight 
                          ? 'from-gray-100/80 to-gray-200/80 hover:from-cyan-100/80 hover:to-blue-100/80 border border-gray-300/50 hover:border-cyan-400/50' 
                          : 'from-gray-800/40 to-gray-900/40 hover:from-cyan-500/10 hover:to-blue-500/10 border border-gray-700/30 hover:border-cyan-500/50'} cursor-pointer transition-all duration-300 hover:shadow-lg ${isLight ? 'hover:shadow-cyan-400/25' : 'hover:shadow-cyan-500/25'} transform hover:scale-105 backdrop-blur-sm`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className={`font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'} group-hover:text-cyan-600 transition-colors`}>
                              {isTeamBased && teamNumber 
                                ? `🛡️ ${getTeamDisplayName(team)}` 
                                : `⚔️ ${firstMemberName}`}
                            </div>
                            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2 mt-1`}>
                              <FontAwesomeIcon icon={faUsers} className="text-xs" />
                              <span>{memberCount} {memberCount === 1 ? 'warrior' : 'warriors'}</span>
                              {isTeamBased && teamNumber && (
                                <>
                                  <span>•</span>
                                  <span>Squad #{teamNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Squad strength indicator */}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              memberCount >= (teamSizeLimit || 3) 
                                ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400'
                                : isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              <FontAwesomeIcon icon={faShield} className="text-xs" />
                              <span>
                                {memberCount >= (teamSizeLimit || 3) ? 'FULL' : 'RECRUITING'}
                              </span>
                            </div>
                            
                            {/* Member avatars */}
                            <div className="flex -space-x-2">
                              {members.slice(0, 3).map((member, idx) => {
                                if (!member || typeof member !== 'object') {
                                  return null;
                                }
                                
                                const sanitizedMember = sanitizeUserData(member);
                                const memberName = sanitizedMember.Name;
                                const firstLetter = memberName.charAt(0).toUpperCase();
                                const isLeader = sanitizedMember.isLeader || false;
                                
                                return (
                                  <div 
                                    key={idx} 
                                    className={`w-8 h-8 rounded-full ${
                                      isLeader 
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-2 border-yellow-400 shadow-lg shadow-yellow-400/50' 
                                        : isLight 
                                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 border-2 border-white' 
                                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 border-2 border-gray-800'
                                    } flex items-center justify-center text-white font-bold text-sm transform transition-transform group-hover:scale-110 relative`}
                                    title={`${memberName}${isLeader ? ' 👑 Squad Leader' : ''}`}
                                  >
                                    {firstLetter}
                                    {isLeader && (
                                      <div className="absolute -top-1 -right-1 text-yellow-400 animate-pulse">
                                        <FontAwesomeIcon icon={faCrown} className="text-xs" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {memberCount > 3 && (
                                <div className={`w-8 h-8 rounded-full ${isLight 
                                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 border-2 border-white' 
                                  : 'bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-800'} flex items-center justify-center text-white font-bold text-xs`}>
                                  +{memberCount - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Enhanced Right content area - Participants tab (2/3 width on large screens) */}
          <div className={`lg:w-2/3 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-red-600 to-pink-600' 
                : 'from-red-400 to-pink-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faUsers} className={isLight ? 'text-red-600' : 'text-red-400'} />
                ⚔️ All Battle Warriors
              </h2>
            </div>

            {/* Enhanced Participants Table */}
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mb-8">
                  <FontAwesomeIcon icon={faUsers} className={`text-6xl ${isLight ? 'text-gray-400' : 'text-gray-600'} animate-pulse`} />
                  <div className={`absolute -top-2 -right-2 w-6 h-6 ${isLight ? 'bg-red-500' : 'bg-red-500'} rounded-full animate-ping`}></div>
                </div>
                <h3 className={`text-xl font-bold mb-4 ${isLight 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-800' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-600'} bg-clip-text text-transparent`}>
                  {searchTerm
                    ? '🔍 No Warriors Match Your Hunt'
                    : '⚔️ No Warriors Have Enlisted'}
                </h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'} mb-8 max-w-md mx-auto`}>
                  {searchTerm
                    ? `No warriors match "${searchTerm}". Try adjusting your search parameters.`
                    : 'The realm awaits brave souls to join this epic tournament!'}
                </p>
              </div>
            ) : (
              <div className="h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredParticipants.map((participant, participantIndex) => {
                    if (!participant || !participant.User) return null;
                    
                    const sanitizedParticipant = sanitizeUserData(participant.User);
                    const userName = sanitizedParticipant.Name;
                    const userEmail = sanitizedParticipant.email;
                    const userGamerTags = sanitizedParticipant.GamerTag || {};
                    const uniqueParticipantKey = `participant-${sanitizedParticipant.user_id}-${participant.participant_id || participantIndex}`;
                    
                    return (
                      <div
                        key={uniqueParticipantKey}
                        className={`group relative ${isLight 
                          ? 'bg-white/50 hover:bg-white/70 border border-gray-200' 
                          : 'bg-black/50 hover:bg-black/70 border border-gray-700'} rounded-xl p-4 transition-all duration-300 cursor-pointer`}
                        onClick={() => handleViewParticipantDetails(participant)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full ${isLight 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden`}>
                            {sanitizedParticipant.profile_pic_url ? (
                              <ImageWithFallback
                                src={sanitizedParticipant.profile_pic_url}
                                imageKey={sanitizedParticipant.profile_pic_key}
                                alt={userName}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              userName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'} group-hover:text-red-600 transition-colors flex items-center gap-2`}>
                              ⚔️ {userName}
                              <div className={`px-2 py-1 rounded-full text-xs font-bold ${isLight 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-blue-500/20 text-blue-400'}`}>
                                WARRIOR
                              </div>
                            </div>
                            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
                              {Object.entries(userGamerTags).map(([game, tag]) => (
                                <span key={game} className="flex items-center gap-2 mr-3">
                                  <FontAwesomeIcon icon={faGamepad} className="text-xs" />
                                  {game}: @{tag}
                                </span>
                              ))}
                            </div>
                            <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                              📧 {userEmail}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tournament Room Details Section - Non-Bracket Only */}
        {!isBracketTournament && (
          <div className={`mt-8 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
              <div>
                <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight 
                  ? 'from-blue-400/10 to-cyan-400/10 border-blue-400/20' 
                  : 'from-blue-600/20 to-cyan-600/20 border-blue-500/30'} px-6 py-2 rounded-full border mb-4`}>
                  <FontAwesomeIcon icon={faKey} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} animate-pulse`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>TOURNAMENT ROOM</span>
                  <FontAwesomeIcon icon={faKey} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} animate-pulse`} />
                </div>
                
                <h2 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
                  ? 'from-blue-600 via-cyan-600 to-teal-600' 
                  : 'from-blue-400 via-cyan-400 to-teal-400'} bg-clip-text text-transparent mb-4`}>
                  🎮 ROOM MANAGEMENT
                </h2>
                <p className={`text-lg ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  🔧 Configure room access details for all tournament participants
                </p>
              </div>
            </div>

            {/* Room Details Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${isLight 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-blue-500/10 border-blue-500/30'} p-6 rounded-xl border`}>
                <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-blue-800' : 'text-blue-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faKey} />
                  🔑 Room Access Details
                </h3>

                {tournamentRoomError && (
                  <div className={`${isLight 
                    ? 'bg-red-100 border-red-400 text-red-700' 
                    : 'bg-red-500/20 border border-red-500/50 text-red-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                    <span>{tournamentRoomError}</span>
                  </div>
                )}
                
                {tournamentRoomSuccess && (
                  <div className={`${isLight 
                    ? 'bg-green-100 border-green-400 text-green-700' 
                    : 'bg-green-500/20 border border-green-500/50 text-green-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCheck} className="text-xl" />
                    <div>
                      <p className="font-bold">Tournament room details updated successfully!</p>
                      <p className="text-sm">📧 Email notifications sent to all participants</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={tournamentRoomCode}
                      onChange={(e) => setTournamentRoomCode(e.target.value)}
                      placeholder="Enter tournament room/lobby code"
                      className={`w-full p-3 border rounded-lg ${isLight 
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-blue-500' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-blue-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Room Password
                    </label>
                    <input
                      type="text"
                      value={tournamentRoomPassword}
                      onChange={(e) => setTournamentRoomPassword(e.target.value)}
                      placeholder="Enter room password"
                      className={`w-full p-3 border rounded-lg ${isLight 
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-blue-500' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-blue-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </div>

                  <button
                    onClick={handleUpdateTournamentRoom}
                    disabled={updatingTournamentRoom || (!tournamentRoomCode && !tournamentRoomPassword)}
                    className={`w-full py-3 px-4 bg-gradient-to-r ${isLight 
                      ? 'from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500' 
                      : 'from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600'} text-white rounded-lg transition-all duration-300 font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25`}
                  >
                    {updatingTournamentRoom ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faKey} />
                        <span>🔧 Update Room Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Room Details Display */}
              <div className={`${isLight 
                ? 'bg-green-50 border-green-200' 
                : 'bg-green-500/10 border-green-500/30'} p-6 rounded-xl border`}>
                <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-green-800' : 'text-green-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faGamepad} />
                  🎮 Current Room Settings
                </h3>
                
                {(tournament?.Room_Code || tournament?.Room_Password) ? (
                  <div className="space-y-3">
                    {tournament.Room_Code && (
                      <div>
                        <span className={`text-sm font-medium ${isLight ? 'text-green-700' : 'text-green-300'}`}>Room Code:</span>
                        <div className={`mt-1 p-3 ${isLight ? 'bg-white border border-green-300' : 'bg-black/30 border border-green-500/50'} rounded-lg`}>
                          <span className={`font-mono text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            {tournament.Room_Code}
                          </span>
                        </div>
                      </div>
                    )}
                    {tournament.Room_Password && (
                      <div>
                        <span className={`text-sm font-medium ${isLight ? 'text-green-700' : 'text-green-300'}`}>Room Password:</span>
                        <div className={`mt-1 p-3 ${isLight ? 'bg-white border border-green-300' : 'bg-black/30 border border-green-500/50'} rounded-lg`}>
                          <span className={`font-mono text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            {tournament.Room_Password}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`mt-4 p-3 ${isLight ? 'bg-blue-100 border border-blue-300 text-blue-800' : 'bg-blue-500/20 border border-blue-500/50 text-blue-300'} rounded-lg text-sm`}>
                      💡 These details are automatically shared with all tournament participants once they join.
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    <FontAwesomeIcon icon={faInfoCircle} className="text-4xl mb-4" />
                    <p className="text-lg mb-2">No room details configured</p>
                    <p className="text-sm">Add room code and password to help participants join the tournament room.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Non-Bracket Tournament Leaderboard */}
        {!isBracketTournament && (
          <div className={`mt-8 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
              <div>
                <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight 
                  ? 'from-green-400/10 to-emerald-400/10 border-green-400/20' 
                  : 'from-green-600/20 to-emerald-600/20 border-green-500/30'} px-6 py-2 rounded-full border mb-4`}>
                  <FontAwesomeIcon icon={faTrophy} className={`${isLight ? 'text-green-600' : 'text-green-400'} animate-pulse`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-green-700' : 'text-green-300'}`}>TOURNAMENT LEADERBOARD</span>
                  <FontAwesomeIcon icon={faTrophy} className={`${isLight ? 'text-green-600' : 'text-green-400'} animate-pulse`} />
                </div>
                
                <h2 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
                  ? 'from-green-600 via-emerald-600 to-teal-600' 
                  : 'from-green-400 via-emerald-400 to-teal-400'} bg-clip-text text-transparent mb-4`}>
                  🏆 COMPETITION STANDINGS
                </h2>
                <p className={`text-lg ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  {isTeamBased 
                    ? `📊 Manage ${teams.length} competing squads and their battle statistics` 
                    : `📊 Manage ${participants.length} competing warriors and their battle statistics`}
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 mt-6 md:mt-0">
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <input 
                    type="text" 
                    placeholder="🔍 Search teams or warriors..."
                    value={leaderboardSearchTerm}
                    onChange={(e) => setLeaderboardSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl ${isLight 
                      ? 'bg-white/80 border border-gray-300 focus:border-green-500 text-gray-800 placeholder-gray-500 focus:shadow-green-400/25' 
                      : 'bg-black/40 backdrop-blur-sm border border-gray-600 focus:border-green-500 text-white placeholder-gray-400 focus:shadow-green-500/25'} focus:outline-none focus:shadow-lg transition-all duration-300`}
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'} text-sm`}
                  />
                  {leaderboardSearchTerm && (
                    <button
                      onClick={() => setLeaderboardSearchTerm('')}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500 hover:text-red-500' : 'text-gray-400 hover:text-red-400'} transition-colors`}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => window.location.reload()}
                  className={`px-4 py-3 bg-gradient-to-r ${isLight 
                    ? 'from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 text-blue-700 hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:border-blue-500' 
                    : 'from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/50 text-blue-400 hover:from-blue-600 hover:to-cyan-600 hover:text-white hover:border-blue-400'} rounded-xl transition-all duration-300 backdrop-blur-sm font-bold flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25`}
                  title="🔄 Refresh leaderboard data"
                >
                  <FontAwesomeIcon icon={faSync} />
                  <span className="hidden sm:inline">REFRESH</span>
                </button>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
              <table className={`w-full ${isLight ? 'bg-white/50' : 'bg-black/30'} rounded-xl overflow-hidden`}>
                <thead className={`${isLight ? 'bg-gray-200/80' : 'bg-gray-800/80'}`}>
                  <tr>
                    <th className={`px-6 py-4 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>🏆 Position</th>
                    <th className={`px-6 py-4 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {isTeamBased ? '🛡️ Squad' : '⚔️ Warrior'}
                    </th>
                    <th className={`px-6 py-4 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>👥 Members</th>
                    <th className={`px-6 py-4 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>📊 Stats</th>
                    <th className={`px-6 py-4 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>⚙️ Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Helper to get position for team or participant
                    const getPosition = (item) => {
                      if (item.Team_id) {
                        if (typeof item.tournamentPosition === 'number') return item.tournamentPosition;
                        if (typeof item.position === 'number') return item.position;
                        if (item.Members && item.Members.length > 0) {
                          for (const member of item.Members) {
                            if (typeof member.position === 'number') return member.position;
                          }
                        }
                        return null;
                      } else if (item.User) {
                        if (typeof item.tournamentPosition === 'number') return item.tournamentPosition;
                        if (typeof item.position === 'number') return item.position;
                        if (item.User && typeof item.User.position === 'number') return item.User.position;
                        return null;
                      }
                      return null;
                    };
                    // Helper to get display name for sorting fallback
                    const getDisplayName = (item) => {
                      if (item.Team_id) {
                        return getTeamDisplayName(item);
                      } else if (item.User) {
                        return item.User.Name || '';
                      }
                      return '';
                    };
                    // Get the data to display
                    let dataToDisplay = !leaderboardSearchTerm 
                      ? (isTeamBased ? filteredTeams : filteredParticipants)
                      : filteredLeaderboardData;
                    // Sort by position, then by name
                    dataToDisplay = [...dataToDisplay].sort((a, b) => {
                      const posA = getPosition(a);
                      const posB = getPosition(b);
                      if (posA != null && posB != null) {
                        return posA - posB;
                      } else if (posA != null) {
                        return -1;
                      } else if (posB != null) {
                        return 1;
                      } else {
                        return getDisplayName(a).localeCompare(getDisplayName(b));
                      }
                    });
                    return dataToDisplay.map((item, index) => {
                      // Determine if this item is a team or participant
                      const isTeam = item.Team_id ? true : (item.User ? false : isTeamBased);
                      const teamData = isTeam ? item : null;
                      const participantData = !isTeam ? item : null;
                      const displayName = isTeam 
                        ? getTeamDisplayName(teamData)
                        : participantData?.User?.Name || 'Unknown Warrior';
                      const memberCount = isTeam ? (teamData?.Members?.length || 0) : 1;
                      const teamId = isTeam 
                        ? teamData?.Team_id 
                        : `solo-${participantData?.User?.user_id}-${participantData?.participant_id}-leaderboard-${index}`;
                      
                      return (
                        <tr 
                          key={`leaderboard-${teamId || index}`}
                          className={`border-b ${isLight 
                            ? 'border-gray-200 hover:bg-gray-100/50' 
                            : 'border-gray-700 hover:bg-gray-800/50'} transition-colors cursor-pointer`}
                          onClick={() => handleViewTeamStats(isTeam ? teamData : participantData)}
                        >
                          <td className={`px-6 py-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${isLight 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                : 'bg-gradient-to-r from-yellow-600 to-orange-600'} flex items-center justify-center text-white font-bold text-sm`}>
                                {(() => {
                                  const pos = getPosition(item);
                                  return pos != null ? pos : '—';
                                })()}
                              </div>
                              <span className="font-bold">#
                                {(() => {
                                  const pos = getPosition(item);
                                  return pos != null ? pos : (index + 1);
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${isLight 
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold overflow-hidden`}>
                                {(() => {
                                  // For teams, use the first member's profile picture
                                  // For participants, use their profile picture
                                  const userForImage = isTeam 
                                    ? (teamData?.Members && teamData.Members.length > 0 ? teamData.Members[0] : null)
                                    : participantData?.User;
                                  
                                  if (userForImage?.profile_pic_url) {
                                    return (
                                      <ImageWithFallback
                                        src={userForImage.profile_pic_url}
                                        imageKey={userForImage.profile_pic_key}
                                        alt={displayName}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    );
                                  }
                                  return displayName.charAt(0).toUpperCase();
                                })()}
                              </div>
                              <div>
                                <div className="font-bold text-lg">{displayName}</div>
                                {isTeam && teamData?.Team_Number && (
                                  <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Squad #{teamData.Team_Number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${isLight 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-blue-500/20 text-blue-400'}`}>
                              <FontAwesomeIcon icon={faUsers} className="text-xs" />
                              <span>{memberCount} {memberCount === 1 ? 'warrior' : 'warriors'}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${isLight 
                              ? 'bg-gray-100 text-gray-700' 
                              : 'bg-gray-500/20 text-gray-400'}`}>
                              📊 View Stats
                            </div>
                          </td>
                          <td className={`px-6 py-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTeamStats(isTeam ? teamData : participantData);
                              }}
                              className={`px-4 py-2 bg-gradient-to-r ${isLight 
                                ? 'from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500' 
                                : 'from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600'} text-white rounded-lg font-bold flex items-center gap-2 transition-all duration-300 transform hover:scale-105`}
                            >
                              <FontAwesomeIcon icon={faChartLine} />
                              <span>MANAGE</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {(!leaderboardSearchTerm 
              ? (isTeamBased ? filteredTeams : filteredParticipants)
              : filteredLeaderboardData
            ).length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faTrophy} className={`text-6xl ${isLight ? 'text-gray-400' : 'text-gray-600'} mb-4`} />
                <h3 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  No competitors found
                </h3>
                <p className={`${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                  {leaderboardSearchTerm 
                    ? `No ${isTeamBased ? 'squads' : 'warriors'} match "${leaderboardSearchTerm}"`
                    : searchTerm 
                      ? `No ${isTeamBased ? 'squads' : 'warriors'} match "${searchTerm}"`
                      : `No ${isTeamBased ? 'squads' : 'warriors'} have joined this competition yet`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Bracket Tournament Matchups */}
        {isBracketTournament && (
          <div className={`mt-8 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
              <div>
                <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight 
                  ? 'from-orange-400/10 to-red-400/10 border-orange-400/20' 
                  : 'from-orange-600/20 to-red-600/20 border-orange-500/30'} px-6 py-2 rounded-full border mb-4`}>
                  <FontAwesomeIcon icon={faSitemap} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} animate-pulse`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-orange-700' : 'text-orange-300'}`}>TOURNAMENT BRACKET</span>
                  <FontAwesomeIcon icon={faSitemap} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} animate-pulse`} />
                </div>
                
                <h2 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
                  ? 'from-orange-600 via-red-600 to-pink-600' 
                  : 'from-orange-400 via-red-400 to-pink-400'} bg-clip-text text-transparent mb-4`}>
                  ⚔️ BATTLE ARENA
                </h2>
                <p className={`text-lg ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  {Object.keys(matchupsByRound).length === 0 
                    ? '🎮 Configure the battlefield and deploy warriors for epic combat' 
                    : `🏆 ${Object.keys(matchupsByRound).length} round(s) of intense battles configured`}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                <button
                  onClick={fetchMatchups}
                  disabled={isGeneratingMatchups || isDeletingRound}
                  className={`px-4 py-3 bg-gradient-to-r ${isLight 
                    ? 'from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 text-blue-700 hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:border-blue-500' 
                    : 'from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/50 text-blue-400 hover:from-blue-600 hover:to-cyan-600 hover:text-white hover:border-blue-400'} rounded-xl transition-all duration-300 backdrop-blur-sm font-bold flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25`}
                  title="🔄 Refresh battlefield intel"
                >
                  <FontAwesomeIcon icon={faSync} className="animate-spin" />
                  <span className="hidden sm:inline">SYNC</span>
                </button>
                
                {currentRound > 0 && (
                  <button
                    onClick={handleDeleteLatestRound}
                    disabled={isGeneratingMatchups || isDeletingRound}
                    className={`px-4 py-3 bg-gradient-to-r ${isLight 
                      ? 'from-red-500/10 to-pink-500/10 border-2 border-red-500/30 text-red-700 hover:from-red-500 hover:to-pink-500 hover:text-white hover:border-red-500' 
                      : 'from-red-600/20 to-pink-600/20 border-2 border-red-500/50 text-red-400 hover:from-red-600 hover:to-pink-600 hover:text-white hover:border-red-400'} rounded-xl transition-all duration-300 backdrop-blur-sm font-bold flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-red-500/25`}
                    title={`💥 Obliterate ${getRoundDisplayName(currentRound, (matchupsByRound[currentRound]?.length || 0) * 2)}`}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    <span className="hidden sm:inline">DESTROY</span>
                  </button>
                )}
                
                {Object.keys(matchupsByRound).length === 0 ? (
                  <button
                    onClick={handleGenerateInitialMatchups}
                    disabled={isGeneratingMatchups || isDeletingRound}
                    className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${isLight 
                      ? 'from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg hover:shadow-green-400/25' 
                      : 'from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 shadow-lg hover:shadow-green-500/25'} text-white rounded-xl transition-all duration-300 font-bold transform hover:scale-105 ${(isGeneratingMatchups || isDeletingRound) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FontAwesomeIcon icon={faPlay} className="animate-pulse" />
                    <span>🎮 DEPLOY WARRIORS</span>
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateNextRoundMatchups}
                    disabled={isGeneratingMatchups || isDeletingRound}
                    className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${isLight 
                      ? 'from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-lg hover:shadow-orange-400/25' 
                      : 'from-orange-600 to-red-700 hover:from-orange-500 hover:to-red-600 shadow-lg hover:shadow-orange-500/25'} text-white rounded-xl transition-all duration-300 font-bold transform hover:scale-105 ${(isGeneratingMatchups || isDeletingRound) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FontAwesomeIcon icon={faLayerGroup} className="animate-pulse" />
                    <span>🏆 NEXT BATTLE ({getRoundDisplayName(currentRound + 1, Math.ceil(teams.length / Math.pow(2, currentRound + 1)) * 2)})</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Enhanced Matchup Search */}
            {Object.keys(matchupsByRound).length > 0 && (
              <div className="mb-8 mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className={`text-lg font-bold ${isLight ? 'text-gray-800' : 'text-white'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faSearch} className={`${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                    🔍 Battle Search
                  </h3>
                </div>
                <div className="relative max-w-lg">
                  <input 
                    type="text"
                    placeholder="🎯 Hunt for specific squad battles..."
                    value={matchupSearchTerm}
                    onChange={(e) => setMatchupSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-12 py-3 ${isLight 
                      ? 'bg-white/80 border-2 border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:shadow-blue-400/25' 
                      : 'bg-black/40 backdrop-blur-sm border-2 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:shadow-blue-500/25'} rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300 font-medium`}
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                  />
                  {matchupSearchTerm && (
                    <button
                      onClick={() => setMatchupSearchTerm('')}
                      className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500 hover:text-red-500' : 'text-gray-400 hover:text-red-400'} transition-colors`}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
                {matchupSearchTerm && Object.keys(filteredMatchupsByRound).filter(round => 
                  filteredMatchupsByRound[round].length === 0
                ).length === Object.keys(filteredMatchupsByRound).length && (
                  <div className={`mt-4 p-4 rounded-xl bg-gradient-to-r ${isLight 
                    ? 'from-yellow-100 to-orange-100 border border-yellow-300 text-yellow-800' 
                    : 'from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-yellow-300'} flex items-center gap-3`}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                    <div>
                      <p className="font-bold">🎯 No Battle Results</p>
                      <p>No squads match "{matchupSearchTerm}" in the arena. Try different search terms.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {generationError && (
              <div className={`${isLight 
                ? 'bg-red-100 border-2 border-red-400 text-red-700' 
                : 'bg-red-500/20 border-2 border-red-500/50 text-red-300'} p-6 rounded-xl mb-8 flex items-center gap-4 backdrop-blur-sm`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl animate-pulse" />
                <div>
                  <p className="font-bold text-xl mb-2">💥 Arena Malfunction</p>
                  <p className="text-lg">{generationError}</p>
                  <p className="text-sm mt-2 opacity-80">Check your battle configuration and try again</p>
                </div>
              </div>
            )}
            
            {isGeneratingMatchups || isDeletingRound ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F05454]"></div>
              </div>
            ) : Object.keys(matchupsByRound).length === 0 ? (
              <div className="text-center py-12 bg-gray-800 bg-opacity-30 rounded-xl border border-gray-700 border-opacity-30">
                <FontAwesomeIcon icon={faSitemap} className="text-5xl mb-4 text-gray-400" />
                <p className="text-xl font-montserrat mb-4">
                  No matchups have been generated yet
                </p>
                <p className="text-gray-400 max-w-md mx-auto">
                  Click "Generate Initial Matchups" to create the first round of matchups for the tournament
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-8 min-w-max">
                  {Object.keys(matchupsByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(round => {
                    const roundMatchups = filteredMatchupsByRound[round] || [];
                    const isEmpty = roundMatchups.length === 0;
                    
                    return (
                      <div key={round} className="w-72 flex-shrink-0">
                        <h3 className="text-lg font-medium mb-3 text-center bg-[#F05454] py-2 px-2 rounded-t-lg sticky top-0 z-10">
                          {getRoundDisplayName(round, roundMatchups.length * 2)}
                        </h3>
                        <div className="space-y-4 overflow-y-auto h-[450px] px-2">
                          {isEmpty && matchupSearchTerm ? (
                            <div className="text-center py-8 bg-gray-800 bg-opacity-30 rounded-lg border border-gray-700 border-opacity-30">
                              <FontAwesomeIcon icon={faSearch} className="text-2xl mb-3 text-gray-400" />
                              <p className="text-gray-400">
                                No teams matching "{matchupSearchTerm}" found in {getRoundDisplayName(round, roundMatchups.length * 2)}
                              </p>
                            </div>
                          ) : isEmpty ? (
                            <div className="text-center py-8">
                              <p className="text-gray-400">
                                No matchups in {getRoundDisplayName(round, roundMatchups.length * 2)} yet
                              </p>
                            </div>
                          ) : (
                            roundMatchups.map(matchup => {
                              const team1 = findTeamById(matchup.team1_id);
                              const team2 = findTeamById(matchup.team2_id);
                              const team1Name = getSafeTeamName(team1);
                              const team2Name = getSafeTeamName(team2);
                              const isComplete = !!matchup.winner_id;
                              
                              return (
                                <div 
                                  key={`matchup-${matchup.matchup_id}-r${round}`} 
                                  onClick={() => handleViewMatchupDetails(matchup)}
                                  className={`bg-opacity-10 bg-white backdrop-filter backdrop-blur-lg rounded-lg border border-gray-700 border-opacity-30 p-3 cursor-pointer transition-colors hover:border-[#F05454] ${isComplete ? 'border-l-4 border-l-green-500' : ''}`}
                                >
                                  <div className="space-y-3">
                                    <div className={`p-2 rounded ${matchup.winner_id === matchup.team1_id ? 'bg-green-500 bg-opacity-20' : 'bg-gray-700 bg-opacity-20'} flex items-center justify-between`}>
                                      <span className="font-medium">
                                        {team1Name}
                                      </span>
                                      {matchup.winner_id === matchup.team1_id && (
                                        <span className="bg-green-500 bg-opacity-60 text-white text-xs rounded-full px-2 py-0.5">
                                          W
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center justify-center">
                                      <div className="bg-gray-700 h-px w-full"></div>
                                      <span className="mx-2 text-xs">VS</span>
                                      <div className="bg-gray-700 h-px w-full"></div>
                                    </div>
                                    
                                    <div className={`p-2 rounded ${matchup.winner_id === matchup.team2_id ? 'bg-green-500 bg-opacity-20' : 'bg-gray-700 bg-opacity-20'} flex items-center justify-between`}>
                                      <span className="font-medium">
                                        {team2Name}
                                      </span>
                                      {matchup.winner_id === matchup.team2_id && (
                                        <span className="bg-green-500 bg-opacity-60 text-white text-xs rounded-full px-2 py-0.5">
                                          W
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 pt-2 border-t border-gray-700 border-opacity-30 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                      Match #{matchup.matchup_id.slice(-4)}
                                    </span>
                                    {isComplete ? (
                                      <span className="text-xs bg-green-500 bg-opacity-20 text-green-300 px-2 py-1 rounded-full">
                                        Completed
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-yellow-500 bg-opacity-20 text-yellow-300 px-2 py-1 rounded-full">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team/Participant Details Modal */}
      {showTeamDetails && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isLight 
            ? 'bg-white/90' 
            : 'bg-gray-900/90'} rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-blue-600 to-cyan-600' 
                : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faUsers} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                {isTeamBased && selectedTeam.Team_Number 
                  ? `${getTeamDisplayName(selectedTeam)} Details` 
                  : 'Participant Details'}
              </h3>
              <button
                onClick={handleCloseTeamDetails}
                className={`p-2 rounded-xl ${isLight 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-400 hover:bg-gray-800'}`}
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            {/* Team/Participant Info */}
            <div className={`${isLight 
              ? 'bg-white/50 border border-gray-200' 
              : 'bg-black/50 border border-gray-700'} rounded-xl p-4 mb-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-lg font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                    {isTeamBased && selectedTeam.Team_Number 
                      ? getTeamDisplayName(selectedTeam)
                      : 'Participant Information'}
                  </h4>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {isTeamBased ? `${selectedTeam.Members?.length || 0} members` : 'Solo Participant'}
                  </p>
                </div>
                {isTeamBased && selectedTeam.Team_Number && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${isLight 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-blue-500/20 text-blue-400'}`}>
                    Team #{selectedTeam.Team_Number}
                  </div>
                )}
              </div>
              {isTeamBased && selectedTeam.Team_Number && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Team ID</p>
                    <p className="font-mono text-sm">{selectedTeam.Team_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Team Password</p>
                    <p className="font-mono">{selectedTeam.Team_Password || 'Not available'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-3">
              {Array.isArray(selectedTeam.Members) && selectedTeam.Members.map((member, index) => {
                if (!member || typeof member !== 'object') {
                  return null;
                }
                
                const sanitizedMember = sanitizeUserData(member);
                const memberName = sanitizedMember.Name;
                const memberEmail = sanitizedMember.email;
                const memberGamerTags = sanitizedMember.GamerTag || {};
                const memberJoinDate = sanitizedMember.joinDate || new Date();
                const isLeader = sanitizedMember.isLeader || false;
                
                return (
                  <div 
                    key={`member-${sanitizedMember.user_id}-${index}`}
                    className={`${isLight 
                      ? 'bg-white/50 border border-gray-200' 
                      : 'bg-black/50 border border-gray-700'} p-4 rounded-xl flex items-center gap-4`}
                  >
                    <div className={`w-12 h-12 rounded-full ${isLeader 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                      : isLight 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg overflow-hidden`}>
                      {sanitizedMember.profile_pic_url ? (
                        <ImageWithFallback
                          src={sanitizedMember.profile_pic_url}
                          imageKey={sanitizedMember.profile_pic_key}
                          alt={memberName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        memberName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                          {memberName}
                        </span>
                        {isLeader && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
                            👑 LEADER
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>
                        📧 {memberEmail}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(memberGamerTags).map(([game, tag]) => (
                          <span key={game} className="flex items-center gap-1 bg-gray-800/30 px-2 py-1 rounded-full">
                            <FontAwesomeIcon icon={faGamepad} className="text-xs" />
                            <span className="text-xs">{game}: @{tag}</span>
                          </span>
                        ))}
                      </div>
                      {sanitizedMember.participantId && (
                        <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                          📅 Joined: {new Date(memberJoinDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {/* Remove Member Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setConfirmRemoveUser({
                          ...sanitizedMember,
                          teamId: selectedTeam.Team_id,
                          isLeader: isLeader
                        })}
                        className={`p-2 rounded-lg transition-all duration-300 ${isLight 
                          ? 'text-red-600 hover:bg-red-100 border border-red-300 hover:border-red-500' 
                          : 'text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500'} transform hover:scale-105 shadow-lg hover:shadow-red-500/25`}
                        title={`Remove ${memberName} from team`}
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Confirmation Modal for removing team member */}
      {confirmRemoveUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${isLight 
            ? 'bg-white/95 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/95 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl max-w-md w-full`}>
            
            {/* Header with warning icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full ${isLight 
                ? 'bg-red-100' 
                : 'bg-red-500/20'} flex items-center justify-center`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className={`text-2xl ${isLight ? 'text-red-600' : 'text-red-400'} animate-pulse`} />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  ⚠️ Remove Warrior
                </h3>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            {removeUserError && (
              <div className={`${isLight 
                ? 'bg-red-100 border-red-400 text-red-700' 
                : 'bg-red-500/20 border border-red-500/50 text-red-300'} p-4 rounded-xl mb-6 flex items-center gap-3 backdrop-blur-sm`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl animate-pulse" />
                <div>
                  <p className="font-bold">💥 Operation Failed</p>
                  <p className="text-sm">{typeof removeUserError === 'string' ? removeUserError : 'An error occurred'}</p>
                </div>
              </div>
            )}
            
            {/* Member info card */}
            <div className={`${isLight 
              ? 'bg-gray-100/80 border border-gray-200' 
              : 'bg-black/40 border border-gray-700'} p-4 rounded-xl mb-6`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${confirmRemoveUser.isLeader 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                  : isLight 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold overflow-hidden`}>
                  {confirmRemoveUser.profile_pic_url ? (
                    <ImageWithFallback
                      src={confirmRemoveUser.profile_pic_url}
                      imageKey={confirmRemoveUser.profile_pic_key}
                      alt={confirmRemoveUser.Name || 'User'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    (confirmRemoveUser.Name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {confirmRemoveUser.Name || 'Unknown User'}
                    </span>
                    {confirmRemoveUser.isLeader && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
                        👑 LEADER
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    📧 {confirmRemoveUser.email || 'No email'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl mb-6 ${isLight 
              ? 'bg-orange-100/80 border border-orange-200' 
              : 'bg-orange-500/10 border border-orange-500/30'}`}>
              <p className={`${isLight ? 'text-gray-800' : 'text-white'} mb-2`}>
                Are you sure you want to remove <span className="font-bold">⚔️ {confirmRemoveUser.Name || 'this warrior'}</span> from the battle squad?
              </p>
              {confirmRemoveUser.isLeader && (
                <div className={`mt-3 p-3 rounded-lg ${isLight 
                  ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                  : 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faCrown} className="text-lg" />
                  <div>
                    <p className="font-bold text-sm">👑 Leadership Transfer</p>
                    <p className="text-xs">This warrior is the squad leader. Leadership will be automatically transferred to another member if available.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmRemoveUser(null);
                  setRemoveUserError(null);
                }}
                disabled={removeUserLoading}
                className={`px-6 py-3 ${isLight 
                  ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400' 
                  : 'border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500'} rounded-xl transition-all duration-300 font-semibold flex items-center gap-2 transform hover:scale-105`}
              >
                <FontAwesomeIcon icon={faTimes} />
                <span>Cancel</span>
              </button>
              <button
                onClick={() => handleRemoveMember(confirmRemoveUser.user_id, confirmRemoveUser.teamId)}
                disabled={removeUserLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl transition-all duration-300 font-bold flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-red-500/25"
              >
                {removeUserLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrash} />
                    <span>💥 Remove Warrior</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matchup Details Modal */}
      {showMatchupDetails && selectedMatchup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className={`${isLight 
            ? 'bg-white/90 border-gray-300' 
            : 'bg-opacity-10 bg-white border-gray-300 border-opacity-25'} backdrop-filter backdrop-blur-lg rounded-xl p-6 border shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`flex justify-between items-center mb-4 sticky top-0 ${isLight 
              ? 'bg-white/95' 
              : 'bg-opacity-95'} z-10 py-2 -mt-2 -mx-2 px-2 backdrop-blur-md rounded-t-xl`}>
              <h2 className="text-xl font-barlow font-semibold">
                Matchup Details - {getRoundDisplayName(selectedMatchup.round || 1, (matchupsByRound[selectedMatchup.round || 1]?.length || 0) * 2)}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Game Type:</span>
                  <span className={`px-3 py-1 rounded-lg font-bold ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300'}`}>
                    {gameType === 'fps' ? '🎯 FPS (Valorant, CSGO, Apex)' : '⚽ Sports (FIFA, NBA, Rocket League)'}
                  </span>
                </div>
                <button 
                  onClick={handleCloseMatchupDetails}
                  className={`${isLight ? 'text-gray-500 hover:text-gray-800' : 'text-gray-400 hover:text-white'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            {statsError && (
              <div className={`${isLight 
                ? 'bg-red-100 border-red-400 text-red-700' 
                : 'bg-red-500 bg-opacity-20 border border-red-500 text-red-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p>{statsError}</p>
                </div>
              </div>
            )}
            
            {statsSuccess && (
              <div className={`${isLight 
                ? 'bg-green-100 border-green-400 text-green-700' 
                : 'bg-green-500 bg-opacity-20 border border-green-500 text-green-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                <FontAwesomeIcon icon={faCheck} className="text-xl" />
                <p>Player stats saved successfully!</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Matchup Status */}
              <div className={`${isLight 
                ? 'bg-gray-100' 
                : 'bg-opacity-10 bg-white'} p-4 rounded-lg text-center`}>
                <div className="text-lg font-medium mb-2">
                  {selectedMatchup.winner_id ? 'Completed Match' : 'Pending Match'}
                </div>
                <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {selectedMatchup.scheduled_time ? 
                    `Scheduled for ${new Date(selectedMatchup.scheduled_time).toLocaleString()}` : 
                    'No scheduled time set'}
                </div>
              </div>

              {/* Room Details Section */}
              <div className={`${isLight 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-blue-500/10 border-blue-500/30'} p-4 rounded-lg border`}>
                <h3 className={`text-lg font-medium mb-4 ${isLight ? 'text-blue-800' : 'text-blue-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faKey} />
                  Room Details
                </h3>

                {roomUpdateError && (
                  <div className={`${isLight 
                    ? 'bg-red-100 border-red-400 text-red-700' 
                    : 'bg-red-500 bg-opacity-20 border border-red-500 text-red-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                    <span>{roomUpdateError}</span>
                  </div>
                )}
                
                {roomUpdateSuccess && (
                  <div className={`${isLight 
                    ? 'bg-green-100 border-green-400 text-green-700' 
                    : 'bg-green-500 bg-opacity-20 border border-green-500 text-green-300'} p-3 rounded-lg mb-4 flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCheck} className="text-xl" />
                    <span>Room details updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="Enter room/lobby code"
                      className={`w-full p-3 border rounded-lg ${isLight 
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-blue-500' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-blue-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mt-1">
                      Current: {roomCode || 'empty'} | DB: {selectedMatchup?.room_code || 'empty'}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Room Password
                    </label>
                    <input
                      type="text"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Enter room password"
                      className={`w-full p-3 border rounded-lg ${isLight 
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-blue-500' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-blue-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mt-1">
                      Current: {roomPassword || 'empty'} | DB: {selectedMatchup?.room_password || 'empty'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUpdateRoomDetails}
                  disabled={updatingRoomDetails || (!roomCode && !roomPassword)}
                  className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {updatingRoomDetails ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faKey} />
                      <span>Update Room Details</span>
                    </>
                  )}
                </button>

                {(selectedMatchup.room_code || selectedMatchup.room_password) && (
                  <div className={`mt-4 p-3 ${isLight 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-green-500/10 border-green-500/30'} rounded-lg border`}>
                    <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-green-800' : 'text-green-300'}`}>
                      Current Room Details:
                    </h4>
                    <div className="space-y-1 text-sm">
                      {selectedMatchup.room_code && (
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-green-700' : 'text-green-300'}>Code:</span>
                          <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/10 px-2 py-1 rounded`}>
                            {selectedMatchup.room_code}
                          </span>
                        </div>
                      )}
                      {selectedMatchup.room_password && (
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-green-700' : 'text-green-300'}>Password:</span>
                          <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/10 px-2 py-1 rounded`}>
                            {selectedMatchup.room_password}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Teams Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team 1 */}
                <div 
                  className={`${isLight 
                    ? 'bg-gray-100' 
                    : 'bg-opacity-10 bg-white'} p-4 rounded-lg ${selectedMatchup.winner_id === selectedMatchup.team1_id ? isLight ? 'border-2 border-green-500' : 'border-2 border-green-500' : ''}`}
                >
                  <h3 className="font-medium mb-3 flex justify-between items-center">
                    <span>{isTeamBased ? 'Team 1' : 'Player 1'}</span>
                    {selectedMatchup.winner_id === selectedMatchup.team1_id && (
                      <span className="bg-green-500 bg-opacity-20 text-green-300 px-2 py-1 text-xs rounded-full">
                        Winner
                      </span>
                    )}
                  </h3>
                  
                  {(() => {
                    const team = findTeamById(selectedMatchup.team1_id);
                    if (!team) {
                      return <div className="text-center py-2">TBD</div>;
                    }
                    
                    return (
                      <div>
                        <div className="font-bold text-lg mb-2">
                          {getSafeTeamName(team)}
                        </div>
                        <div className="text-sm mb-1">{isTeamBased ? 'Members:' : 'Player:'}</div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {team.Members && team.Members.map((member, index) => {
                            const sanitizedMember = sanitizeUserData(member);
                            return (
                              <div key={`member-${sanitizedMember.user_id}-${index}`}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs overflow-hidden">
                                    {sanitizedMember.profile_pic_url ? (
                                      <ImageWithFallback
                                        src={sanitizedMember.profile_pic_url}
                                        imageKey={sanitizedMember.profile_pic_key}
                                        alt={sanitizedMember.Name}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      sanitizedMember.Name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <span>{sanitizedMember.Name}</span>
                                </div>
                                {/* Player stats inputs */}
                                {!selectedMatchup.winner_id && renderPlayerStats(sanitizedMember)}
                                {/* Show readonly stats if match is completed */}
                                {selectedMatchup.winner_id && renderPlayerStats(sanitizedMember, true)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {!selectedMatchup.winner_id && (
                    <button
                      onClick={() => handleSetMatchupWinner(selectedMatchup.matchup_id, selectedMatchup.team1_id)}
                      className="mt-3 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
                      disabled={submittingStats}
                    >
                      {submittingStats ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCheck} />
                          <span>Set as Winner & Save Stats</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Team 2 */}
                <div 
                  className={`${colors.cardHighlight} p-4 rounded-lg ${selectedMatchup.winner_id === selectedMatchup.team2_id ? 'border-2 border-green-500' : ''}`}
                >
                  <h3 className="font-medium mb-3 flex justify-between items-center">
                    <span>{isTeamBased ? 'Team 2' : 'Player 2'}</span>
                    {selectedMatchup.winner_id === selectedMatchup.team2_id && (
                      <span className="bg-green-500 bg-opacity-20 text-green-300 px-2 py-1 text-xs rounded-full">
                        Winner
                      </span>
                    )}
                  </h3>
                  
                  {(() => {
                    const team = findTeamById(selectedMatchup.team2_id);
                    if (!team) {
                      return <div className="text-center py-2">TBD</div>;
                    }
                    
                    return (
                      <div>
                        <div className="font-bold text-lg mb-2">
                          {getSafeTeamName(team)}
                        </div>
                        <div className="text-sm mb-1">{isTeamBased ? 'Members:' : 'Player:'}</div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {team.Members && team.Members.map((member, index) => {
                            const sanitizedMember = sanitizeUserData(member);
                            return (
                              <div key={`member-${sanitizedMember.user_id}-${index}`}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs overflow-hidden">
                                    {sanitizedMember.profile_pic_url ? (
                                      <ImageWithFallback
                                        src={sanitizedMember.profile_pic_url}
                                        imageKey={sanitizedMember.profile_pic_key}
                                        alt={sanitizedMember.Name}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      sanitizedMember.Name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <span>{sanitizedMember.Name}</span>
                                </div>
                                {/* Player stats inputs */}
                                {!selectedMatchup.winner_id && renderPlayerStats(sanitizedMember)}
                                {/* Show readonly stats if match is completed */}
                                {selectedMatchup.winner_id && renderPlayerStats(sanitizedMember, true)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {!selectedMatchup.winner_id && (
                    <button
                      onClick={() => handleSetMatchupWinner(selectedMatchup.matchup_id, selectedMatchup.team2_id)}
                      className="mt-3 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
                      disabled={submittingStats}
                    >
                      {submittingStats ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCheck} />
                          <span>Set as Winner & Save Stats</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between sticky bottom-0 pt-4 pb-1 bg-opacity-95 z-10 -mb-1 -mx-2 px-6 backdrop-blur-md rounded-b-xl">
              {selectedMatchup.winner_id && (
                <button
                  onClick={() => handleSetMatchupWinner(selectedMatchup.matchup_id, null)}
                  className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition duration-200"
                  disabled={submittingStats}
                >
                  Reset Winner
                </button>
              )}
              <button
                onClick={handleCloseMatchupDetails}
                className={`px-4 py-2 border ${colors.border} rounded-lg hover:${colors.hoverBg} transition duration-200 ml-auto`}
                disabled={submittingStats}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Stats Modal for Non-Bracket Tournaments */}
      {showTeamStatsModal && selectedTeamStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className={`${isLight 
            ? 'bg-white/95 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/95 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                  ? 'from-green-600 to-emerald-600' 
                  : 'from-green-400 to-emerald-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                  <FontAwesomeIcon icon={faTrophy} className={isLight ? 'text-green-600' : 'text-green-400'} />
                  {selectedTeamStats.Members 
                    ? `🛡️ ${getTeamDisplayName(selectedTeamStats)} Statistics`
                    : `⚔️ ${selectedTeamStats.User?.Name || 'Warrior'} Statistics`}
                </h2>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
                  Manage competition statistics and final position
                </p>
              </div>
              <button
                onClick={handleCloseTeamStatsModal}
                className={`p-2 rounded-xl ${isLight 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-400 hover:bg-gray-800'} transition-colors`}
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            {/* Error/Success Messages */}
            {teamStatsError && (
              <div className={`${isLight 
                ? 'bg-red-100 border-red-400 text-red-700' 
                : 'bg-red-500/20 border border-red-500/50 text-red-300'} p-4 rounded-xl mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                <div>
                  <p className="font-bold">Error</p>
                  <p>{teamStatsError}</p>
                </div>
              </div>
            )}
            
            {teamStatsSuccess && (
              <div className={`${isLight 
                ? 'bg-green-100 border-green-400 text-green-700' 
                : 'bg-green-500/20 border border-green-500/50 text-green-300'} p-4 rounded-xl mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faCheck} className="text-xl" />
                <p className="font-bold">Statistics updated successfully!</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Position Section */}
              <div className={`${isLight 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-yellow-500/10 border-yellow-500/30'} p-6 rounded-xl border`}>
                <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-yellow-800' : 'text-yellow-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faTrophy} />
                  🏆 Final Competition Position
                </h3>
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    Position in Tournament
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={teamPosition}
                    onChange={(e) => setTeamPosition(e.target.value)}
                    placeholder="Enter final position (1st, 2nd, 3rd...)"
                    className={`w-full p-3 border rounded-lg ${isLight 
                      ? 'bg-white border-gray-300 text-gray-800 focus:border-yellow-500' 
                      : 'bg-gray-800 border-gray-600 text-white focus:border-yellow-400'} focus:outline-none focus:ring-2 focus:ring-yellow-500/20`}
                  />
                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>
                    💡 Enter 1 for 1st place, 2 for 2nd place, etc.
                  </p>
                </div>
              </div>

              {/* Game Type Display (read-only, from tournament) */}
              <div className={`${isLight 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-blue-500/10 border-blue-500/30'} p-6 rounded-xl border`}>
                <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-blue-800' : 'text-blue-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faGamepad} />
                  🎮 Game Type
                </h3>
                <div className={`px-4 py-3 rounded-lg ${isLight 
                  ? 'bg-white border-gray-300 text-gray-800' 
                  : 'bg-gray-800 border-gray-600 text-white'} border`}>
                  {gameType === 'fps' ? '🎯 FPS (Valorant, CSGO, Apex)' : '⚽ Sports (FIFA, NBA, Rocket League)'}
                </div>
              </div>
            </div>

            {/* Player Statistics Section */}
            <div className={`mt-6 ${isLight 
              ? 'bg-gray-50 border-gray-200' 
              : 'bg-gray-500/10 border-gray-500/30'} p-6 rounded-xl border`}>
              <h3 className={`text-lg font-bold mb-6 ${isLight ? 'text-gray-800' : 'text-white'} flex items-center gap-2`}>
                <FontAwesomeIcon icon={faChartLine} />
                📊 Player Statistics
              </h3>

              <div className="space-y-6">
                {selectedTeamStats.Members ? (
                  // Team with multiple members
                  selectedTeamStats.Members.map((member, index) => {
                    const sanitizedMember = sanitizeUserData(member);
                    return (
                      <div key={`stats-${sanitizedMember.user_id}-${index}`} 
                           className={`${isLight 
                             ? 'bg-white border-gray-200' 
                             : 'bg-black/40 border-gray-700'} p-4 rounded-xl border`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-full ${isLight 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold overflow-hidden`}>
                            {sanitizedMember.profile_pic_url ? (
                              <ImageWithFallback
                                src={sanitizedMember.profile_pic_url}
                                imageKey={sanitizedMember.profile_pic_key}
                                alt={sanitizedMember.Name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              sanitizedMember.Name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                              {sanitizedMember.Name}
                            </div>
                            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {sanitizedMember.email}
                            </div>
                          </div>
                        </div>
                        {renderPlayerStats(sanitizedMember)}
                      </div>
                    );
                  })
                ) : selectedTeamStats.User ? (
                  // Single participant
                  <div className={`${isLight 
                    ? 'bg-white border-gray-200' 
                    : 'bg-black/40 border-gray-700'} p-4 rounded-xl border`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full ${isLight 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold overflow-hidden`}>
                        {selectedTeamStats.User.profile_pic_url ? (
                          <ImageWithFallback
                            src={selectedTeamStats.User.profile_pic_url}
                            imageKey={selectedTeamStats.User.profile_pic_key}
                            alt={selectedTeamStats.User.Name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          selectedTeamStats.User.Name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                          {selectedTeamStats.User.Name}
                        </div>
                        <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {selectedTeamStats.User.email}
                        </div>
                      </div>
                    </div>
                    {renderPlayerStats(sanitizeUserData(selectedTeamStats.User))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>No player data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-300/50">
              <button
                onClick={handleCloseTeamStatsModal}
                disabled={updatingTeamStats}
                className={`px-6 py-3 ${isLight 
                  ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100' 
                  : 'border-2 border-gray-600 text-gray-300 hover:bg-gray-800'} rounded-xl transition-all duration-300 font-semibold`}
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Cancel
              </button>
              <button
                onClick={handleUpdateTeamStats}
                disabled={updatingTeamStats}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white rounded-xl transition-all duration-300 font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
              >
                {updatingTeamStats ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} />
                    <span>💾 Save Statistics</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsole; 