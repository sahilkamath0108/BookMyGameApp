const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentContent = sequelize.define('TournamentContent', {
  content_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content_type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false
  },
  author_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  placement: {
    type: DataTypes.ENUM('banner', 'side_tab'),
    allowNull: false
  },
  content_url: {
    type: DataTypes.STRING,
    comment: 's3 asset link'
  },
  tournament_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
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

module.exports = TournamentContent; 