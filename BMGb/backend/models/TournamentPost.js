const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { getPresignedUrl } = require('../utils/s3Service');

const TournamentPost = sequelize.define('TournamentPost', {
  Post_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  Title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  Content: {
    type: DataTypes.TEXT,
    comment: 'Content stored in markdown format'
  },
  Tournament_Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  Image_Urls: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of image URLs stored in S3 or other storage'
  },
  Image_Keys: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of S3 image keys for easier deletion management'
  },
  UpVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  DownVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  comment_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  Is_Sponsored_Post: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
      fields: ['Tournament_Id']
    }
  ]
});

// Get post with nested comments and vote count
TournamentPost.prototype.getPostWithDetails = async function() {
  const { TournamentPostComment } = require('./index');
  return TournamentPost.findOne({
    where: { Post_id: this.Post_id },
    include: [{
      model: TournamentPostComment,
      as: 'Comments',
      include: [{
        model: TournamentPostComment,
        as: 'Replies'
      }]
    }],
    attributes: {
      include: [
        [
          sequelize.literal('("UpVotes" - "DownVotes")'),
          'vote_score'
        ]
      ]
    }
  });
};

// Update vote count
TournamentPost.prototype.updateVotes = async function(isUpvote, isRemovingVote = false) {
  const voteField = isUpvote ? 'UpVotes' : 'DownVotes';
  const increment = isRemovingVote ? -1 : 1;
  
  return await this.increment({
    [voteField]: increment
  });
};

// Get trending posts for a tournament  
TournamentPost.getTrendingPosts = async function(tournamentId, limit = 10) {
  return await this.findAll({
    where: { 
      Tournament_Id: tournamentId,
    },
    attributes: {
      include: [
        [
          sequelize.literal('("UpVotes" - "DownVotes")'),
          'vote_score'
        ]
      ]
    },
    order: [
      [sequelize.literal('"vote_score"'), 'DESC'],
      ['created_at', 'DESC']
    ],
    limit
  });
};

// Refresh presigned URLs for post images
TournamentPost.prototype.refreshImageUrls = async function() {
  try {
    // Check if the post has image keys
    if (!this.Image_Keys || !this.Image_Keys.length) {
      return {
        status: 'success',
        message: 'No images to refresh',
        imageUrls: [],
        imageKeys: []
      };
    }

    // Generate fresh presigned URLs for all images
    const refreshedUrls = await Promise.all(
      this.Image_Keys.map(async (key) => {
        const result = await getPresignedUrl(key);
        return result.status === 'success' ? result.url : null;
      })
    );

    // Filter out any failed URLs
    const validUrls = refreshedUrls.filter(url => url !== null);

    return {
      status: 'success',
      imageUrls: validUrls,
      imageKeys: this.Image_Keys
    };
  } catch (error) {
    console.error('Error refreshing post image URLs:', error);
    return {
      status: 'error',
      message: `Error refreshing image URLs: ${error.message}`,
      imageUrls: [],
      imageKeys: []
    };
  }
};

module.exports = TournamentPost; 

