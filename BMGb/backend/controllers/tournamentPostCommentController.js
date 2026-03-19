const { TournamentPostComment, TournamentPost, User } = require('../models');
const { validateUUID } = require('../utils/validation');
const { Op } = require('sequelize');

// Create a comment
const createComment = async (req, res) => {
  try {
    const { Post_Id, Content, Parent_Comment_Id } = req.body;
    const Author_id = req.user.user_id;

    // Validate UUIDs
    if (!validateUUID(Post_Id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }
    
    if (Parent_Comment_Id && !validateUUID(Parent_Comment_Id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid parent comment ID format'
      });
    }

    // Check if post exists
    const post = await TournamentPost.findByPk(Post_Id);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // If this is a reply, check if parent comment exists
    if (Parent_Comment_Id) {
      const parentComment = await TournamentPostComment.findByPk(Parent_Comment_Id);
      if (!parentComment) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent comment not found'
        });
      }
    }

    // Create comment
    const comment = await TournamentPostComment.create({
      Post_Id,
      Author_id,
      Content,
      Parent_Comment_Id,
      Is_Reply: !!Parent_Comment_Id
    });

    // Increment the comment count for the post
    await post.increment('comment_count', { by: 1 });

    // Get author details
    const author = await User.findByPk(Author_id, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });

    return res.status(201).json({
      status: 'success',
      message: 'Comment created successfully',
      data: {
        comment: {
          ...comment.toJSON(),
          author
        }
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

// Get all comments for a post
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit) || null; // If limit is specified, use it
    
    // Validate UUID
    if (!validateUUID(postId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }

    // Check if post exists
    const post = await TournamentPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Get nested comments
    let comments = await TournamentPostComment.getNestedComments(postId);
    
    // Apply limit if specified - only to root comments
    if (limit && limit > 0) {
      comments = comments.slice(0, limit);
    }
    
    // Get author details for each comment
    const commentIds = [];
    const collectIds = (commentsArr) => {
      commentsArr.forEach(comment => {
        commentIds.push(comment.Author_id);
        if (comment.replies && comment.replies.length) {
          collectIds(comment.replies);
        }
      });
    };
    
    collectIds(comments);
    
    const authors = await User.findAll({
      where: { user_id: { [Op.in]: [...new Set(commentIds)] } },
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    const authorsMap = authors.reduce((map, author) => {
      map[author.user_id] = author;
      return map;
    }, {});
    
    // Add author to each comment
    const addAuthorToComment = (commentsArr) => {
      return commentsArr.map(comment => {
        const commentWithAuthor = {
          ...comment,
          author: authorsMap[comment.Author_id]
        };
        
        if (comment.replies && comment.replies.length) {
          commentWithAuthor.replies = addAuthorToComment(comment.replies);
        }
        
        return commentWithAuthor;
      });
    };
    
    const commentsWithAuthors = addAuthorToComment(comments);
    
    return res.status(200).json({
      status: 'success',
      data: {
        comments: commentsWithAuthors,
        total: post.comment_count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// Get a specific comment
const getComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Validate UUID
    if (!validateUUID(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid comment ID format'
      });
    }

    // Find comment
    const comment = await TournamentPostComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Get author details
    const author = await User.findByPk(comment.Author_id, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });

    return res.status(200).json({
      status: 'success',
      data: {
        comment: {
          ...comment.toJSON(),
          author
        }
      }
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch comment',
      error: error.message
    });
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { Content } = req.body;
    const userId = req.user.user_id;

    // Validate UUID
    if (!validateUUID(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid comment ID format'
      });
    }

    // Find comment
    const comment = await TournamentPostComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.Author_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this comment'
      });
    }

    // Update comment
    if (!Content) {
      return res.status(400).json({
        status: 'error',
        message: 'Content is required'
      });
    }

    await comment.update({ Content });

    return res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: {
        comment: comment.toJSON()
      }
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    // Validate UUID
    if (!validateUUID(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid comment ID format'
      });
    }

    // Find comment
    const comment = await TournamentPostComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check if user is the author or admin
    if (comment.Author_id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this comment'
      });
    }

    // Get the post to update comment count
    const post = await TournamentPost.findByPk(comment.Post_Id);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Associated post not found'
      });
    }

    // Count replies to this comment to decrement total count correctly
    const replyCount = await TournamentPostComment.count({
      where: { Parent_Comment_Id: commentId }
    });

    // Delete all replies to this comment
    await TournamentPostComment.destroy({
      where: { Parent_Comment_Id: commentId }
    });

    // Delete comment
    await comment.destroy();

    // Decrement comment count for the post (including the original comment and all replies)
    const totalToDecrement = 1 + replyCount;
    if (post.comment_count >= totalToDecrement) {
      await post.decrement('comment_count', { by: totalToDecrement });
    } else {
      // If count would go negative, just reset to 0
      await post.update({ comment_count: 0 });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

// Get all replies to a comment
const getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Validate UUID
    if (!validateUUID(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid comment ID format'
      });
    }

    // Find comment
    const comment = await TournamentPostComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Find replies
    const replies = await TournamentPostComment.findAll({
      where: { Parent_Comment_Id: commentId },
      order: [['created_at', 'ASC']]
    });
    
    // Get author details for each reply
    const authorIds = [...new Set(replies.map(reply => reply.Author_id))];
    const authors = await User.findAll({
      where: { user_id: { [Op.in]: authorIds } },
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    const authorsMap = authors.reduce((map, author) => {
      map[author.user_id] = author;
      return map;
    }, {});
    
    // Add author to each reply
    const repliesWithAuthors = replies.map(reply => ({
      ...reply.toJSON(),
      author: authorsMap[reply.Author_id]
    }));
    
    return res.status(200).json({
      status: 'success',
      data: {
        replies: repliesWithAuthors
      }
    });
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch replies',
      error: error.message
    });
  }
};

module.exports = {
  createComment,
  getPostComments,
  getComment,
  updateComment,
  deleteComment,
  getCommentReplies
}; 