"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import { ThemeContext } from "../context/ThemeContext"
import { useNavigate, useParams } from "react-router-dom"
import Navbar from "../components/navbar"
import ImageWithFallback from "../components/ImageWithFallback"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faGamepad,
  faUsers,
  faChartLine,
  faArrowLeft,
  faSpinner,
  faUserFriends,
  faMedal,
  faUserShield,
  faTrash,
  faExclamationTriangle,
  faTimes,
  faSync,
  faInfoCircle,
  faCrown,
  faBullseye,
  faRocket,
  faGem,
  faShield,
  faSkull,
  faTrophy,
  faSearch,
} from "@fortawesome/free-solid-svg-icons"

const TournamentStats = () => {
  const { tournamentId } = useParams()
  const { colors, theme } = useContext(ThemeContext)
  const isLight = theme === 'light'
  const navigate = useNavigate()

  // State variables
  const [tournament, setTournament] = useState(null)
  const [participationInfo, setParticipationInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamData, setTeamData] = useState(null)
  const [matchups, setMatchups] = useState([])
  const [pastMatchups, setPastMatchups] = useState([])
  const [upcomingMatchups, setUpcomingMatchups] = useState([])
  const [matchStats, setMatchStats] = useState({ wins: 0, losses: 0, winRate: 0 })
  const [stats, setStats] = useState(null)
  const [confirmRemoveUser, setConfirmRemoveUser] = useState(null)
  const [removeUserLoading, setRemoveUserLoading] = useState(false)
  const [removeUserError, setRemoveUserError] = useState(null)
  const [refreshingTeam, setRefreshingTeam] = useState(false)
  const [confirmLeaveTeam, setConfirmLeaveTeam] = useState(false)
  const [leavingTeam, setLeavingTeam] = useState(false)
  const [leaveTeamError, setLeaveTeamError] = useState(null)

  // Non-bracket tournament states
  const [selectedTeamStats, setSelectedTeamStats] = useState(null)
  const [showTeamStatsModal, setShowTeamStatsModal] = useState(false)
  const [playerStats, setPlayerStats] = useState({})
  const [gameType, setGameType] = useState('fps')
  const [leaderboardSearchTerm, setLeaderboardSearchTerm] = useState('')
  const [filteredLeaderboardData, setFilteredLeaderboardData] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [allParticipants, setAllParticipants] = useState([])
  const [isTeamBased, setIsTeamBased] = useState(true)
  const [userTournamentPosition, setUserTournamentPosition] = useState(null)
  const [userTournamentStats, setUserTournamentStats] = useState(null)

  // Bracket tournament specific states
  const [isBracketTournament, setIsBracketTournament] = useState(false)
  const [tournamentMatchups, setTournamentMatchups] = useState([])
  const [matchupsByRound, setMatchupsByRound] = useState({})
  const [currentRound, setCurrentRound] = useState(0)
  const [matchupSearchTerm, setMatchupSearchTerm] = useState("")
  const [filteredMatchupsByRound, setFilteredMatchupsByRound] = useState({})
  const [refreshingMatchups, setRefreshingMatchups] = useState(false)

  const fetchUserTeam = async () => {
    try {
      setRefreshingTeam(true)
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return null
      }

      const teamResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/participants/tournament/${tournamentId}/team`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (teamResponse.data?.status === "success" && teamResponse.data.data?.team) {
        const teamData = teamResponse.data.data.team
        

        // Save full team data for use in the component
        setTeamData(teamData)

        // Check for Members array specifically, not team_members (API structure change)
        if (Array.isArray(teamData.Members)) {

          // Ensure all team members have valid primitive properties
          const validatedMembers = teamData.Members.map((member) => {
            if (!member || typeof member !== "object") {
              return { user_id: "unknown", Name: "Unknown", isLeader: false }
            }

            // Create a new object with only primitive values
            return {
              user_id: typeof member.user_id === "string" ? member.user_id : "unknown",
              Name: typeof member.Name === "string" ? member.Name : "Unknown",
              GamerTag: typeof member.GamerTag === "string" ? member.GamerTag : "",
              email: typeof member.email === "string" ? member.email : "",
              profile_pic_url: member.profile_pic_url || null,
              isLeader: Boolean(member.isLeader),
            }
          })

          setTeamMembers(validatedMembers)
        } else {
          console.warn("No team members array found in response")
          setTeamMembers([])
        }

        // Return the team data for immediate use
        return teamData
      } else {
        console.warn("Team data structure not as expected:", teamResponse.data)
        setTeamData(null)
        setTeamMembers([])
        return null
      }
    } catch (error) {
      console.error("Error fetching user team:", error)
      
      setTeamData(null)
      setTeamMembers([])
      return null
    } finally {
      setRefreshingTeam(false)
    }
  }

  // Fetch all teams and participants for the leaderboard
  const fetchAllTeamsAndParticipants = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        navigate("/login")
        return
      }

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/teams`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data && response.data.data) {
        // Ensure teams is an array before setting
        const teamsData = Array.isArray(response.data.data.teams) 
          ? response.data.data.teams 
          : []
        // Ensure participants is an array before setting
        const participantsData = Array.isArray(response.data.data.participants) 
          ? response.data.data.participants 
          : []

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

        setAllTeams(teamsData)
        setAllParticipants(participantsData)
        setIsTeamBased(response.data.data.isTeamBased)
        
        
      }
    } catch (error) {
      console.error("Error fetching all teams and participants:", error)
    }
  }

  // Fetch user's tournament stats and position for non-bracket tournaments
  const fetchUserTournamentStats = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        navigate("/login")
        return
      }

      // Get user IDs for the current team/participant
      const userIds = []
      if (teamData && teamData.Members) {
        teamData.Members.forEach(member => {
          if (member && member.user_id) {
            userIds.push(member.user_id)
          }
        })
      } else if (participationInfo && participationInfo.participationType === 'individual') {
        // For individual participants, we need to get the current user's ID
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        if (currentUser.user_id) {
          userIds.push(currentUser.user_id)
        }
      }

      if (userIds.length > 0) {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/game-stats/tournament/${tournamentId}/non-bracket`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            params: { userIds: userIds.join(',') }
          }
        )

        if (response.data && response.data.status === 'success' && response.data.data.stats) {
          const stats = response.data.data.stats
          
          // Calculate aggregated stats and get position
          let aggregatedStats = {}
          let position = null
          
          stats.forEach(stat => {
            if (stat.position && !position) {
              position = stat.position
            }
            
            if (stat.stats) {
              Object.keys(stat.stats).forEach(key => {
                if (!aggregatedStats[key]) aggregatedStats[key] = 0
                aggregatedStats[key] += stat.stats[key]
              })
            }
          })
          
          setUserTournamentPosition(position)
          setUserTournamentStats(aggregatedStats)
          
        }
      }
    } catch (error) {
      console.error("Error fetching user tournament stats:", error)
    }
  }

  useEffect(() => {
    const fetchTournamentAndParticipation = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")

        if (!token) {
          navigate("/login")
          return
        }

        // Fetch tournament details
        const tournamentResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        // Fetch participation status
        const participationResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/participants/tournament/${tournamentId}/check`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (tournamentResponse.data?.data) {
          const tournamentData = tournamentResponse.data.data
          setTournament(tournamentData)
          // Check if it's a bracket tournament
          setIsBracketTournament(tournamentData.Is_Bracket_Competition)
        } else {
          setError("Tournament not found")
        }

        if (participationResponse.data?.data) {
          const participationData = participationResponse.data.data

          // Ensure isTeamLeader is always a boolean
          if (participationData.participationType === "team") {
            // Use explicit boolean value for isTeamLeader, checking multiple possible fields
            participationData.isTeamLeader = Boolean(participationData.isTeamLeader || participationData.teamLeader)
          }

          setParticipationInfo(participationData)

          // If not participating, redirect to tournament details
          if (!participationData.isParticipating) {
            navigate(`/tournaments/${tournamentId}`)
            return
          }

          // Fetch tournament stats (available slots, etc.) similar to admin console
          const statsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/admin-console/tournament/${tournamentId}/stats`,
            { headers: { Authorization: `Bearer ${token}` } },
          )

          if (statsResponse.data?.data) {
            const statsData = statsResponse.data.data
            setStats(statsData)
          }

          // Fetch user's team data using our new endpoint
          const teamData = await fetchUserTeam()

          // Fetch all teams and participants for leaderboard
          await fetchAllTeamsAndParticipants()

          // For non-bracket tournaments, fetch user's tournament stats and position
          if (!isBracketTournament) {
            await fetchUserTournamentStats()
          }

          // Fetch team matchups
          if (teamData.Team_id) {
            try {
              const matchupsResponse = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}/team/${teamData.Team_id}`,
                { headers: { Authorization: `Bearer ${token}` } },
              )

              if (matchupsResponse.data?.data) {
                const matchupData = matchupsResponse.data.data
                setMatchups(matchupData.matchups || [])
                setPastMatchups(matchupData.pastMatchups || [])
                setUpcomingMatchups(matchupData.upcomingMatchups || [])
                setMatchStats(matchupData.stats || { wins: 0, losses: 0, winRate: 0 })
              }
            } catch (matchupsError) {
              console.error("Error fetching matchups:", matchupsError)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error.response?.data?.message || "An error occurred while fetching data")
      } finally {
        setLoading(false)
      }
    }

    fetchTournamentAndParticipation()
  }, [tournamentId, navigate, isBracketTournament])

  // Fetch matchups when isBracketTournament changes
  useEffect(() => {
    if (isBracketTournament) {
      fetchTournamentMatchups()
    }
  }, [isBracketTournament, tournamentId])

  // Fetch user tournament stats when teamData changes for non-bracket tournaments
  useEffect(() => {
    if (!isBracketTournament && teamData && tournamentId) {
      fetchUserTournamentStats()
    }
  }, [teamData, isBracketTournament, tournamentId])

  // Handle member removal
  const handleRemoveMember = async (userId) => {
    try {
      setRemoveUserLoading(true)
      setRemoveUserError(null)

      // Validate the userId
      if (!userId || typeof userId !== "string") {
        setRemoveUserError("Invalid user ID")
        return
      }

      const token = localStorage.getItem("token")
      if (!token) {
        navigate("/login")
        return
      }


      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/participants/tournament/${tournamentId}/member`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            memberId: userId,
          },
        },
      )

      if (response.data?.status === "success") {
        // Show success message
        alert("Team member removed successfully!")
        // Refresh team data after successful removal
        await fetchUserTeam()
        setConfirmRemoveUser(null)
      } else {
        console.warn("Unexpected response format:", response.data)
        setRemoveUserError("Unexpected response format from server")
      }
    } catch (error) {
      console.error("Error removing team member:", error)
      // Extract error message from response if available
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "Failed to remove team member"
      setRemoveUserError(errorMessage)
    } finally {
      setRemoveUserLoading(false)
    }
  }

  // Handle leaving team
  const handleLeaveTeam = async () => {
    try {
      setLeavingTeam(true)
      setLeaveTeamError(null)

      const token = localStorage.getItem("token")
      if (!token) {
        navigate("/login")
        return
      }


      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/participants/tournament/${tournamentId}/leave`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (response.data?.status === "success") {

        // Show success message
        alert("You have successfully left the team!")

        // After leaving the team, redirect to tournament details page
        navigate(`/tournaments/${tournamentId}`)
      } else {
        console.warn("Unexpected response format:", response.data)
        setLeaveTeamError("Unexpected response format from server")
      }
    } catch (error) {
      console.error("Error leaving team:", error)
      // Extract error message from response if available
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to leave team"
      setLeaveTeamError(errorMessage)
    } finally {
      setLeavingTeam(false)
      setConfirmLeaveTeam(false)
    }
  }

  // Safe string for team numbers
  const getSafeTeamNumber = (team) => {
    if (!team) return ""
    return typeof team.Team_Number === "number" || typeof team.Team_Number === "string" ? `${team.Team_Number}` : ""
  }

  // Helper function to safely handle user data - similar to AdminConsole
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

    // Handle enhanced user data from backend (has user_id, Name, etc.)
    if (user.user_id && user.Name) {
      return {
        ...user,
        Name: user.Name,
        email: user.email || '',
        GamerTag: user.GamerTag || {},
        user_id: user.user_id,
        profile_pic_url: user.profile_pic || user.profile_pic_url || null,
        profile_pic_key: user.profile_pic_key || null
      };
    }

    // Handle raw team_members data (has id, leader fields)
    if (user.id) {
      // This is raw team_members data, we need to fetch user details
      // For now, return a placeholder - this should not be used for display
      return {
        Name: 'Unknown User',
        email: '',
        GamerTag: {},
        user_id: user.id,
        profile_pic_url: null,
        profile_pic_key: null
      };
    }

    // Fallback for other data structures
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

  // Safe team name display - updated to handle solo tournaments
  const getTeamDisplayName = useCallback((team) => {
    
    if (!team) {
      return "Unknown Team"
    }


    // For solo tournaments, show the username of the first member
    // Check both Members (enhanced by backend) and team_members (raw data) arrays
    const members = team.Members || team.team_members || [];
    
    
    // Check if this is a solo tournament (either by isTeamBased flag or Team_Size_Limit)
    const isSoloTournament = !isTeamBased || (tournament && tournament.Team_Size_Limit === 1);
    console.log("getTeamDisplayName - isSoloTournament:", isSoloTournament);
    
    if (isSoloTournament && members.length > 0) {
      console.log("getTeamDisplayName - processing first member:", members[0]);
      
      // If Members array exists (enhanced by backend), use it directly
      if (team.Members && team.Members.length > 0) {
        const firstMember = team.Members[0];
        console.log("Using enhanced Members array - first member:", firstMember);
        return firstMember.Name || "Unknown Player";
      }
      
      // Otherwise, use team_members array and sanitize it
      const firstMember = sanitizeUserData(members[0]);
      console.log("Solo tournament - using first member name:", firstMember.Name);
      return firstMember.Name || "Unknown Player";
    }

    // Use Team_Name if available (check both uppercase and lowercase versions)
    if (team.Team_Name) {
      console.log("Using Team_Name:", team.Team_Name)
      return team.Team_Name
    }

    // Check for lowercase variant (team_name)
    if (team.team_name) {
      console.log("Using team_name (lowercase):", team.team_name)
      return team.team_name
    }

    // Fall back to team number for team-based tournaments
    const teamNumber = getSafeTeamNumber(team)
    if (teamNumber) {
      console.log("Falling back to Team_Number:", teamNumber)
      return `Team #${teamNumber}`
    }

    // Last resort
    console.log("Using last resort team ID:", team.Team_id)
    return `Team ${team.Team_id ? team.Team_id.slice(-4) : "Unknown"}`
  }, [isTeamBased, tournament])

  // Helper function to get opponent name - updated to handle solo tournaments
  const getOpponentName = (matchup) => {
    // Early exit if data is missing
    if (!teamData || !matchup) return "TBD"

    try {
      // Get the reference to the current team's ID from teamData
      const currentTeamId = teamData.Team_id
      console.log("Current team ID:", currentTeamId)
      console.log("Matchup:", matchup)

      // If no current team ID, return TBD
      if (!currentTeamId) return "TBD"

      // Compare with player1/player2 or team1Id/team2Id fields
      // First check if we're player1 (using multiple possible field names)
      if (matchup.player1 === currentTeamId || matchup.team1Id === currentTeamId) {
        // We're player1, so get opponent from Team2/player2
        console.log("We are player1, opponent is Team2")

        // Check if we have Team2 object
        if (matchup.Team2) {
          return getTeamDisplayName(matchup.Team2)
        }

        // Check if we have team2 name directly
        if (matchup.team2Name) return matchup.team2Name

        // Otherwise return TBD
        return "TBD"
      }
      // Check if we're player2
      else if (matchup.player2 === currentTeamId || matchup.team2Id === currentTeamId) {
        // We're player2, so get opponent from Team1/player1
        console.log("We are player2, opponent is Team1")

        // Check if we have Team1 object
        if (matchup.Team1) {
          return getTeamDisplayName(matchup.Team1)
        }

        // Check if we have team1 name directly
        if (matchup.team1Name) return matchup.team1Name

        // Otherwise return TBD
        return "TBD"
      }
      // We don't seem to be either player - this is unexpected
      else {
        console.warn("Team ID not found in matchup players:", {
          matchup,
          currentTeamId: teamData.Team_id,
        })
        return "Unknown Team"
      }
    } catch (err) {
      console.error("Error formatting opponent name:", err, { matchup })
      return "Unknown Team"
    }
  }

  // Format participant counts and ratios
  const getParticipantStats = () => {
    if (!stats) return { count: 0, max: 0, percentage: 0, available: 0 }

    // Ensure we're returning primitive numbers only
    const count = typeof stats.totalParticipants === "number" ? stats.totalParticipants : 0
    const max = typeof stats.maxPlayers === "number" ? stats.maxPlayers : 0
    const percentage = typeof stats.registrationPercentage === "number" ? stats.registrationPercentage : 0
    const available = typeof stats.availableSlots === "number" ? stats.availableSlots : 0

    return { count, max, percentage, available }
  }

  // Function to fetch tournament matchups
  const fetchTournamentMatchups = async () => {
    try {
      setRefreshingMatchups(true)
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/login")
        return
      }

      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data && response.data.status === "success") {
        const data = response.data.data

        // Check if the matchups data is in the expected structure
        const matchupsData = data.matchups || []

        if (Array.isArray(matchupsData)) {
          setTournamentMatchups(matchupsData)

          // Organize matchups by round
          const byRound = {}
          let maxRound = 0

          matchupsData.forEach((matchup) => {
            // Using round_tag from controller instead of round
            const round = matchup.round_tag || 1
            if (!byRound[round]) {
              byRound[round] = []
            }

            // Process team data
            const team1 = matchup.Team1 || null
            const team2 = matchup.Team2 || null

            byRound[round].push({
              matchup_id: matchup.matchup_id,
              team1_id: matchup.player1,
              team2_id: matchup.player2,
              winner_id: matchup.winner,
              round: round,
              scheduled_time: matchup.scheduled_time,
              Team1: team1,
              Team2: team2,
            })

            if (round > maxRound) {
              maxRound = round
            }
          })

          setMatchupsByRound(byRound)
          setFilteredMatchupsByRound(byRound)
          setCurrentRound(maxRound)
          console.log("Matchups by round:", byRound)
        } else {
          console.log("Matchups data is not an array:", matchupsData)
          setTournamentMatchups([])
          setMatchupsByRound({})
          setCurrentRound(0)
        }
      } else {
        console.log("Unexpected response structure:", response.data)
        setTournamentMatchups([])
        setMatchupsByRound({})
        setCurrentRound(0)
      }
    } catch (error) {
      console.error("Error fetching tournament matchups:", error)
      setTournamentMatchups([])
      setMatchupsByRound({})
      setCurrentRound(0)
    } finally {
      setRefreshingMatchups(false)
    }
  }

  // Find team information by ID
  const findTeamById = useCallback(
    (teamId) => {
      if (!teamId) return null

      // If it's our own team, return our team data
      if (teamData && teamData.Team_id === teamId) {
        return teamData
      }

      // If we have a matchup list with team information, try to extract team from there
      for (const round in matchupsByRound) {
        for (const matchup of matchupsByRound[round]) {
          if (matchup.team1_id === teamId && matchup.Team1) {
            return matchup.Team1
          }
          if (matchup.team2_id === teamId && matchup.Team2) {
            return matchup.Team2
          }
        }
      }

      // If nothing found, return a placeholder with the id
      return {
        Team_id: teamId,
        Team_Number: teamId.slice(-4), // Use last 4 characters of ID as a number
        Members: [],
      }
    },
    [teamData, matchupsByRound],
  )

  // Get safe team name
  const getSafeTeamName = useCallback(
    (team) => {
      if (!team) return "TBD"

      return getTeamDisplayName(team)
    },
    [getTeamDisplayName],
  )

  // Handle matchup search
  useEffect(() => {
    if (!matchupSearchTerm.trim()) {
      setFilteredMatchupsByRound(matchupsByRound)
      return
    }

    const searchTermLower = matchupSearchTerm.toLowerCase()
    const filtered = { ...matchupsByRound } // Clone to preserve all rounds

    // Go through each round and filter its matchups
    Object.keys(filtered).forEach((round) => {
      const roundMatchups = matchupsByRound[round].filter((matchup) => {
        const team1 = findTeamById(matchup.team1_id)
        const team2 = findTeamById(matchup.team2_id)

        // Get team names for searching
        const team1Name = getSafeTeamName(team1).toLowerCase()
        const team2Name = getSafeTeamName(team2).toLowerCase()

        // Get team numbers as strings for searching
        const team1Number = team1?.Team_Number?.toString() || ""
        const team2Number = team2?.Team_Number?.toString() || ""

        // Match if either team name or team number contains the search term
        return (
          team1Name.includes(searchTermLower) ||
          team2Name.includes(searchTermLower) ||
          team1Number.includes(searchTermLower) ||
          team2Number.includes(searchTermLower)
        )
      })

      // Update the filtered matchups for this round
      filtered[round] = roundMatchups
    })

    setFilteredMatchupsByRound(filtered)
  }, [matchupSearchTerm, matchupsByRound, findTeamById, getSafeTeamName])

  // Helper function to get match result text
  const getMatchResult = (matchup) => {
    if (!participationInfo || !matchup.winner) return "Pending"

    const isWinner = matchup.winner === participationInfo.teamId
    return isWinner ? "Win" : "Loss"
  }

  // Handle viewing team stats for non-bracket tournaments
  const handleViewTeamStats = async (teamOrParticipant) => {
    try {
      setSelectedTeamStats(teamOrParticipant)
      setShowTeamStatsModal(true)
      
      // Reset player stats
      setPlayerStats({})
      
      // Get all user IDs for this team/participant
      const userIds = []
      if (teamOrParticipant.Members) {
        // Team with multiple members
        teamOrParticipant.Members.forEach(member => {
          if (member && member.user_id) {
            userIds.push(member.user_id)
          }
        })
      } else if (teamOrParticipant.User) {
        // Single participant
        if (teamOrParticipant.User.user_id) {
          userIds.push(teamOrParticipant.User.user_id)
        }
      }
      
      // Initialize with default stats first
      const initialStats = {}
      userIds.forEach(userId => {
        initialStats[userId] = getDefaultStats(gameType)
      })
      setPlayerStats(initialStats)
      
      // Try to fetch existing stats and position from backend
      if (userIds.length > 0) {
        try {
          const token = localStorage.getItem('token')
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/game-stats/tournament/${tournamentId}/non-bracket`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              params: { userIds: userIds.join(',') }
            }
          )
          
          if (response.data && response.data.status === 'success' && response.data.data.stats) {
            const existingStats = response.data.data.stats
            console.log('Fetched existing non-bracket stats:', existingStats)
            
            // Update player stats with existing data
            const updatedStats = { ...initialStats }
            let foundPosition = null
            
            existingStats.forEach(stat => {
              if (stat.user_id && stat.stats) {
                updatedStats[stat.user_id] = stat.stats
              }
              // Get position from any of the stats (they should all have the same position for team members)
              if (stat.position && !foundPosition) {
                foundPosition = stat.position
              }
            })
            
            setPlayerStats(updatedStats)
            
            // Store the position in the selectedTeamStats for display
            if (foundPosition) {
              setSelectedTeamStats(prev => ({
                ...prev,
                tournamentPosition: foundPosition
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching existing stats:', error)
          // Continue with default stats if fetching fails
        }
      }
      
    } catch (error) {
      console.error('Error opening team stats:', error)
    }
  }

  // Close team stats modal
  const handleCloseTeamStatsModal = () => {
    setShowTeamStatsModal(false)
    setSelectedTeamStats(null)
    setPlayerStats({})
  }

  // Get default stats object based on game type
  const getDefaultStats = (gameType) => {
    if (gameType === 'fps') {
      return { kills: 0, deaths: 0, assists: 0, headshots: 0 }
    } else if (gameType === 'sports') {
      return { goals: 0, assists: 0, saves: 0 }
    }
    return {}
  }

  // Handle leaderboard search functionality
  useEffect(() => {
    if (!leaderboardSearchTerm.trim()) {
      // If no search term, show all data
      if (isBracketTournament) {
        setFilteredLeaderboardData([]);
      } else {
        // For non-bracket tournaments, show all teams and participants
        const allData = [];
        
        // Add all teams
        if (allTeams && allTeams.length > 0) {
          allData.push(...allTeams);
        }
        
        // Add solo participants (those not in teams)
        if (allParticipants && allParticipants.length > 0) {
          allData.push(...allParticipants);
        }
        
        setFilteredLeaderboardData(allData);
      }
    } else {
      const searchTermLower = leaderboardSearchTerm.toLowerCase();
      const filteredData = [];
      
      // Only filter teams, not individual participants
      if (allTeams && allTeams.length > 0) {
        const matchingTeams = allTeams.filter(team => {
          const teamName = getTeamDisplayName(team).toLowerCase();
          const teamNumber = team.Team_Number ? team.Team_Number.toString() : '';
          
          // Check if team name or number matches
          if (teamName.includes(searchTermLower) || teamNumber.includes(searchTermLower)) {
            return true;
          }
          
          // Also check if any team member matches, but still only show the team
          if (team.Members && team.Members.length > 0) {
            return team.Members.some(member => {
              if (!member || typeof member !== 'object') return false;
              const memberName = (member.Name || '').toLowerCase();
              const memberEmail = (member.email || '').toLowerCase();
              return memberName.includes(searchTermLower) || memberEmail.includes(searchTermLower);
            });
          }
          
          return false;
        });
        
        filteredData.push(...matchingTeams);
      }
      
      setFilteredLeaderboardData(filteredData);
    }
  }, [leaderboardSearchTerm, allTeams, allParticipants, isBracketTournament, getTeamDisplayName]);

  // Render player stats (read-only for users)
  const renderPlayerStats = (player, readOnly = true) => {
    const userId = player.user_id
    const currentStats = playerStats[userId] || getDefaultStats(gameType)
    
    if (gameType === 'fps') {
      return (
        <div className={`mt-2 ${isLight 
          ? 'bg-gray-200/50' 
          : 'bg-gray-800 bg-opacity-50'} p-2 rounded`}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>🎯 Kills:</span>
              <span className="font-bold">{currentStats.kills || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>💀 Deaths:</span>
              <span className="font-bold">{currentStats.deaths || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🤝 Assists:</span>
              <span className="font-bold">{currentStats.assists || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🎯 Headshots:</span>
              <span className="font-bold">{currentStats.headshots || 0}</span>
            </div>
          </div>
        </div>
      )
    } else if (gameType === 'sports') {
      return (
        <div className={`mt-2 ${isLight 
          ? 'bg-gray-200/50' 
          : 'bg-gray-800 bg-opacity-50'} p-2 rounded`}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>⚽ Goals:</span>
              <span className="font-bold">{currentStats.goals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🤝 Assists:</span>
              <span className="font-bold">{currentStats.assists || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🛡️ Saves:</span>
              <span className="font-bold">{currentStats.saves || 0}</span>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

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
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-purple-600' 
              : 'border-purple-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-pink-600' 
              : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading your battle statistics...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament || !participationInfo) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className={`text-${isLight ? 'red-600' : 'red-400'} text-xl mb-6 bg-red-500/${isLight ? '5' : '10'} p-6 rounded-xl border border-red-500/${isLight ? '20' : '30'}`}>
            {error || "Failed to load tournament statistics"}
          </div>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className={`flex items-center gap-3 ${isLight 
              ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
              : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span className="font-semibold">Back to Tournament</span>
          </button>
        </div>
      </div>
    )
  }

  const participantStats = getParticipantStats()

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
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
            : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl mb-8 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Epic Battle</span>
        </button>

        {/* Tournament Header */}
        <div className={`${isLight 
          ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
          : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl mb-8`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-purple-600 via-pink-600 to-red-600' 
                : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
                {typeof tournament.tournament_Name === "string" ? tournament.tournament_Name : "Tournament"}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-blue-600/10 to-cyan-600/10 border border-blue-500/20 text-blue-700' 
                  : 'from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-blue-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faChartLine} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                  <span className="font-semibold">⚔️ Battle Statistics</span>
                </div>
                <div className={`flex items-center gap-2 ${isLight 
                  ? 'bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-300/50' 
                  : 'bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50'}`}>
                  <FontAwesomeIcon icon={faGamepad} className={isLight ? 'text-red-600' : 'text-red-400'} />
                  <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                    {typeof tournament.GameName === "string" ? tournament.GameName : "Game"}
                  </span>
                </div>
              </div>
            </div>

            <div className={`bg-gradient-to-r ${isLight 
              ? 'from-green-600/10 to-emerald-600/10 border-2 border-green-500/20 text-green-700' 
              : 'from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 text-green-300'} px-6 py-4 rounded-xl backdrop-blur-sm`}>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faUserFriends} className={`${isLight ? 'text-green-600' : 'text-green-400'} text-xl`} />
                <div>
                  <div className="font-bold text-lg">👥 Squad Member</div>
                  <div className="text-sm opacity-90">
                    {teamData
                      ? getTeamDisplayName(teamData)
                      : participationInfo && participationInfo.teamNumber
                        ? `Team #${participationInfo.teamNumber}`
                        : "Your Squad"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team and Matchup Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Enhanced Team Information */}
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl lg:col-span-1`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-cyan-600 to-blue-600' 
                : 'from-cyan-400 to-blue-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faUserFriends} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                {participationInfo.participationType === "team" ? "Your Squad" : "Warrior Profile"}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchUserTeam}
                  disabled={refreshingTeam}
                  className={`${isLight 
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/10' 
                    : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'} transition-colors p-2 rounded-lg`}
                  title="Refresh squad data"
                >
                  <FontAwesomeIcon
                    icon={refreshingTeam ? faSpinner : faSync}
                    className={refreshingTeam ? "animate-spin" : ""}
                  />
                </button>
                <div className={`bg-gradient-to-r ${isLight 
                  ? 'from-blue-500 to-cyan-500' 
                  : 'from-blue-600 to-cyan-600'} text-white rounded-full px-3 py-1 text-sm font-bold`}>
                  {teamMembers.length} warriors
                </div>
              </div>
            </div>

            {/* Leave Team Button */}
            {teamData && teamMembers.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setConfirmLeaveTeam(true)}
                  className={`w-full bg-gradient-to-r ${isLight 
                    ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                    : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-red-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faUserFriends} className="text-white" />
                  <span className="text-white">🚪 ABANDON SQUAD</span>
                </button>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} text-center mt-2`}>
                  {participationInfo.isTeamLeader
                    ? "⚠️ If you leave, another member will become leader"
                    : "⚠️ You will be removed from this tournament"}
                </p>
              </div>
            )}

            {/* Enhanced Team Details Box */}
            <div className={`bg-gradient-to-br ${isLight 
              ? 'from-gray-200/40 to-gray-300/40 border border-gray-300/50' 
              : 'from-gray-800/40 to-gray-900/40 border border-gray-700/50'} rounded-xl p-6 mb-6`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>🛡️ Squad Name</p>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                    ? 'from-cyan-600 to-blue-600' 
                    : 'from-cyan-400 to-blue-400'} bg-clip-text text-transparent`}>
                    {teamData
                      ? getTeamDisplayName(teamData)
                      : participationInfo && participationInfo.teamNumber
                        ? `Team #${participationInfo.teamNumber}`
                        : "Your Squad"}
                  </p>
                </div>
                {participationInfo.isTeamLeader && (
                  <div className="text-right">
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>🔐 Squad Password</p>
                    <p className={`text-lg font-mono ${isLight 
                      ? 'bg-white/40 border border-gray-300/50' 
                      : 'bg-black/40 border border-gray-600/50'} px-3 py-2 rounded-lg`}>
                      {typeof teamData?.Team_Password === "string" ? teamData.Team_Password : "N/A"}
                    </p>
                    <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>Share with warriors to join</p>
                  </div>
                )}
              </div>
            </div>

            {teamMembers.length === 0 ? (
              <div className={`text-center py-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                <FontAwesomeIcon icon={faUsers} className={`text-4xl mb-4 ${isLight ? 'text-gray-500' : 'text-gray-600'}`} />
                <p className="text-lg mb-2">No squad members found</p>
                <p className="text-xs mb-1">Team ID: {participationInfo.teamId || "Unknown"}</p>
                <p className="text-xs mb-4">Team Name: {participationInfo.teamName || "Unknown"}</p>
                {refreshingTeam ? (
                  <div className="mt-4 flex justify-center">
                    <FontAwesomeIcon icon={faSpinner} className={`animate-spin text-2xl ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                ) : (
                  <button
                    onClick={fetchUserTeam}
                    className={`mt-4 px-6 py-3 bg-gradient-to-r ${isLight 
                      ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                      : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white rounded-xl font-bold transition-all duration-300`}
                  >
                    🔄 Retry Loading Squad
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Instructions for team leaders */}
                {participationInfo.isTeamLeader && (
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/30 mb-4">
                    <p className="flex items-center gap-3 text-red-300">
                      <FontAwesomeIcon icon={faCrown} className="text-yellow-400" />
                      <span className="font-semibold">
                        👑 As squad leader, you can remove warriors using the REMOVE button.
                      </span>
                    </p>
                  </div>
                )}

                {teamMembers.map((member) => {
                  // Extra safety check to ensure member is an object
                  if (!member || typeof member !== "object") {
                    return null
                  }

                  // Extract all needed values as primitives
                  const memberId = typeof member.user_id === "string" ? member.user_id : "unknown"
                  const memberName = typeof member.Name === "string" ? member.Name : "Unknown"
                  const isLeader = Boolean(member.isLeader)
                  const gamerTag = typeof member.GamerTag === "string" ? member.GamerTag : ""
                  const email = typeof member.email === "string" ? member.email : ""

                  return (
                    <div
                      key={memberId}
                      className={`${isLight 
                        ? 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 border border-gray-300/50' 
                        : 'bg-gradient-to-r from-gray-800/40 to-gray-900/40 border border-gray-700/50'} rounded-xl p-4 flex items-center gap-4 relative`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full ${
                          isLeader
                            ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500"
                        } flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg overflow-hidden`}
                      >
                        {(() => {
                          // Debug: Log the profile picture URL for team members
                          
                          
                          return member.profile_pic_url ? (
                            <ImageWithFallback 
                              src={member.profile_pic_url} 
                              alt={memberName} 
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span>{memberName ? memberName.charAt(0).toUpperCase() : "?"}</span>
                          );
                        })()}
                      </div>
                      <div className="flex-grow min-w-0 mr-2">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>{memberName}</span>
                          {isLeader && (
                            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                              <FontAwesomeIcon icon={faCrown} />
                              LEADER
                            </span>
                          )}
                        </div>
                        {gamerTag && <div className={`text-sm ${isLight ? 'text-blue-600' : 'text-cyan-400'} font-semibold`}>@{gamerTag}</div>}
                        {email && <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{email}</div>}
                      </div>

                      {/* Enhanced REMOVE button */}
                      {participationInfo.isTeamLeader && !isLeader && (
                        <div className="ml-auto">
                          <button
                            onClick={() =>
                              setConfirmRemoveUser({
                                user_id: memberId,
                                Name: memberName,
                                isLeader: isLeader,
                              })
                            }
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl transition-all duration-300 hover:scale-110 border-2 border-yellow-400/50 font-bold"
                            title="Remove from squad"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-yellow-300" />
                            <span className="font-bold">REMOVE</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Enhanced Matchups Information for Bracket Tournaments */}
          {isBracketTournament && (
            <div className={`${isLight 
              ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
              : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl lg:col-span-2`}>
              <h2 className={`text-xl font-bold mb-6 bg-gradient-to-r ${isLight 
                ? 'from-red-600 to-pink-600' 
                : 'from-red-400 to-pink-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faShield} className={isLight ? "text-red-600" : "text-red-400"} />
                Your Battle History
              </h2>

            {/* Upcoming Matches */}
            <div className="mb-8">
              <h3 className={`font-bold text-lg border-b-2 ${isLight 
                ? 'border-blue-300' 
                : 'border-gradient-to-r from-blue-500 to-cyan-500'} pb-3 mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faRocket} className={isLight ? "text-blue-600" : "text-blue-400"} />
                <span className={`bg-gradient-to-r ${isLight 
                  ? 'from-blue-600 to-cyan-600' 
                  : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent`}>
                  🚀 Upcoming Battles
                </span>
              </h3>

              {upcomingMatchups.length === 0 ? (
                <div className={`text-center py-8 bg-gradient-to-br ${isLight 
                  ? 'from-blue-500/5 to-cyan-500/5 border border-blue-500/20' 
                  : 'from-blue-500/10 to-cyan-500/10 border border-blue-500/30'} rounded-xl`}>
                  <FontAwesomeIcon icon={faBullseye} className={`text-4xl ${isLight ? 'text-blue-600' : 'text-blue-400'} mb-4`} />
                  <p className={`text-xl ${isLight ? 'text-blue-700 font-bold' : 'text-blue-300 font-semibold'}`}>No upcoming battles scheduled</p>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>Your next challenge awaits...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMatchups.map((matchup) => {
                    if (!matchup || typeof matchup !== "object") return null
                    const matchupId = matchup.matchup_id || "unknown"
                    const roundTag = matchup.round_tag ? String(matchup.round_tag) : "?"
                    const scheduledTime = matchup.scheduled_time ? new Date(matchup.scheduled_time) : null

                    return (
                      <div
                        key={matchupId}
                        className={`bg-gradient-to-r ${isLight 
                          ? 'from-blue-500/5 to-cyan-500/5 border-2 border-blue-500/20' 
                          : 'from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30'} rounded-xl p-6`}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className={`font-bold text-lg ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>⚔️ Round {roundTag}</div>
                          <div className={`bg-gradient-to-r ${isLight 
                            ? 'from-blue-500 to-cyan-500' 
                            : 'from-blue-600 to-cyan-600'} text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse`}>
                            🔥 UPCOMING
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg ${isLight ? 'text-green-600' : 'text-green-400'}`}>🛡️ Your Squad</span>
                            {teamData && <span className={isLight ? 'text-gray-600' : 'text-gray-300'}>({getTeamDisplayName(teamData)})</span>}
                          </div>
                          <span className={`text-2xl font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>⚔️</span>
                          <div className={`font-bold text-lg ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>🎯 {getOpponentName(matchup)}</div>
                        </div>

                        {scheduledTime && (
                          <div className={`text-sm ${isLight 
                            ? 'text-gray-600 mt-4 bg-gray-200/70 p-3 rounded-lg' 
                            : 'text-gray-400 mt-4 bg-black/30 p-3 rounded-lg'}`}>
                            ⏰ Battle Time: {scheduledTime.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Past Matches */}
            <div>
              <h3 className={`font-bold text-lg border-b-2 ${isLight 
                ? 'border-yellow-300' 
                : 'border-gradient-to-r from-yellow-500 to-orange-500'} pb-3 mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faGem} className={isLight ? "text-yellow-600" : "text-yellow-400"} />
                <span className={`bg-gradient-to-r ${isLight 
                  ? 'from-yellow-600 to-orange-600' 
                  : 'from-yellow-400 to-orange-400'} bg-clip-text text-transparent`}>
                  📜 Battle Chronicles
                </span>
              </h3>

              {pastMatchups.length === 0 ? (
                <div className={`text-center py-8 bg-gradient-to-br ${isLight 
                  ? 'from-gray-200/40 to-gray-300/40 border border-gray-300/50' 
                  : 'from-gray-500/10 to-gray-600/10 border border-gray-500/30'} rounded-xl`}>
                  <FontAwesomeIcon icon={faSkull} className={`text-4xl ${isLight ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                  <p className={`text-xl ${isLight ? 'text-gray-700 font-bold' : 'text-gray-300 font-semibold'}`}>No completed battles yet</p>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>Your legend begins with the first victory...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastMatchups.map((matchup) => {
                    if (!matchup || typeof matchup !== "object") return null

                    const matchupId = matchup.matchup_id || "unknown"
                    const roundTag = matchup.round_tag ? String(matchup.round_tag) : "?"
                    const isWinner = matchup.winner === teamData.Team_id
                    

                    const completedTime = matchup.completed_at ? new Date(matchup.completed_at) : null

                    return (
                      <div
                        key={matchupId}
                        className={`rounded-xl p-6 border-2 ${
                          isWinner
                            ? isLight 
                              ? "bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20"
                              : "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
                            : isLight
                              ? "bg-gradient-to-r from-red-500/5 to-pink-500/5 border-red-500/20"
                              : "bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className={`font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>⚔️ Round {roundTag}</div>
                          <div
                            className={`px-4 py-2 rounded-full text-sm font-bold ${
                              isWinner
                                ? isLight
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                  : "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                                : isLight
                                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                                  : "bg-gradient-to-r from-red-600 to-pink-600 text-white"
                            }`}
                          >
                            {isWinner ? "🏆 VICTORY" : "💀 DEFEAT"}
                          </div>
                        </div>

                                                  <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg ${isWinner 
                              ? isLight ? "text-green-600" : "text-green-400" 
                              : isLight ? "text-gray-700" : "text-gray-300"}`}>
                              🛡️ Your Squad
                            </span>
                            {teamData && <span className={isLight ? "text-gray-600" : "text-gray-300"}>({getTeamDisplayName(teamData)})</span>}
                          </div>
                          <span className={`text-2xl font-bold ${isLight ? "text-gray-700" : "text-gray-400"}`}>⚔️</span>
                          <div className={`font-bold text-lg ${isLight ? "text-orange-600" : "text-orange-400"}`}>🎯 {getOpponentName(matchup)}</div>
                        </div>

                        {completedTime && (
                          <div className={`text-sm ${isLight 
                            ? 'text-gray-600 mt-4 bg-gray-200/70 p-3 rounded-lg' 
                            : 'text-gray-400 mt-4 bg-black/30 p-3 rounded-lg'}`}>
                            ⏰ Battle Completed: {completedTime.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          )}

        {/* Enhanced Non-Bracket Tournament Leaderboard */}
        {!isBracketTournament && (
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl lg:col-span-2`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className={`text-xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-green-600 to-emerald-600' 
                : 'from-green-400 to-emerald-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faTrophy} className={isLight ? "text-green-600" : "text-green-400"} />
                🏆 Tournament Leaderboard
              </h2>
              
              {/* Search Bar */}
              <div className="relative mt-4 md:mt-0 w-full md:w-80">
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
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${isLight ? 'bg-white/50' : 'bg-black/30'} rounded-xl overflow-hidden`}>
                <thead className={`${isLight ? 'bg-gray-200/80' : 'bg-gray-800/80'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>🏆 Rank</th>
                    <th className={`px-4 py-3 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {tournament.Team_Size_Limit > 1 ? '🛡️ Squad' : '⚔️ Warrior'}
                    </th>
                    <th className={`px-4 py-3 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>👥 Members</th>
                    <th className={`px-4 py-3 text-left font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>📊 Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Display all teams and participants, sorted by position */}
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
                      ? (isTeamBased ? allTeams : allParticipants)
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
                      const teamId = isTeam ? teamData?.Team_id : participantData?.User?.user_id;
                      // Check if this is the current user's team
                      const isCurrentUserTeam = teamData && item.Team_id === teamData.Team_id;
                      return (
                        <tr 
                          key={`leaderboard-${teamId}-${index}`}
                          className={`border-b ${isLight 
                            ? 'border-gray-200 hover:bg-gray-100/50' 
                            : 'border-gray-700 hover:bg-gray-800/50'} ${isCurrentUserTeam ? (isLight ? 'bg-blue-50/50' : 'bg-blue-500/10') : ''} transition-colors cursor-pointer`}
                          onClick={() => handleViewTeamStats(isTeam ? teamData : participantData)}
                        >
                          <td className={`px-4 py-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full ${isLight 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                : 'bg-gradient-to-r from-yellow-600 to-orange-600'} flex items-center justify-center text-white font-bold text-xs`}>
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
                              {isCurrentUserTeam && (
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${isLight 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-blue-500/20 text-blue-400'}`}>
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${isLight 
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
                                {(() => {
                                  // For teams, use the first member's profile picture
                                  const profilePicUrl = isTeam 
                                    ? (teamData?.Members && teamData.Members.length > 0 ? teamData.Members[0].profile_pic_url : null)
                                    : participantData?.User?.profile_pic_url;
                                  
                                  // Debug: Log the profile picture URL
                                  
                                  
                                  return profilePicUrl ? (
                                    <ImageWithFallback 
                                      src={profilePicUrl} 
                                      alt={displayName} 
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <span>{displayName.charAt(0).toUpperCase()}</span>
                                  );
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
                          <td className={`px-4 py-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold ${isLight 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-blue-500/20 text-blue-400'}`}>
                              <FontAwesomeIcon icon={faUsers} className="text-xs" />
                              <span>{memberCount} {memberCount === 1 ? 'warrior' : 'warriors'}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTeamStats(isTeam ? teamData : participantData);
                              }}
                              className={`px-3 py-1 bg-gradient-to-r ${isLight 
                                ? 'from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500' 
                                : 'from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600'} text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all duration-300`}
                            >
                              <FontAwesomeIcon icon={faChartLine} />
                              <span>VIEW</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  
                  {/* Empty state */}
                  {(!leaderboardSearchTerm 
                    ? (isTeamBased ? allTeams : allParticipants)
                    : filteredLeaderboardData
                  ).length === 0 && (
                    <tr>
                      <td colSpan="4" className={`px-4 py-8 text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        <FontAwesomeIcon icon={leaderboardSearchTerm ? faSearch : faTrophy} className="text-3xl mb-2" />
                        <p className="font-bold">
                          {leaderboardSearchTerm ? 'No results found' : 'No competitors found'}
                        </p>
                        <p className="text-sm">
                          {leaderboardSearchTerm 
                            ? `No teams or warriors match "${leaderboardSearchTerm}"`
                            : `No ${isTeamBased ? 'squads' : 'warriors'} have joined this competition yet`}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        {/* Enhanced Tournament Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-purple-500/5 to-pink-500/5 border border-purple-500/20' 
            : 'from-purple-500/10 to-pink-500/10 border border-purple-500/30'} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>👥 Total Warriors</h3>
              <FontAwesomeIcon icon={faUsers} className={`${isLight ? 'text-purple-600' : 'text-purple-400'} text-xl`} />
            </div>
            <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
              {typeof participantStats.count === "number" ? participantStats.count : 0}
            </p>
            <p className={`text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
              of {typeof participantStats.max === "number" ? participantStats.max : 0} (
              {typeof participantStats.percentage === "number" ? participantStats.percentage : 0}%)
            </p>
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-cyan-500/5 to-blue-500/5 border border-cyan-500/20' 
            : 'from-cyan-500/10 to-blue-500/10 border border-cyan-500/30'} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                {tournament.Team_Size_Limit > 1 ? "🛡️ Squad Size" : "🎯 Battle Slots"}
              </h3>
              <FontAwesomeIcon
                icon={tournament.Team_Size_Limit > 1 ? faUserFriends : faBullseye}
                className={`${isLight ? 'text-cyan-600' : 'text-cyan-400'} text-xl`}
              />
            </div>
            <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
              {typeof teamMembers.length === "number" ? teamMembers.length : 0}
            </p>
            <p className={`text-sm ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
              {tournament.Team_Size_Limit > 1
                ? `${teamMembers.length}/${tournament.Team_Size_Limit} warriors`
                : `${participantStats.available} spots remaining`}
            </p>
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-yellow-500/5 to-orange-500/5 border border-yellow-500/20' 
            : 'from-yellow-500/10 to-orange-500/10 border border-yellow-500/30'} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                {isBracketTournament ? '🏆 Battle Record' : '🏆 Tournament Standing'}
              </h3>
              <FontAwesomeIcon icon={faMedal} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} text-xl`} />
            </div>
            
            {isBracketTournament ? (
              // Show wins/losses for bracket tournaments
              <>
                <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
                  <span className={isLight ? 'text-green-600' : 'text-green-400'}>{typeof matchStats.wins === "number" ? matchStats.wins : 0}</span>
                  <span className="text-gray-400 mx-2">-</span>
                  <span className={isLight ? 'text-red-600' : 'text-red-400'}>{typeof matchStats.losses === "number" ? matchStats.losses : 0}</span>
                </p>
                <p className={`text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                  🔥 Win rate: {typeof matchStats.winRate === "number" ? matchStats.winRate : 0}%
                </p>
              </>
            ) : (
              // Show tournament position and performance for non-bracket tournaments
              <>
                <p className={`text-4xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
                  {userTournamentPosition ? (
                    <span className={
                      userTournamentPosition === 1 ? (isLight ? 'text-yellow-600' : 'text-yellow-400') :
                      userTournamentPosition === 2 ? (isLight ? 'text-gray-600' : 'text-gray-400') :
                      userTournamentPosition === 3 ? (isLight ? 'text-orange-600' : 'text-orange-400') :
                      (isLight ? 'text-blue-600' : 'text-blue-400')
                    }>
                      {userTournamentPosition === 1 ? '🥇 #1' :
                       userTournamentPosition === 2 ? '🥈 #2' :
                       userTournamentPosition === 3 ? '🥉 #3' :
                       `#${userTournamentPosition}`}
                    </span>
                  ) : (
                    <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>TBD</span>
                  )}
                </p>
                <p className={`text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                  {userTournamentPosition ? 'Current tournament position' : '🎯 Position to be determined'}
                </p>
              </>
            )}
          </div>

          <div className={`bg-gradient-to-br ${isLight 
            ? 'from-red-500/5 to-pink-500/5 border border-red-500/20' 
            : 'from-red-500/10 to-pink-500/10 border border-red-500/30'} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm ${isLight ? 'text-red-700' : 'text-red-300'}`}>👑 Your Role</h3>
              <FontAwesomeIcon icon={faUserShield} className={`${isLight ? 'text-red-600' : 'text-red-400'} text-xl`} />
            </div>
            <p className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-2`}>
              {participationInfo.isAdmin
                ? `🛡️ Admin (${participationInfo.adminRole})`
                : participationInfo.participationType === "team"
                  ? participationInfo.isTeamLeader
                    ? "👑 Squad Leader"
                    : "⚔️ Squad Member"
                  : "🗡️ Solo Fighter"}
            </p>
            <p className={`text-sm ${isLight ? 'text-red-700' : 'text-red-300'}`}>
              {participationInfo.participationType === "team" ? "👥 Team Battle" : "⚔️ Solo Combat"}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Confirmation Modal for removing team member */}
      {confirmRemoveUser && (
        <div className={`fixed inset-0 ${isLight ? 'bg-black/30' : 'bg-black/80'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
          <div className={`${isLight 
            ? 'bg-white/95 border border-gray-300' 
            : 'bg-black/90 border border-gray-700/50'} backdrop-blur-xl rounded-2xl p-8 shadow-2xl max-w-md w-full`}>
            <h3 className={`text-2xl font-bold mb-6 ${isLight 
              ? 'text-gray-900' 
              : 'bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent'}`}>
              ⚠️ Remove Squad Member
            </h3>

            {removeUserError && (
              <div className={`${isLight 
                ? 'bg-red-50 border-2 border-red-200 text-red-700' 
                : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500/30 text-red-300'} p-4 rounded-xl mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                <div>
                  <p className="font-bold">💥 Error</p>
                  <p>{typeof removeUserError === "string" ? removeUserError : "An error occurred"}</p>
                </div>
              </div>
            )}

            <p className={`mb-8 text-lg ${isLight ? 'text-gray-700' : 'text-white'}`}>
              Are you sure you want to remove{" "}
              <span className={`font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                {typeof confirmRemoveUser.Name === "string" ? confirmRemoveUser.Name : "this member"}
              </span>{" "}
              from your squad?
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmRemoveUser(null)}
                disabled={removeUserLoading}
                className={`px-6 py-3 border-2 rounded-xl transition-all duration-300 font-semibold ${
                  isLight
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'border-gray-600 text-white hover:bg-gray-700/50'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(confirmRemoveUser.user_id)}
                disabled={removeUserLoading}
                className={`px-6 py-3 bg-gradient-to-r ${isLight 
                  ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                  : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white rounded-xl flex items-center gap-3 font-bold shadow-lg hover:shadow-red-500/25 transform hover:scale-105 transition-all duration-300`}
              >
                {removeUserLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrash} />
                    <span>REMOVE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Leave Team Confirmation Modal */}
      {confirmLeaveTeam && (
        <div className={`fixed inset-0 ${isLight ? 'bg-black/30' : 'bg-black/80'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
          <div className={`${isLight 
            ? 'bg-white/95 border border-gray-300' 
            : 'bg-black/90 border border-gray-700/50'} backdrop-blur-xl rounded-2xl p-8 shadow-2xl max-w-md w-full`}>
            <h3 className={`text-2xl font-bold mb-6 ${isLight 
              ? 'text-gray-900' 
              : 'bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent'}`}>
              🚪 Abandon Squad
            </h3>

            {leaveTeamError && (
              <div className={`${isLight 
                ? 'bg-red-50 border-2 border-red-200 text-red-700' 
                : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500/30 text-red-300'} p-4 rounded-xl mb-6 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                <div>
                  <p className="font-bold">💥 Error</p>
                  <p>{typeof leaveTeamError === "string" ? leaveTeamError : "An error occurred"}</p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className={`text-xl font-bold ${isLight ? 'text-yellow-600' : 'text-yellow-300'} mb-4 flex items-center gap-3`}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                ⚠️ Warning
              </p>
              <p className={`mb-6 text-lg ${isLight ? 'text-gray-700' : 'text-white'}`}>Are you sure you want to abandon this squad? This action cannot be undone.</p>

              {participationInfo && participationInfo.isTeamLeader && teamMembers.length > 1 && (
                <div className={`${isLight 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-300 border border-blue-500/30'} p-4 rounded-xl`}>
                  <p className="text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faInfoCircle} />👑 Since you are the squad leader, another member will be
                    assigned as the new leader.
                  </p>
                </div>
              )}

              {participationInfo && participationInfo.isTeamLeader && teamMembers.length === 1 && (
                <div className={`${isLight 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-300 border border-blue-500/30'} p-4 rounded-xl`}>
                  <p className="text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    🛡️ You are the only member of this squad. The squad will remain available for others to join.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmLeaveTeam(false)}
                disabled={leavingTeam}
                className={`px-6 py-3 border-2 rounded-xl transition-all duration-300 font-semibold ${
                  isLight
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'border-gray-600 text-white hover:bg-gray-700/50'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={leavingTeam}
                className={`px-6 py-3 bg-gradient-to-r ${isLight 
                  ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                  : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white rounded-xl flex items-center gap-3 font-bold shadow-lg hover:shadow-red-500/25 transform hover:scale-105 transition-all duration-300`}
              >
                {leavingTeam ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserFriends} />
                    <span>ABANDON SQUAD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Stats Modal for Non-Bracket Tournaments */}
      {showTeamStatsModal && selectedTeamStats && (
        <div className={`fixed inset-0 ${isLight ? 'bg-black/30' : 'bg-black/80'} backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden`}>
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
                  View competition statistics and performance
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Game Type Display */}
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

              {/* Position Display */}
              <div className={`${isLight 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-yellow-500/10 border-yellow-500/30'} p-6 rounded-xl border`}>
                <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-yellow-800' : 'text-yellow-300'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faTrophy} />
                  🏆 Tournament Position
                </h3>
                <div className={`px-4 py-3 rounded-lg ${isLight 
                  ? 'bg-white border-gray-300 text-gray-800' 
                  : 'bg-gray-800 border-gray-600 text-white'} border text-center`}>
                  {selectedTeamStats.tournamentPosition ? (
                    <>
                      <span className="text-2xl font-bold">
                        {selectedTeamStats.tournamentPosition === 1 ? '🥇 1st Place' :
                         selectedTeamStats.tournamentPosition === 2 ? '🥈 2nd Place' :
                         selectedTeamStats.tournamentPosition === 3 ? '🥉 3rd Place' :
                         `#${selectedTeamStats.tournamentPosition}`}
                      </span>
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
                        Final tournament ranking
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">Position TBD</span>
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
                        Final ranking will be announced
                      </p>
                    </>
                  )}
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
                    return (
                      <div key={`stats-${member.user_id}-${index}`} 
                           className={`${isLight 
                             ? 'bg-white border-gray-200' 
                             : 'bg-black/40 border-gray-700'} p-4 rounded-xl border`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-full ${isLight 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600'} flex items-center justify-center text-white font-bold overflow-hidden`}>
                            {(() => {
                              // Debug: Log the profile picture URL for team stats modal
                              
                              
                              return member.profile_pic_url ? (
                                <ImageWithFallback 
                                  src={member.profile_pic_url} 
                                  alt={member.Name} 
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <span>{member.Name.charAt(0).toUpperCase()}</span>
                              );
                            })()}
                          </div>
                          <div>
                            <div className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                              {member.Name}
                            </div>
                            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {member.email}
                            </div>
                          </div>
                        </div>
                        {renderPlayerStats(member, true)}
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
                        {(() => {
                          // Debug: Log the profile picture URL for single participant
                          
                          
                          return selectedTeamStats.User.profile_pic_url ? (
                            <ImageWithFallback 
                              src={selectedTeamStats.User.profile_pic_url} 
                              alt={selectedTeamStats.User.Name} 
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span>{selectedTeamStats.User.Name.charAt(0).toUpperCase()}</span>
                          );
                        })()}
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
                    {renderPlayerStats(selectedTeamStats.User, true)}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>No player data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-300/50">
              <button
                onClick={handleCloseTeamStatsModal}
                className={`px-6 py-3 ${isLight 
                  ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100' 
                  : 'border-2 border-gray-600 text-gray-300 hover:bg-gray-800'} rounded-xl transition-all duration-300 font-semibold`}
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TournamentStats