import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faArrowLeft,
  faExclamationTriangle,
  faMedal,
  faUsers,
  faCrown,
  faCalendarAlt,
  faGamepad,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';

const TournamentLeaderboard = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { colors, isLight } = React.useContext(ThemeContext);

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [winners, setWinners] = useState([]);
  const [rounds, setRounds] = useState({});
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMemberStats, setTeamMemberStats] = useState({});

  // Add useEffect to track state changes
  useEffect(() => {
    
  }, [teamMemberStats]);

  // Fetch tournament and matchup data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch tournament details
        const tournamentResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        if (tournamentResponse.data && tournamentResponse.data.data) {
          setTournament(tournamentResponse.data.data);
        }

        // Fetch matchups
        const matchupsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}`
        );

        if (matchupsResponse.data && matchupsResponse.data.status === 'success') {
          const matchupsData = matchupsResponse.data.data.matchups || [];
          setMatchups(matchupsData);
          
          // Organize matchups by round
          const roundsData = {};
          matchupsData.forEach(matchup => {
            const round = matchup.round_tag || 1;
            if (!roundsData[round]) {
              roundsData[round] = [];
            }
            roundsData[round].push(matchup);
          });
          setRounds(roundsData);
          
          // Extract winners
          const winnersList = matchupsData
            .filter(matchup => matchup.winner)
            .map(matchup => {
              // Find the winning team
              const winningTeam = matchup.winner === matchup.player1 
                ? matchup.Team1 
                : matchup.Team2;
              
              return {
                team_id: matchup.winner,
                team: winningTeam,
                round: matchup.round_tag,
                matchup_id: matchup.matchup_id
              };
            });
          
          // Count wins per team and sort
          const teamWins = {};
          winnersList.forEach(winner => {
            if (!teamWins[winner.team_id]) {
              teamWins[winner.team_id] = {
                team_id: winner.team_id,
                team: winner.team,
                wins: 0,
                highest_round: 0,
                stats: null // Initialize stats as null
              };
            }
            teamWins[winner.team_id].wins += 1;
            if (winner.round > teamWins[winner.team_id].highest_round) {
              teamWins[winner.team_id].highest_round = winner.round;
            }
          });
          
          // Convert to array and sort by highest round first, then by number of wins
          const sortedWinners = Object.values(teamWins).sort((a, b) => {
            if (b.highest_round !== a.highest_round) {
              return b.highest_round - a.highest_round;
            }
            return b.wins - a.wins;
          });
          
          // Fetch team stats for each winner
          const winnersWithStats = await Promise.all(
            sortedWinners.map(async (winner) => {
              try {
                const stats = await fetchTeamStats(winner.team_id);
                return {
                  ...winner,
                  stats: stats
                };
              } catch (error) {
                console.error(`Error fetching stats for team ${winner.team_id}:`, error);
                return winner;
              }
            })
          );

          
          setWinners(winnersWithStats);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError(error.response?.data?.message || 'Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId]);

  // Add function to fetch team stats
  const fetchTeamStats = async (teamId) => {
    try {
      const token = localStorage.getItem('token');
      
      
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/game-stats/team/${teamId}/tournament/${tournamentId}?includeIndividual=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.data || {};
    } catch (error) {
      console.error('Error fetching team stats:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return {};
    }
  };

  // Modify team expansion handler
  const handleTeamExpand = async (teamId) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
      setTeamMemberStats({});
      return;
    }

    setExpandedTeam(teamId);
    
    // Find the winner object for this team
    const winner = winners.find(w => w.team_id === teamId);
    if (winner && winner.stats) {
       
      setTeamMemberStats(winner.stats.members || {});
    } else {
      // If stats not found in winners, fetch them
      const stats = await fetchTeamStats(teamId);
      setTeamMemberStats(stats.members || {});
      
      // Update the winner's stats
      const updatedWinners = winners.map(w => 
        w.team_id === teamId ? { ...w, stats } : w
      );
      setWinners(updatedWinners);
    }
  };

  // Helper function to get team name
  const getTeamName = (team) => {
     
    if (!team) return 'Unknown Player';
    
    // Check if this is a solo tournament
    if (tournament && (tournament.Team_Size_Limit === 1 || tournament.Is_Team_Based === false)) {
      // For solo tournaments, try to get player name
      if (team.Members && team.Members[0] && team.Members[0].Name) {
        return team.Members[0].Name;
      }
      // Fallback to team_members if Members doesn't exist
      if (team.team_members && team.team_members.length > 0) {
        // team_members might contain user objects or just IDs
        const firstMember = team.team_members[0];
        if (firstMember && typeof firstMember === 'object' && firstMember.Name) {
          return firstMember.Name;
        }
        if (firstMember && typeof firstMember === 'object' && firstMember.GamerTag) {
          return firstMember.GamerTag;
        }
      }
      return 'Unknown Player';
    }
    
    // For team tournaments, return team name
    return team.Team_Name || `Team ${team.Team_Number}`;
  };

  // Helper function to get rank medal
  const getRankMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F05454]"></div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error || 'Failed to load tournament data'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="flex items-center gap-2 text-[#F05454]  transition duration-200 px-4 py-2 border border-[#F05454] rounded-lg hover:bg-[#F05454] hover:text-white"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Tournament Details</span>
          </button>
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
        {/* Back button */}
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
            : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl mb-8 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Tournament</span>
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
                Tournament Leaderboard
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-blue-600/10 to-cyan-600/10 border border-blue-500/20 text-blue-700' 
                  : 'from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-blue-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faTrophy} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                  <span className="font-semibold">🏆 Elite Rankings</span>
                </div>
                <div className={`flex items-center gap-2 ${isLight 
                  ? 'bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-300/50' 
                  : 'bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50'}`}>
                  <FontAwesomeIcon icon={faGamepad} className={isLight ? 'text-red-600' : 'text-red-400'} />
                  <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{tournament.GameName || "Game"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="md:col-span-2 bg-gradient-to-br from-gray-100/10 to-gray-200/10 dark:from-gray-800/20 dark:to-gray-900/20 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/30 dark:border-gray-700/30 shadow-2xl transition-all duration-300 hover:shadow-3xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <FontAwesomeIcon icon={faChartLine} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
              Tournament Rankings
            </h2>

            {winners.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-gray-200/40 to-gray-300/40 border border-gray-300/50 dark:from-gray-500/10 dark:to-gray-600/10 dark:border-gray-500/30 rounded-xl">
                <FontAwesomeIcon icon={faTrophy} className={`text-4xl ${isLight ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                <p className={`text-xl ${isLight ? 'text-gray-700 font-bold' : 'text-gray-300 font-semibold'}`}>No winners yet. Check back after matches have been completed.</p>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>Your next challenge awaits...</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-300/30 dark:border-gray-700/30 shadow-lg">
                <table className="min-w-full divide-y divide-gray-300/30 dark:divide-gray-700/30">
                  <thead className={`${isLight 
                    ? 'bg-gradient-to-r from-gray-100/80 to-gray-200/80' 
                    : 'bg-gradient-to-r from-gray-800/80 to-gray-900/80'} backdrop-blur-sm`}>
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Team</th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Highest Round</th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Wins</th>
                    </tr>
                  </thead>
                  <tbody className={`${isLight 
                    ? 'bg-white/50' 
                    : 'bg-gray-900/50'} divide-y divide-gray-300/30 dark:divide-gray-700/30`}>
                    {winners.map((winner, index) => (
                      <React.Fragment key={winner.team_id}>
                        <tr 
                          className={`transition-all duration-300 ${
                            index < 3 
                              ? isLight 
                                ? 'bg-gradient-to-r from-yellow-50/50 to-amber-50/50 hover:from-yellow-100/50 hover:to-amber-100/50' 
                                : 'bg-gradient-to-r from-yellow-900/20 to-amber-900/20 hover:from-yellow-800/30 hover:to-amber-800/30'
                              : isLight
                                ? 'hover:bg-gray-100/50'
                                : 'hover:bg-gray-800/50'
                          } cursor-pointer`}
                          onClick={() => handleTeamExpand(winner.team_id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center">
                              {index < 3 ? (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  index === 0 
                                    ? isLight 
                                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300/50' 
                                      : 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-500/50'
                                    : index === 1
                                      ? isLight
                                        ? 'bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-gray-300/50'
                                        : 'bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-gray-500/50'
                                      : isLight
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-2 border-amber-300/50'
                                        : 'bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-500/50'
                                }`}>
                                  {index === 0 && <FontAwesomeIcon icon={faCrown} className="text-white" />}
                                  {index === 1 && <span className="text-white font-bold">2</span>}
                                  {index === 2 && <span className="text-white font-bold">3</span>}
                                </div>
                              ) : (
                                <span className={`text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-full ${
                                index === 0 
                                  ? isLight 
                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300/50' 
                                    : 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-500/50'
                                  : index === 1
                                    ? isLight
                                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-gray-300/50'
                                      : 'bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-gray-500/50'
                                    : index === 2
                                      ? isLight
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-2 border-amber-300/50'
                                        : 'bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-500/50'
                                      : isLight
                                        ? 'bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-gray-300/50'
                                        : 'bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-gray-500/50'
                              } flex items-center justify-center text-white font-bold`}>
                                {index === 0 && <FontAwesomeIcon icon={faCrown} />}
                                {index !== 0 && (winner.team?.Team_Number || '?')}
                              </div>
                              <div className="ml-4">
                                <div className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                  {tournament && (tournament.Team_Size_Limit === 1 || tournament.Is_Team_Based === false)
                                    ? (winner.team && winner.team.Members && winner.team.Members[0] && winner.team.Members[0].Name)
                                    : (winner.stats?.team_name || winner.team?.team_name || `Team #${index + 1}`)
                                  }
                                </div>
                                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {winner.team?.team_members?.length || 0} members
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isLight
                                ? 'bg-blue-100 text-blue-700 border border-blue-200/50'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              Round {winner.highest_round || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isLight
                                ? 'bg-green-100 text-green-700 border border-green-200/50'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {winner.wins || 0} {winner.wins === 1 ? 'win' : 'wins'}
                            </span>
                          </td>
                        </tr>
                        {expandedTeam === winner.team_id && winner.stats && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4">
                              <div className={`${isLight 
                                ? 'bg-gradient-to-br from-gray-100/80 to-gray-200/80' 
                                : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80'} rounded-xl p-6 border border-gray-300/30 dark:border-gray-700/30`}>
                                <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                  {teamMemberStats.team_name || winner.team?.team_name || `Team #${index + 1}`}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(winner.stats.members || {}).map(([memberId, memberStats]) => (
                                    <div key={memberId} className={`${isLight 
                                      ? 'bg-white/50 border border-gray-300/30' 
                                      : 'bg-gray-800/50 border border-gray-700/30'} rounded-xl p-4 transition-all duration-300 hover:shadow-lg`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <h4 className={`font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                            {String(memberStats.Name || 'Unknown')}
                                          </h4>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        {memberStats.aggregated_stats && Object.entries(memberStats.aggregated_stats).map(([statKey, statValue]) => (
                                          <React.Fragment key={statKey}>
                                            <div className={isLight ? 'text-gray-600' : 'text-gray-400'}>{statKey.charAt(0).toUpperCase() + statKey.slice(1)}</div>
                                            <div className={isLight ? 'text-gray-800' : 'text-white'}>{Number(statValue)}</div>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className={`mt-4 p-4 ${isLight 
                                  ? 'bg-white/50 border border-gray-300/30' 
                                  : 'bg-gray-800/50 border border-gray-700/30'} rounded-xl`}>
                                  <h4 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-800' : 'text-white'}`}>Team Totals</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {winner.stats.team_totals && Object.entries(winner.stats.team_totals).map(([statKey, statValue]) => (
                                      <React.Fragment key={statKey}>
                                        <div className={isLight ? 'text-gray-600' : 'text-gray-400'}>{statKey.charAt(0).toUpperCase() + statKey.slice(1)}</div>
                                        <div className={isLight ? 'text-gray-800' : 'text-white'}>{Number(statValue)}</div>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tournament Stats/Info */}
          <div className="md:col-span-1 space-y-6">
            {/* Tournament Summary */}
            <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Tournament Summary</h2>
              <div className="space-y-4">
                <div className="p-3 bg-opacity-20 bg-gray-500 rounded-lg">
                  <p className="text-sm opacity-80 mb-1">Status</p>
                  <p className="text-base font-semibold">{tournament.Status}</p>
                </div>
                <div className="p-3 bg-opacity-20 bg-gray-500 rounded-lg">
                  <p className="text-sm opacity-80 mb-1">Total Rounds</p>
                  <p className="text-xl font-semibold">{Object.keys(rounds).length}</p>
                </div>
                <div className="p-3 bg-opacity-20 bg-gray-500 rounded-lg">
                  <p className="text-sm opacity-80 mb-1">Prize Pool</p>
                  <p className="text-xl font-semibold">{tournament.Prize_Amount} {tournament.Currency}</p>
                </div>
              </div>
            </div>
            {/* Latest Matches */}
            <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Latest Matches</h2>
              {matchups.length === 0 ? (
                <div className="text-center py-8 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-gray-400">No matches have been played yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchups
                    .filter(matchup => matchup.winner)
                    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
                    .slice(0, 5)
                    .map(matchup => {
                      const team1 = matchup.Team1;
                      const team2 = matchup.Team2;
                      const team1Name = getTeamName(team1);
                      const team2Name = getTeamName(team2);
                      const winnerName = matchup.winner === matchup.player1 ? team1Name : team2Name;
                      const isTeam1Winner = matchup.winner === matchup.player1;
                      return (
                        <div key={matchup.matchup_id} className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs ${isTeam1Winner ? 'text-green-400' : 'text-gray-400'}`}>{team1Name}</span>
                            <span className="text-xs bg-green-500 bg-opacity-20 text-green-500 px-2 py-1 rounded-full">Completed</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className={`flex items-center gap-1 ${isTeam1Winner ? 'font-bold text-green-500' : ''}`}>{isTeam1Winner && <FontAwesomeIcon icon={faTrophy} className="text-yellow-400" />}<span>{team1Name}</span></div>
                            <span className="text-xs">vs</span>
                            <div className={`flex items-center gap-1 ${!isTeam1Winner ? 'font-bold text-green-500' : ''}`}>{!isTeam1Winner && <FontAwesomeIcon icon={faTrophy} className="text-yellow-400" />}<span>{team2Name}</span></div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 border-opacity-30 text-xs text-gray-400">
                            <div className="flex justify-between">
                              <span>Winner: <span className="text-green-400">{winnerName}</span></span>
                              <span>{new Date(matchup.completed_at || matchup.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentLeaderboard; 