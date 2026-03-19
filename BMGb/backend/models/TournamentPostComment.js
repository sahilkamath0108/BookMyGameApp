const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentPostComment = sequelize.define('TournamentPostComment', {
  Comment_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  Post_Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'TournamentPosts',
      key: 'Post_id'
    }
  },
  Parent_Comment_Id: {
    type: DataTypes.UUID,
    references: {
      model: 'TournamentPostComments',
      key: 'Comment_id'
    }
  },
  Is_Reply: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  Content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  Author_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
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
      fields: ['Post_Id']
    }
  ]
});

// Static method to get nested comments
TournamentPostComment.getNestedComments = async function(postId) {
  const comments = await this.findAll({
    where: { Post_Id: postId },
    order: [['created_at', 'ASC']]
  });

  const commentMap = new Map();
  const rootComments = [];

  comments.forEach(comment => {
    commentMap.set(comment.Comment_id, {
      ...comment.toJSON(),
      replies: []
    });
  });

  comments.forEach(comment => {
    if (comment.Parent_Comment_Id) {
      const parentComment = commentMap.get(comment.Parent_Comment_Id);
      if (parentComment) {
        parentComment.replies.push(commentMap.get(comment.Comment_id));
      }
    } else {
      rootComments.push(commentMap.get(comment.Comment_id));
    }
  });

  return rootComments;
};

module.exports = TournamentPostComment; 