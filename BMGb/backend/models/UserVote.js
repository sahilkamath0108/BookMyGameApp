const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserVote = sequelize.define('UserVote', {
  vote_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  post_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'TournamentPosts',
      key: 'Post_id'
    }
  },
  vote_type: {
    type: DataTypes.ENUM('upvote', 'downvote'),
    allowNull: false
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
      unique: true,
      fields: ['user_id', 'post_id'],
      name: 'user_post_unique_vote'
    }
  ]
});

module.exports = UserVote; 