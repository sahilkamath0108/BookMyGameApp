const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentMatchUp = sequelize.define('TournamentMatchUp', {
  matchup_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  player1: {
    type: DataTypes.UUID,
    references: {
      model: 'TournamentTeams',
      key: 'Team_id'
    }
  },
  player2: {
    type: DataTypes.UUID,
    references: {
      model: 'TournamentTeams',
      key: 'Team_id'
    }
  },
  winner: {
    type: DataTypes.UUID,
    references: {
      model: 'TournamentTeams',
      key: 'Team_id'
    }
  },
  round_tag: {
    type: DataTypes.INTEGER
  },
  tournament_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  scheduled_time: {
    type: DataTypes.DATE
  },
  completed_at: {
    type: DataTypes.DATE
  },
  room_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Game room/lobby code for the match'
  },
  room_password: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Password for the game room/lobby'
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
    }
  ]
});
// will need to review more in detail but look correct on a high level

// Get next round matchups
TournamentMatchUp.prototype.getNextRoundMatchups = async function() {
  try {
    if (!this.round_tag) {
      return { status: 'fail', message: 'Match round tag is not set' };
    }

    const roundOrder = [
      'RoundOf64',
      'RoundOf32',
      'RoundOf16',
      'RoundOf8',
      'SemiFinal',
      'Final',
      'ThirdPlace'
    ];
    
    const currentRoundIndex = roundOrder.indexOf(this.round_tag);
    if (currentRoundIndex === -1) {
      return { status: 'fail', message: 'Invalid round tag' };
    }
    
    if (currentRoundIndex === roundOrder.length - 1) {
      return { message: 'This is the final round', data: null };
    }
    
    const nextRoundMatches = await TournamentMatchUp.findAll({
      where: {
        tournament_id: this.tournament_id,
        round_tag: roundOrder[currentRoundIndex + 1]
      }
    });

    if (!nextRoundMatches.length) {
      return { message: 'No matches found in next round', data: [] };
    }

    return nextRoundMatches;
  } catch (error) {
    return { status: 'error', message: `Error fetching next round matchups: ${error.message}` };
  }
};

// Update bracket progression
TournamentMatchUp.prototype.progressToBracket = async function(winnerId) {
  try {
    if (!winnerId) {
      return { status: 'fail', message: 'Winner ID is required' };
    }

    if (this.winner) {
      return { status: 'fail', message: 'Match result already recorded' };
    }

    // Verify winner was a participant in this match
    if (winnerId !== this.player1 && winnerId !== this.player2) {
      return { status: 'fail', message: 'Winner must be one of the match participants' };
    }

    const nextRound = await this.getNextRoundMatchups();
    if (!nextRound || !nextRound.length) {
      // Update current match with winner
      await this.update({
        winner: winnerId,
        completed_at: new Date()
      });
      return { message: 'Final match completed', data: null };
    }

    // Calculate the position in the next round
    const currentMatchNumber = await TournamentMatchUp.count({
      where: {
        tournament_id: this.tournament_id,
        round_tag: this.round_tag,
        matchup_id: { [sequelize.Op.lt]: this.matchup_id }
      }
    });

    const nextMatchIndex = Math.floor(currentMatchNumber / 2);
    const nextMatch = nextRound[nextMatchIndex];

    if (!nextMatch) {
      return { status: 'error', message: 'Next round match not found' };
    }

    // Update current match with winner
    await this.update({
      winner: winnerId,
      completed_at: new Date()
    });

    // If this was an even-numbered match, set player2, otherwise set player1
    const isEvenMatch = currentMatchNumber % 2 === 1;
    await nextMatch.update({
      [isEvenMatch ? 'player2' : 'player1']: winnerId
    });

    return nextMatch;
  } catch (error) {
    return { status: 'error', message: `Error progressing bracket: ${error.message}` };
  }
};

// Static method to generate tournament bracket
TournamentMatchUp.generateBracket = async function(tournamentId, participants) {
  try {
    if (!tournamentId) {
      return { status: 'fail', message: 'Tournament ID is required' };
    }

    if (!participants || !participants.length) {
      return { status: 'fail', message: 'Participants array is required' };
    }

    const { Tournament } = require('./index');
    const tournament = await Tournament.findByPk(tournamentId);
    
    if (!tournament) {
      return { status: 'fail', message: 'Tournament not found' };
    }

    if (!tournament.Is_Bracket_Competition) {
      return { status: 'fail', message: 'Tournament is not a bracket competition' };
    }

    // Validate participant count
    if (participants.length < 2) {
      return { status: 'fail', message: 'At least 2 participants are required for a bracket' };
    }

    if (participants.length > tournament.Max_Players_Allowed) {
      return { status: 'fail', message: 'Participant count exceeds tournament limit' };
    }

    // Shuffle participants
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const matches = [];
    
    // Determine initial round based on number of participants
    let roundTag;
    if (shuffled.length <= 8) roundTag = 'RoundOf8';
    else if (shuffled.length <= 16) roundTag = 'RoundOf16';
    else if (shuffled.length <= 32) roundTag = 'RoundOf32';
    else if (shuffled.length <= 64) roundTag = 'RoundOf64';
    else return { status: 'fail', message: 'Too many participants for bracket generation' };

    // Create initial matchups
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        matches.push({
          player1: shuffled[i],
          player2: shuffled[i + 1],
          tournament_id: tournamentId,
          round_tag: roundTag
        });
      } else {
        // If odd number of participants, this player gets a bye
        matches.push({
          player1: shuffled[i],
          tournament_id: tournamentId,
          round_tag: roundTag
        });
      }
    }

    return await this.bulkCreate(matches);
  } catch (error) {
    return { status: 'error', message: `Error generating tournament bracket: ${error.message}` };
  }
};

module.exports = TournamentMatchUp; 