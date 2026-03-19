const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentParticipant = sequelize.define('TournamentParticipant', {
  participant_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    unique: true
  },
  participation_status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'soft_confirmed'),
    defaultValue: 'pending'
  },
  user_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  tournament_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  last_update_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  updatedAt: 'last_update_at',
  createdAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'tournament_id']
    },
    {
      fields: ['participation_status']
    }
  ]
});

// Static method to find and lock a slot
TournamentParticipant.findAndLockSlot = async function(tournamentId, transaction) {
  return await this.findOne({
    where: {
      tournament_id: tournamentId,
      participation_status: 'pending',
      user_id: null
    },
    lock: transaction.LOCK.UPDATE,
    skipLocked: true,
    transaction
  });
};

// Static method to confirm a slot
TournamentParticipant.confirmSlot = async function(participantId, userId, transaction) {
  return await this.update(
    {
      user_id: userId,
      participation_status: 'confirmed',
      // timestamps to be stored in utc format 
      last_update_at: new Date().toISOString()
    },
    {
      where: {
        participant_id: participantId,
        participation_status: ['pending', 'soft_confirmed']
      },
      transaction
    }
  );
};

// Static method to soft confirm a slot (payment pending)
TournamentParticipant.softConfirmSlot = async function(participantId, userId, transaction) {
  return await this.update(
    {
      user_id: userId,
      participation_status: 'soft_confirmed',
      last_update_at: new Date().toISOString()
    },
    {
      where: {
        participant_id: participantId,
        participation_status: 'pending'
      },
      transaction
    }
  );
};

module.exports = TournamentParticipant; 