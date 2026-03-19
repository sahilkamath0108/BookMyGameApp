import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faExclamationTriangle,
  faMedal,
  faUsers,
  faCrown,
  faGamepad,
  faChartLine,
  faFire,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

const GlobalLeaderboard = () => {
  const { colors, theme } = useContext(ThemeContext)
  const isLight = theme === 'light'
  const navigate = useNavigate()

  // State variables
  const [timeFrame, setTimeFrame] = useState('7')
  const [activeTab, setActiveTab] = useState('all')
  const [topTeams, setTopTeams] = useState([])
  const [recentWinners, setRecentWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [userRank, setUserRank] = useState(null)
  const [userScore, setUserScore] = useState(0)
  const [gameName, setGameName] = useState(null)
  const [totalMatches, setTotalMatches] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState(null)

  // Define tabs
  const tabs = [
    { id: 'all', label: 'All Players' },
    { id: 'solo', label: 'Solo Players' },
    { id: 'team', label: 'Team Players' }
  ]

  // Sample data for filtered players (replace with actual data from your API)
  

  // Fetch global leaderboard data on component mount and when timeFrame changes
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/matchups/leaderboard/global?days=${timeFrame}`
        );

        if (response.data && response.data.status === 'success') {
          const { recentWinners, topTeams, totalMatchups, timeFrame } = response.data.data;
          
          setRecentWinners(recentWinners || []);
          setTopTeams(topTeams || []);
          setTotalMatches(totalMatchups || 0);
        }
      } catch (error) {
        console.error('Error fetching global leaderboard data:', error);
        setError(error.response?.data?.message || 'Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [timeFrame]);

  // Helper function to get team name
  const getTeamName = (team) => {
    if (!team) return "Unknown Team";
    
    // Check if this is a single-player tournament
    if (team.isSinglePlayer) {
      // For single-player tournaments, show player name or gamer tag
      if (team.playerName) {
        return team.playerName;
      }
      if (team.Members && team.Members.length > 0) {
        return team.Members[0].Name || team.Members[0].GamerTag || 'Unknown Player';
      }
      return 'Unknown Player';
    }
    
    // For team tournaments, show team name
    if (team.Team_Name && team.Team_Name.trim()) {
      return team.Team_Name;
    }
    
    // If team has a number, use it
    if (team.Team_Number) {
      return `Team #${team.Team_Number}`;
    }
    
    // Fallback to team ID
    return `Team ${team.Team_id ? team.Team_id.slice(-4) : 'Unknown'}`;
  };

  // Helper function to get team description
  const getTeamDescription = (team) => {
    if (!team) return "Unknown team";
    
    // Check if this is a single-player tournament
    if (team.isSinglePlayer) {
      // For single-player tournaments, show gamer tag if different from name
      if (team.playerGamerTag && team.playerName !== team.playerGamerTag && typeof team.playerGamerTag === 'string') {
        return `@${team.playerGamerTag}`;
      }
      if (team.Members && Array.isArray(team.Members) && team.Members.length > 0) {
        const member = team.Members[0];
        if (member && typeof member === 'object' && member.GamerTag && member.Name !== member.GamerTag && typeof member.GamerTag === 'string') {
          return `@${member.GamerTag}`;
        }
      }
      return 'Solo Player';
    }
    
    // For team tournaments, show member count and team info
    const memberCount = Array.isArray(team.team_members) ? team.team_members.length : 0;
    const memberText = memberCount === 1 ? 'member' : 'members';
    
    // If team has a custom name, show team number as additional info
    if (team.Team_Name && typeof team.Team_Name === 'string' && team.Team_Name.trim() && team.Team_Number) {
      return `Team #${team.Team_Number} • ${memberCount} ${memberText}`;
    }
    
    // Otherwise just show member count
    return `${memberCount} ${memberText}`;
  };

  // Helper function to get avatar initials
  const getAvatarInitials = (team) => {
    if (!team) return '?';
    
    // For single-player tournaments, show player initials
    if (team.isSinglePlayer) {
      if (team.playerName) {
        return team.playerName.charAt(0).toUpperCase();
      }
      if (team.Members && team.Members.length > 0) {
        return team.Members[0].Name?.charAt(0).toUpperCase() || 'P';
      }
      return 'P';
    }
    
    // For team tournaments, show team name initial or number
    if (team.Team_Name && team.Team_Name.trim()) {
      return team.Team_Name.charAt(0).toUpperCase();
    }
    return team.Team_Number || '?';
  };

  // Helper function to get rank medal
  const getRankMedal = (index) => {
    switch (index) {
      case 0:
        return <FontAwesomeIcon icon={faTrophy} className="text-yellow-400 text-xl" />;
      case 1:
        return <FontAwesomeIcon icon={faMedal} className="text-gray-400 text-xl" />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className="text-amber-700 text-xl" />;
      default:
        return <span className="text-gray-400 font-bold">{index + 1}</span>;
    }
  };

  // Handle timeframe change
  const handleTimeFrameChange = (days) => {
    setTimeFrame(days);
  };

  // Handle showing tournament details modal
  const handleShowTournamentDetails = (team) => {
    setSelectedTeam(team);
    setShowTournamentModal(true);
  };

  // Close tournament details modal
  const handleCloseTournamentModal = () => {
    setShowTournamentModal(false);
    setSelectedTeam(null);
  };

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
              ? 'border-orange-600' 
              : 'border-orange-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-red-600' 
              : 'border-red-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-orange-700' : 'text-gray-400'} animate-pulse text-lg`}>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Header Section */}
        <div className={`${isLight 
          ? 'bg-white/80 backdrop-blur-xl border-2 border-gray-300/70' 
          : 'bg-black/80 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-8 shadow-2xl mb-8 transition-all duration-300 hover:shadow-3xl hover:scale-[1.01]`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-purple-600 via-pink-600 to-red-600' 
                : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
                Global Leaderboard
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-blue-600/10 to-cyan-600/10 border-2 border-blue-500/30 text-blue-700' 
                  : 'from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/40 text-blue-300'} px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <FontAwesomeIcon icon={faTrophy} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                  <span className="font-semibold">🏆 Elite Rankings</span>
                </div>
                <div className="flex gap-2">
                  {['7', '30', '90', '365'].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleTimeFrameChange(days)}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        timeFrame === days 
                          ? isLight
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20 border-2 border-blue-400/50'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 border-2 border-blue-500/50'
                          : isLight
                          ? 'bg-white/40 text-gray-700 hover:bg-gray-100/50 border-2 border-gray-300/50'
                          : 'bg-black/40 text-gray-300 hover:bg-gray-800/50 border-2 border-gray-700/50'
                      }`}
                    >
                      {days === '365' ? '1 Year' : `${days} Days`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${isLight 
            ? 'bg-white/80 backdrop-blur-xl border-2 border-gray-300/70' 
            : 'bg-black/80 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isLight 
                ? 'bg-blue-100/80 border-2 border-blue-200/50' 
                : 'bg-blue-500/20 border-2 border-blue-500/30'}`}>
                <FontAwesomeIcon icon={faMedal} className={`text-2xl ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Total Matches
                </h3>
                <p className={`text-2xl font-bold ${isLight 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent'}`}>
                  {totalMatches}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isLight 
            ? 'bg-white/80 backdrop-blur-xl border-2 border-gray-300/70' 
            : 'bg-black/80 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isLight 
                ? 'bg-purple-100/80 border-2 border-purple-200/50' 
                : 'bg-purple-500/20 border-2 border-purple-500/30'}`}>
                <FontAwesomeIcon icon={faUsers} className={`text-xl ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Active Teams
                </h3>
                <p className={`text-2xl font-bold ${isLight 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent'}`}>
                  {topTeams.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isLight 
            ? 'bg-white/80 backdrop-blur-xl border-2 border-gray-300/70' 
            : 'bg-black/80 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isLight 
                ? 'bg-yellow-100/80 border-2 border-yellow-200/50' 
                : 'bg-yellow-500/20 border-2 border-yellow-500/30'}`}>
                <FontAwesomeIcon icon={faCrown} className={`text-xl ${isLight ? 'text-yellow-600' : 'text-yellow-400'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Top Team
                </h3>
                {topTeams.length > 0 ? (
                  <div>
                    <p className={`text-lg font-bold ${isLight 
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent' 
                      : 'bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent'}`}>
                      {getTeamName(topTeams[0].team)}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                        {topTeams[0].total_wins} wins
                      </span>
                      <span className={`text-sm ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
                        {topTeams[0].tournament_count} tournaments
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    No data available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${isLight 
          ? 'bg-white/80 backdrop-blur-xl border-2 border-gray-300/70' 
          : 'bg-black/80 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-6 shadow-2xl mb-8 transition-all duration-300 hover:shadow-3xl`}>
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('topTeams')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'topTeams'
                  ? isLight
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-2 border-blue-400/50'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-2 border-blue-500/50'
                  : isLight
                  ? 'bg-white/40 text-gray-700 hover:bg-gray-100/50 border-2 border-gray-300/50'
                  : 'bg-black/40 text-gray-300 hover:bg-gray-800/50 border-2 border-gray-700/50'
              }`}
            >
              <FontAwesomeIcon icon={faChartLine} className="mr-2" />
              Top Teams
            </button>
            <button
              onClick={() => setActiveTab('recentWinners')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'recentWinners'
                  ? isLight
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-400/50'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-500/50'
                  : isLight
                  ? 'bg-white/40 text-gray-700 hover:bg-gray-100/50 border-2 border-gray-300/50'
                  : 'bg-black/40 text-gray-300 hover:bg-gray-800/50 border-2 border-gray-700/50'
              }`}
            >
              <FontAwesomeIcon icon={faTrophy} className="mr-2" />
              Recent Winners
            </button>
          </div>

          {/* Content Area */}
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-sm border-2 border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-sm border-2 border-gray-700/50'} rounded-xl p-6 transition-all duration-300 hover:shadow-xl`}>
            {activeTab === 'topTeams' ? (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-lg ${isLight 
                    ? 'bg-blue-100/80 border-2 border-blue-200/50' 
                    : 'bg-blue-500/20 border-2 border-blue-500/30'}`}>
                    <FontAwesomeIcon icon={faMedal} className={`text-xl ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                  <h2 className={`text-2xl font-bold ${isLight 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent'}`}>
                    Global Leaderboard
                  </h2>
                </div>

                {topTeams.length === 0 ? (
                  <div className={`text-center py-12 ${isLight 
                    ? 'bg-gray-100/50 border-2 border-gray-300/50' 
                    : 'bg-gray-800/30 border-2 border-gray-700/50'} rounded-xl`}>
                    <FontAwesomeIcon icon={faTrophy} className={`text-4xl ${isLight ? 'text-gray-400' : 'text-gray-500'} mb-4`} />
                    <p className={`${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                      No team rankings available for this time period.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border-2 border-gray-700 border-opacity-40">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className={`${isLight 
                        ? 'bg-gray-100/50 border-b-2 border-gray-300/50' 
                        : 'bg-gray-800/60 border-b-2 border-gray-700/50'}`}>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Team
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Tournaments
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Wins
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${isLight 
                        ? 'bg-white/95' 
                        : 'bg-gray-800/10'} divide-y divide-gray-700`}>
                        {topTeams.map((team, index) => (
                          <tr
                            key={team.team_id}
                            className={`transition-all duration-300 ${
                              isLight 
                                ? 'hover:bg-gray-100/50 hover:shadow-lg' 
                                : 'hover:bg-gray-800/50 hover:shadow-lg'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                {getRankMedal(index)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full ${
                                  index === 0 ? (isLight ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' : 'bg-gradient-to-br from-yellow-500 to-yellow-600') : 
                                  index === 1 ? (isLight ? 'bg-gradient-to-br from-blue-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-blue-600') : 
                                  index === 2 ? (isLight ? 'bg-gradient-to-br from-purple-400 to-purple-500' : 'bg-gradient-to-br from-purple-500 to-purple-600') : 
                                  (isLight ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-gray-600 to-gray-700')
                                } flex items-center justify-center text-white font-bold border-2 ${
                                  index === 0 ? (isLight ? 'border-yellow-300/50' : 'border-yellow-500/50') :
                                  index === 1 ? (isLight ? 'border-blue-300/50' : 'border-blue-500/50') :
                                  index === 2 ? (isLight ? 'border-purple-300/50' : 'border-purple-500/50') :
                                  (isLight ? 'border-gray-300/50' : 'border-gray-500/50')
                                }`}>
                                  {index === 0 && <FontAwesomeIcon icon={faCrown} />}
                                  {index !== 0 && getAvatarInitials(team.team)}
                                </div>
                                <div className="ml-4">
                                  <div className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                    {getTeamName(team.team)}
                                  </div>
                                  <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {getTeamDescription(team.team)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                isLight 
                                  ? index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                    index === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    index === 2 ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    'bg-gray-100 text-gray-700 border-gray-200'
                                  : index === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                    index === 1 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                    index === 2 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                    'bg-gray-500/20 text-gray-300 border-gray-500/30'
                              }`}>
                                {team.tournament_count}
                              </span>
                              {team.tournament_details && (
                                <div className="mt-2 text-xs">
                                  {team.tournament_details.slice(0, 2).map((tournament, i) => (
                                    <div key={i} className="mt-1">
                                      <Link 
                                        to={`/tournaments/${tournament.id}`} 
                                        className={`${isLight 
                                          ? index === 0 ? 'text-yellow-600 hover:text-yellow-700' :
                                            index === 1 ? 'text-blue-600 hover:text-blue-700' :
                                            index === 2 ? 'text-purple-600 hover:text-purple-700' :
                                            'text-gray-600 hover:text-gray-700'
                                          : index === 0 ? 'text-yellow-400 hover:text-yellow-300' :
                                            index === 1 ? 'text-blue-400 hover:text-blue-300' :
                                            index === 2 ? 'text-purple-400 hover:text-purple-300' :
                                            'text-gray-400 hover:text-gray-300'} transition-colors duration-300 hover:underline`}
                                        title={`${tournament.name} (${tournament.game})`}
                                      >
                                        {tournament.name}
                                      </Link>
                                    </div>
                                  ))}
                                  {team.tournament_details.length > 2 && (
                                    <div 
                                      className={`mt-1 ${isLight 
                                        ? index === 0 ? 'text-gray-600 hover:text-yellow-600' :
                                          index === 1 ? 'text-gray-600 hover:text-blue-600' :
                                          index === 2 ? 'text-gray-600 hover:text-purple-600' :
                                          'text-gray-600 hover:text-gray-700'
                                        : index === 0 ? 'text-gray-400 hover:text-yellow-400' :
                                          index === 1 ? 'text-gray-400 hover:text-blue-400' :
                                          index === 2 ? 'text-gray-400 hover:text-purple-400' :
                                          'text-gray-400 hover:text-gray-300'} cursor-pointer transition-colors duration-300 hover:underline`}
                                      onClick={() => handleShowTournamentDetails(team)}
                                    >
                                      +{team.tournament_details.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                              <span className={`font-semibold ${isLight 
                                ? index === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent' :
                                  index === 1 ? 'bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent' :
                                  index === 2 ? 'bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent' :
                                  'bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent'
                                : index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent' :
                                  index === 1 ? 'bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent' :
                                  index === 2 ? 'bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent' :
                                  'bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent'}`}>
                                {team.total_wins}
                              </span> {team.total_wins === 1 ? 'win' : 'wins'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-lg ${isLight 
                    ? 'bg-purple-100/80 border-2 border-purple-200/50' 
                    : 'bg-purple-500/20 border-2 border-purple-500/30'}`}>
                    <FontAwesomeIcon icon={faFire} className={`text-xl ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                  </div>
                  <h2 className={`text-2xl font-bold ${isLight 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent'}`}>
                    Recent Winners
                  </h2>
                </div>

                {recentWinners.length === 0 ? (
                  <div className={`text-center py-12 ${isLight 
                    ? 'bg-gray-100/50 border-2 border-gray-300/50' 
                    : 'bg-gray-800/30 border-2 border-gray-700/50'} rounded-xl`}>
                    <FontAwesomeIcon icon={faTrophy} className={`text-4xl ${isLight ? 'text-gray-400' : 'text-gray-500'} mb-4`} />
                    <p className={`${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                      No recent winners available for this time period.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentWinners.map(winner => (
                      <div
                        key={winner.matchup_id} 
                        className={`${isLight 
                          ? 'bg-white/60 hover:bg-white/80 border-2 border-gray-300/50' 
                          : 'bg-black/60 hover:bg-black/80 border-2 border-gray-700/50'} rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full ${isLight 
                                ? 'bg-purple-100 border-2 border-purple-200/50' 
                                : 'bg-purple-500/20 border-2 border-purple-500/30'} flex items-center justify-center`}>
                                <FontAwesomeIcon icon={faTrophy} className={`${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                              </div>
                              <span className={`${isLight 
                                ? 'bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent' 
                                : 'bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent'}`}>
                                {getTeamName(winner.team)}
                              </span>
                            </h3>
                            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1 ml-10`}>
                              {getTeamDescription(winner.team)} • Round {winner.round}
                            </p>
                          </div>
                          <div className="text-right">
                            <Link 
                              to={`/tournaments/${winner.tournament_id}`} 
                              className={`text-sm font-medium ${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'} transition-colors duration-300 hover:underline`}
                            >
                              {winner.tournament_name}
                            </Link>
                            <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1 flex items-center justify-end gap-1`}>
                              <FontAwesomeIcon icon={faGamepad} className={`${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                              {winner.game_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700 border-opacity-30">
                          <div className="flex gap-2">
                            <Link 
                              to={`/tournament-leaderboard/${winner.tournament_id}`}
                              className={`text-sm ${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'} transition-colors duration-300 hover:underline`}
                            >
                              View Leaderboard
                            </Link>
                            <span className={`${isLight ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
                            <Link 
                              to={`/tournaments/${winner.tournament_id}`}
                              className={`text-sm ${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'} transition-colors duration-300 hover:underline`}
                            >
                              Tournament Details
                            </Link>
                          </div>
                          <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            {new Date(winner.completed_at).toLocaleDateString()} • {new Date(winner.completed_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isLight 
            ? 'bg-white/95' 
            : 'bg-gray-900/95'} rounded-2xl p-6 max-w-2xl w-full mx-4 relative`}>
              <button 
              onClick={() => setSelectedTournament(null)}
              className={`absolute top-4 right-4 ${isLight 
                ? 'text-gray-600 hover:text-orange-600' 
                : 'text-gray-400 hover:text-orange-400'} transition-colors`}
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            <h2 className={`text-2xl font-bold mb-4 ${isLight 
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent' 
              : 'bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent'}`}>
              {selectedTournament.tournament_name}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Winner</h3>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${isLight 
                    ? 'bg-orange-100' 
                    : 'bg-orange-500/20'} flex items-center justify-center`}>
                    {selectedTournament.team_logo ? (
                      <img
                        src={selectedTournament.team_logo}
                        alt={selectedTournament.team_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <FontAwesomeIcon icon={faTrophy} className={`text-xl ${isLight ? 'text-orange-600' : 'text-orange-400'}`} />
                    )}
                  </div>
                  <span className={`font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>
                    {selectedTournament.team_name}
                  </span>
                </div>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Date</h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {new Date(selectedTournament.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Prize Pool</h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  ${selectedTournament.prize_pool.toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Participants</h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {selectedTournament.participants} teams
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Format</h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {selectedTournament.format}
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Game</h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {selectedTournament.game}
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Status</h3>
                <div className={`px-3 py-1 rounded-full inline-block ${
                  selectedTournament.status === 'Completed'
                    ? isLight
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-500/20 text-green-400'
                    : isLight
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-orange-500/20 text-orange-300'
                }`}>
                  {selectedTournament.status}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalLeaderboard; 