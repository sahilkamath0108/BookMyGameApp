import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCrown, faUsers, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const getTeamDisplayName = (team, isTeamBased = true) => {
  if (!team) return 'TBD';
  
  // For solo tournaments, show the player name instead of team name
  if (!isTeamBased && team.Members && team.Members.length > 0) {
    const player = team.Members[0];
    return player.Name || player.name || 'Unknown Player';
  }
  
  // For team tournaments, show team name
  if (team.name) return team.name;
  if (team.Team_Name) return team.Team_Name;
  if (team.team_name) return team.team_name;
  if (team.Team_Number) return `Team #${team.Team_Number}`;
  if (team.number) return `Team #${team.number}`;
  if (team.Team_id) return `Team ${team.Team_id.slice(-4)}`;
  return 'Unknown Team';
};

const BracketMatchupsView = ({ tournamentId, isLight, embedInLeaderboard = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchupsByRound, setMatchupsByRound] = useState({});
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [isTeamBased, setIsTeamBased] = useState(true);

  const fetchMatchups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      if (response.data && response.data.status === 'success') {
        const matchupsData = response.data.data.matchups || [];
        const tournamentData = response.data.data.tournament || {};
        
        // Detect if this is a team-based tournament
        const teamBased = tournamentData.isTeamBased !== undefined ? tournamentData.isTeamBased : true;
        setIsTeamBased(teamBased);
        
        // Group by round
        const byRound = {};
        matchupsData.forEach((matchup) => {
          const round = matchup.round_tag || matchup.round || 1;
          if (!byRound[round]) byRound[round] = [];
          byRound[round].push(matchup);
        });
        const roundKeys = Object.keys(byRound).sort((a, b) => Number(a) - Number(b));
        setMatchupsByRound(byRound);
        setRounds(roundKeys);
        setSelectedRound(roundKeys.length > 0 ? roundKeys[roundKeys.length - 1] : null); // Default to latest round
      } else {
        setError('Failed to load matchups');
      }
    } catch (err) {
      setError('Failed to load matchups');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  if (loading) {
    return embedInLeaderboard ? (
      <div className="py-8 text-center text-gray-400">
        <FontAwesomeIcon icon={faTrophy} className="animate-spin text-xl mb-2" />
        <div>Loading bracket matchups...</div>
      </div>
    ) : (
      <div className={`my-8 p-8 rounded-2xl text-center ${isLight ? 'bg-white/60 text-gray-700' : 'bg-black/60 text-white'} border border-gray-300/30`}>
        <FontAwesomeIcon icon={faTrophy} className="animate-spin text-3xl mb-2" />
        <div>Loading bracket matchups...</div>
      </div>
    );
  }
  if (error) {
    return embedInLeaderboard ? (
      <div className="py-8 text-center text-red-400">
        <FontAwesomeIcon icon={faTimesCircle} className="text-xl mb-2" />
        <div>{error}</div>
      </div>
    ) : (
      <div className={`my-8 p-8 rounded-2xl text-center ${isLight ? 'bg-red-100 text-red-700' : 'bg-red-900 text-red-300'} border border-red-300/30`}>
        <FontAwesomeIcon icon={faTimesCircle} className="text-2xl mb-2" />
        <div>{error}</div>
      </div>
    );
  }
  if (!rounds.length) {
    return null;
  }
  // UI for round selector
  const roundSelector = (
    <div className="mb-4 flex flex-wrap gap-2 items-center">
      <span className={`font-semibold text-sm ${isLight ? 'text-orange-700' : 'text-orange-300'}`}>Round:</span>
      {rounds.map((round) => (
        <button
          key={round}
          onClick={() => setSelectedRound(round)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200
            ${selectedRound === round
              ? isLight
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-orange-600 text-white border-orange-400'
              : isLight
                ? 'bg-white border-gray-300 text-orange-700 hover:bg-orange-100'
                : 'bg-black border-gray-700 text-orange-300 hover:bg-orange-900'}
          `}
        >
          {round}
        </button>
      ))}
    </div>
  );
  // Only show matchups for the selected round
  const matchups = matchupsByRound[selectedRound] || [];
  return embedInLeaderboard ? (
    <div className="mt-6">
      {rounds.length > 1 && roundSelector}
      <div className="space-y-4">
        {matchups.map((matchup) => {
          const team1 = matchup.Team1 || matchup.team1 || null;
          const team2 = matchup.Team2 || matchup.team2 || null;
          const winnerId = matchup.winner;
          return (
            <div
              key={matchup.matchup_id}
              className={`flex flex-col md:flex-row items-center md:items-stretch justify-between gap-4 p-3 rounded-xl border ${isLight ? 'border-gray-200 bg-white/60' : 'border-gray-700 bg-black/30'} shadow-sm`}
            >
              <div className={`flex-1 flex flex-col items-center md:items-end ${winnerId === (team1?.Team_id || team1?.id || team1?.team_id) ? 'font-bold text-green-600' : ''}`}>
                <FontAwesomeIcon icon={isTeamBased ? faUsers : faCrown} className="mb-1" />
                <span>{getTeamDisplayName(team1, isTeamBased)}</span>
                {winnerId === (team1?.Team_id || team1?.id || team1?.team_id) && (
                  <span className="flex items-center gap-1 text-green-600 text-xs mt-1"><FontAwesomeIcon icon={faCheckCircle} /> Winner</span>
                )}
              </div>
              <div className="mx-4 text-xl font-bold text-gray-400">vs</div>
              <div className={`flex-1 flex flex-col items-center md:items-start ${winnerId === (team2?.Team_id || team2?.id || team2?.team_id) ? 'font-bold text-green-600' : ''}`}>
                <FontAwesomeIcon icon={isTeamBased ? faUsers : faCrown} className="mb-1" />
                <span>{getTeamDisplayName(team2, isTeamBased)}</span>
                {winnerId === (team2?.Team_id || team2?.id || team2?.team_id) && (
                  <span className="flex items-center gap-1 text-green-600 text-xs mt-1"><FontAwesomeIcon icon={faCheckCircle} /> Winner</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className={`my-8 p-8 rounded-2xl shadow-2xl ${isLight ? 'bg-white/80 border border-gray-300/50' : 'bg-black/80 border border-gray-700/50'}`}>
      <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-3`}>
        <FontAwesomeIcon icon={faTrophy} className="text-orange-400" />
        {isTeamBased ? 'Bracket Matchups' : 'Tournament Battles'}
      </h2>
      {rounds.length > 1 && roundSelector}
      <div className="space-y-4">
        {matchups.map((matchup) => {
          const team1 = matchup.Team1 || matchup.team1 || null;
          const team2 = matchup.Team2 || matchup.team2 || null;
          const winnerId = matchup.winner;
          return (
            <div
              key={matchup.matchup_id}
              className={`flex flex-col md:flex-row items-center md:items-stretch justify-between gap-4 p-4 rounded-xl border ${isLight ? 'border-gray-200 bg-white/80' : 'border-gray-700 bg-black/40'} shadow`}
            >
              <div className={`flex-1 flex flex-col items-center md:items-end ${winnerId === (team1?.Team_id || team1?.id || team1?.team_id) ? 'font-bold text-green-600' : ''}`}>
                <FontAwesomeIcon icon={isTeamBased ? faUsers : faCrown} className="mb-1" />
                <span>{getTeamDisplayName(team1, isTeamBased)}</span>
                {winnerId === (team1?.Team_id || team1?.id || team1?.team_id) && (
                  <span className="flex items-center gap-1 text-green-600 text-xs mt-1"><FontAwesomeIcon icon={faCheckCircle} /> Winner</span>
                )}
              </div>
              <div className="mx-4 text-xl font-bold text-gray-400">vs</div>
              <div className={`flex-1 flex flex-col items-center md:items-start ${winnerId === (team2?.Team_id || team2?.id || team2?.team_id) ? 'font-bold text-green-600' : ''}`}>
                <FontAwesomeIcon icon={isTeamBased ? faUsers : faCrown} className="mb-1" />
                <span>{getTeamDisplayName(team2, isTeamBased)}</span>
                {winnerId === (team2?.Team_id || team2?.id || team2?.team_id) && (
                  <span className="flex items-center gap-1 text-green-600 text-xs mt-1"><FontAwesomeIcon icon={faCheckCircle} /> Winner</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BracketMatchupsView; 