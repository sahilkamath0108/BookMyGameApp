const { TournamentPost, Tournament, User, TournamentPostComment, UserVote, UserAdmin } = require('../models');
const { validateUUID } = require('../utils/validation');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { uploadToS3, deleteFromS3, getPresignedUrl, getKeyFromUrl } = require('../utils/s3Service');

// Create a tournament post
const createPost = async (req, res) => {
  try {
    const { Tournament_Id, Title, Content, Is_Sponsored_Post } = req.body;
    const Author_id = req.user.user_id;

    // Validate UUIDs
    if (!validateUUID(Tournament_Id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid tournament ID format'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(Tournament_Id);
    if (!tournament) {
      return res.status(404).json({
        status: 'error',
        message: 'Tournament not found'
      });
    }

    // Validate required fields
    if (!Title) {
      return res.status(400).json({
        status: 'error',
        message: 'Post title is required'
      });
    }

    // Handle image uploads if files are present
    let imageUrls = [];
    let imageKeys = []; // Store image keys for future reference
    
    if (req.files && req.files.length > 0) {
      // Upload each image to S3
      const uploadPromises = req.files.map(file => 
        uploadToS3(file, `posts/${Tournament_Id}`)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Filter successful uploads
      const successfulUploads = uploadResults.filter(result => result.status === 'success');
      imageUrls = successfulUploads.map(result => result.url);
      imageKeys = successfulUploads.map(result => result.key);
      
      // If some uploads failed but others succeeded, continue with the successful ones
      const failedUploads = uploadResults.filter(result => result.status !== 'success');
      if (failedUploads.length > 0) {
        console.warn(`${failedUploads.length} image uploads failed`);
      }
    }

    // Create post with image URLs if provided
    const post = await TournamentPost.create({
      Tournament_Id,
      Author_id,
      Title,
      Content,
      Image_Urls: imageUrls || [],
      Image_Keys: imageKeys || [], // Store the S3 keys for easier deletion later
      Is_Sponsored_Post: Is_Sponsored_Post || false
    });

    // Get author details
    const author = await User.findByPk(Author_id, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });

    return res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: {
        post: {
          ...post.toJSON(),
          author
        }
      }
    });
  } catch (error) {
    console.error('Error creating tournament post:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Get a specific post with comments
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate UUID
    if (!validateUUID(postId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }

    // Find post
    const post = await TournamentPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Get post with details (including comments)
    const postWithDetails = await post.getPostWithDetails();
    
    // Get author details
    const author = await User.findByPk(post.Author_id, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    // Create a copy of the post data to modify
    const postData = postWithDetails.toJSON();
    
    // Refresh presigned URLs for images if they exist
    if (postData.Image_Keys && postData.Image_Keys.length > 0) {
      try {
        
        
        // Use the model method to refresh all image URLs
        const refreshResult = await post.refreshImageUrls();
        
        if (refreshResult.status === 'success') {
          postData.Image_Urls = refreshResult.imageUrls;
          
        } else {
          console.error('Failed to refresh image URLs:', refreshResult.message);
        }
      } catch (err) {
        console.error('Error refreshing image URLs:', err);
        // Continue with original URLs if refresh fails
      }
    }

    // If author has a profile image, generate a presigned URL
    if (author && author.profile_pic) {
      // Generate a presigned URL for the profile image
      try {
        const refreshResult = await author.refreshProfileImage();
        if (refreshResult.status === 'success') {
          author.dataValues.profile_pic_url = refreshResult.url;
        }
      } catch (error) {
        console.error('Error refreshing author profile image:', error);
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        post: {
          ...postData,
          author
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tournament post:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

// Get all posts for a tournament
const getTournamentPosts = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { page = 1, limit = 10, sort = 'latest' } = req.query;
    
    // Validate UUID
    if (!validateUUID(tournamentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid tournament ID format'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'error',
        message: 'Tournament not found'
      });
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Determine sort order
    let order;
    if (sort === 'trending') {
      order = [
        [sequelize.literal('("UpVotes" - "DownVotes")'), 'DESC'],
        ['created_at', 'DESC']
      ];
    } else {
      // Default is latest
      order = [['created_at', 'DESC']];
    }
    
    // Fetch posts
    const posts = await TournamentPost.findAndCountAll({
      where: { Tournament_Id: tournamentId },
      limit: parseInt(limit),
      offset,
      order,
      attributes: {
        include: [
          [
            sequelize.literal('("UpVotes" - "DownVotes")'),
            'vote_score'
          ]
        ]
      }
    });
    
    // Get author details for each post
    const authorIds = [...new Set(posts.rows.map(post => post.Author_id))];
    const authors = await User.findAll({
      where: { user_id: { [Op.in]: authorIds } },
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    const authorsMap = authors.reduce((map, author) => {
      map[author.user_id] = author;
      return map;
    }, {});
    
    // Prepare post data with authors and refresh presigned URLs
    const postsWithAuthors = await Promise.all(posts.rows.map(async post => {
      const postData = post.toJSON();
      
      // Refresh presigned URLs for images if they exist
      if (postData.Image_Keys && postData.Image_Keys.length > 0) {
        try {
          const refreshResult = await post.refreshImageUrls();
          if (refreshResult.status === 'success') {
            postData.Image_Urls = refreshResult.imageUrls;
          }
        } catch (err) {
          console.error(`Error refreshing image URLs for post ${post.Post_id}:`, err);
        }
      }
      
      // Get the author and refresh profile image if available
      const author = authorsMap[post.Author_id];
      const authorData = author ? { ...author.toJSON() } : { Name: 'Anonymous' };
      
      // Add profile pic URL if author has a profile pic
      if (author && author.profile_pic) {
        try {
          const refreshResult = await author.refreshProfileImage();
          if (refreshResult.status === 'success') {
            authorData.profile_pic_url = refreshResult.url;
          }
        } catch (error) {
          console.error(`Error refreshing author profile image for author ${author.user_id}:`, error);
        }
      }
      
      return {
        ...postData,
        author: authorData
      };
    }));
    
    return res.status(200).json({
      status: 'success',
      data: {
        posts: postsWithAuthors,
        pagination: {
          total: posts.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(posts.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tournament posts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get all posts across all tournaments
const getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'latest' } = req.query;
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Determine sort order
    let order;
    if (sort === 'trending') {
      order = [
        [sequelize.literal('("UpVotes" - "DownVotes")'), 'DESC'],
        ['created_at', 'DESC']
      ];
    } else {
      // Default is latest
      order = [['created_at', 'DESC']];
    }
    
    // Fetch all posts
    const posts = await TournamentPost.findAndCountAll({
      limit: parseInt(limit),
      offset,
      order,
      attributes: {
        include: [
          [
            sequelize.literal('("UpVotes" - "DownVotes")'),
            'vote_score'
          ]
        ]
      },
      include: [
        {
          model: Tournament,
          as: 'Tournament',
          attributes: ['tournament_id', 'tournament_Name', 'GameName']
        }
      ]
    });
    
    // Get author details for each post
    const authorIds = [...new Set(posts.rows.map(post => post.Author_id))];
    const authors = await User.findAll({
      where: { user_id: { [Op.in]: authorIds } },
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    const authorsMap = authors.reduce((map, author) => {
      map[author.user_id] = author;
      return map;
    }, {});
    
    // Prepare post data with authors and refresh presigned URLs if needed
    const postsWithAuthors = await Promise.all(posts.rows.map(async post => {
      const postData = post.toJSON();
      
      // Refresh presigned URLs for images if they exist
      if (postData.Image_Keys && postData.Image_Keys.length > 0) {
        try {
          // Use the model method to refresh all image URLs
          const refreshResult = await post.refreshImageUrls();
          
          if (refreshResult.status === 'success') {
            postData.Image_Urls = refreshResult.imageUrls;
          }
        } catch (err) {
          console.error(`Error refreshing image URLs for post ${post.Post_id}:`, err);
          // Continue with original URLs if refresh fails
        }
      }
      
      // Get the author and refresh profile image if available
      const author = authorsMap[post.Author_id];
      if (author && author.profile_pic) {
        // Create a copy of the author data to modify
        const authorData = { ...author.toJSON() };
        
        // Refresh the author's profile image URL
        try {
          const refreshResult = await author.refreshProfileImage();
          if (refreshResult.status === 'success') {
            authorData.profile_pic_url = refreshResult.url;
          }
        } catch (error) {
          console.error(`Error refreshing author profile image for author ${author.user_id}:`, error);
        }
        
        return {
          ...postData,
          author: authorData
        };
      }
      
      return {
        ...postData,
        author: authorsMap[post.Author_id]
      };
    }));    
    
    return res.status(200).json({
      status: 'success',
      data: {
        posts: postsWithAuthors,
        pagination: {
          total: posts.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(posts.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get trending posts for a tournament
const getTrendingPosts = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { limit = 10 } = req.query;
    
    // Validate UUID
    if (!validateUUID(tournamentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid tournament ID format'
      });
    }

    // Get trending posts
    const trendingPosts = await TournamentPost.getTrendingPosts(tournamentId, parseInt(limit));
    
    // Get author details for each post
    const authorIds = [...new Set(trendingPosts.map(post => post.Author_id))];
    const authors = await User.findAll({
      where: { user_id: { [Op.in]: authorIds } },
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    const authorsMap = authors.reduce((map, author) => {
      map[author.user_id] = author;
      return map;
    }, {});
    
    // Prepare post data with authors and refresh presigned URLs if needed
    const postsWithAuthors = await Promise.all(trendingPosts.map(async post => {
      const postData = post.toJSON();
      
      // Refresh presigned URLs for images if they exist
      if (postData.Image_Urls && postData.Image_Urls.length > 0) {
        try {
          
          const refreshedImageUrls = await Promise.all(
            postData.Image_Urls.map(async (imageUrl, index) => {
              // If we have the key directly, use it instead of extracting from URL
              const key = (postData.Image_Keys && postData.Image_Keys[index]) 
                ? postData.Image_Keys[index] 
                : getKeyFromUrl(imageUrl);
              
              if (key) {
                const result = await getPresignedUrl(key);
                
                return result.status === 'success' ? result.url : imageUrl;
              }
              
              return imageUrl;
            })
          );
          postData.Image_Urls = refreshedImageUrls;
          
        } catch (err) {
          console.error('Error refreshing image URLs:', err);
          // Continue with original URLs if refresh fails
        }
      }
      
      return {
        ...postData,
        author: authorsMap[post.Author_id]
      };
    }));
    
    return res.status(200).json({
      status: 'success',
      data: {
        posts: postsWithAuthors
      }
    });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch trending posts',
      error: error.message
    });
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { Content, Is_Sponsored_Post, Title, remove_images } = req.body;
    const userId = req.user.user_id;

    // Validate UUID
    if (!validateUUID(postId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }

    // Find post
    const post = await TournamentPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Check if user is the author or an admin for the tournament
    const isAuthor = post.Author_id === userId;
    
    // Check if user is an admin for this tournament
    const now = new Date();
    const isAdmin = await UserAdmin.findOne({
      where: {
        user_id: userId,
        associated_tournament_id: post.Tournament_Id,
        start_time: { [Op.lte]: now },
        [Op.or]: [
          { end_time: null },
          { end_time: { [Op.gt]: now } }
        ],
        role: { [Op.in]: ['super_admin', 'temp_admin'] }
      }
    });
    
    // If user is not the author and not an admin, deny access
    if (!isAuthor && !isAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this post'
      });
    }

    // Initialize update data
    const updatedData = {};
    if (Content) updatedData.Content = Content;
    if (Is_Sponsored_Post !== undefined) updatedData.Is_Sponsored_Post = Is_Sponsored_Post;
    if (Title) updatedData.Title = Title;
    
    // Handle image deletion if requested
    if (remove_images && Array.isArray(JSON.parse(remove_images))) {
      const imagesToRemove = JSON.parse(remove_images);
      const currentImageUrls = post.Image_Urls || [];
      const currentImageKeys = post.Image_Keys || [];
      
      // Track the indexes of images to be removed
      const removedIndexes = [];
      
      // Delete each image from S3
      for (const imageToRemove of imagesToRemove) {
        // Find the image index in the arrays
        const imageIndex = currentImageUrls.findIndex(url => url === imageToRemove);
        
        if (imageIndex !== -1) {
          removedIndexes.push(imageIndex);
          
          // Delete from S3 using the key if available
          if (currentImageKeys[imageIndex]) {
            await deleteFromS3(currentImageKeys[imageIndex]);
            
          } else {
            // Fallback to extracting key from URL
            const imageKey = getKeyFromUrl(imageToRemove);
            if (imageKey) {
              await deleteFromS3(imageKey);
              
            }
          }
        }
      }
      
      // Filter out the removed images from URLs and keys arrays
      updatedData.Image_Urls = currentImageUrls.filter((_, index) => !removedIndexes.includes(index));
      updatedData.Image_Keys = currentImageKeys.filter((_, index) => !removedIndexes.includes(index));
    }
    
    // Handle new image uploads if files are present
    if (req.files && req.files.length > 0) {
      const Tournament_Id = post.Tournament_Id;
      
      
      
      // Upload each new image to S3
      const uploadPromises = req.files.map(file => 
        uploadToS3(file, `posts/${Tournament_Id}`)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      
      // Filter successful uploads
      const successfulUploads = uploadResults.filter(result => result.status === 'success');
      
      // Get current image URLs and keys after any deletions
      const currentImageUrls = updatedData.Image_Urls !== undefined ? updatedData.Image_Urls : (post.Image_Urls || []);
      const currentImageKeys = updatedData.Image_Keys !== undefined ? updatedData.Image_Keys : (post.Image_Keys || []);
      
      
      
      
      
      // Add new image URLs and keys to existing ones
      updatedData.Image_Urls = [
        ...currentImageUrls,
        ...successfulUploads.map(result => result.url)
      ];
      
      updatedData.Image_Keys = [
        ...currentImageKeys,
        ...successfulUploads.map(result => result.key)
      ];
      
      
      
      
      // Log failed uploads if any
      const failedUploads = uploadResults.filter(result => result.status !== 'success');
      if (failedUploads.length > 0) {
        console.warn(`${failedUploads.length} image uploads failed during post update`);
      }
    }
    
    // Update the post with new data
    await post.update(updatedData);
    
    // Refresh post to get updated data
    await post.reload();
    
    // Get author details
    const author = await User.findByPk(post.Author_id, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    // Create a copy of the post data to modify
    const postData = post.toJSON();
    
    // Refresh presigned URLs for images if they exist
    if (postData.Image_Keys && postData.Image_Keys.length > 0) {
      try {
        
        
        // Use the model method to refresh all image URLs
        const refreshResult = await post.refreshImageUrls();
        
        if (refreshResult.status === 'success') {
          postData.Image_Urls = refreshResult.imageUrls;
          
        } else {
          console.error('Failed to refresh image URLs:', refreshResult.message);
        }
      } catch (err) {
        console.error('Error refreshing image URLs:', err);
        // Continue with original URLs if refresh fails
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Post updated successfully',
      data: {
        post: {
          ...postData,
          author
        }
      }
    });
  } catch (error) {
    console.error('Error updating tournament post:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update post',
      error: error.message
    });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.user_id;

    // Validate UUID
    if (!validateUUID(postId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }

    // Find post
    const post = await TournamentPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Check if user is the author or an admin for the tournament
    const isAuthor = post.Author_id === userId;
    
    // Check if user is an admin for this tournament
    const now = new Date();
    const isAdmin = await UserAdmin.findOne({
      where: {
        user_id: userId,
        associated_tournament_id: post.Tournament_Id,
        start_time: { [Op.lte]: now },
        [Op.or]: [
          { end_time: null },
          { end_time: { [Op.gt]: now } }
        ],
        role: { [Op.in]: ['super_admin', 'temp_admin'] }
      }
    });
    
    // If user is not the author and not an admin, deny access
    if (!isAuthor && !isAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this post'
      });
    }

    // Delete all comments for this post
    await TournamentPostComment.destroy({
      where: { Post_Id: postId }
    });

    // Delete images from S3 if they exist
    if (post.Image_Keys && post.Image_Keys.length > 0) {
      try {
        // Use stored keys for direct deletion
        const deletionPromises = post.Image_Keys.map(imageKey => deleteFromS3(imageKey));
        await Promise.all(deletionPromises);
        
      } catch (s3Error) {
        console.error('Error deleting post images from S3:', s3Error);
        // Continue with post deletion even if image deletion fails
      }
    } else if (post.Image_Urls && post.Image_Urls.length > 0) {
      try {
        // Fallback to extracting keys from URLs if Image_Keys isn't available
        const deletionPromises = post.Image_Urls.map(imageUrl => {
          const imageKey = getKeyFromUrl(imageUrl);
          if (imageKey) {
            return deleteFromS3(imageKey);
          }
          return Promise.resolve({ status: 'error', message: 'Invalid image URL' });
        });
        
        await Promise.all(deletionPromises);
        
      } catch (s3Error) {
        console.error('Error deleting post images from S3 using URLs:', s3Error);
        // Continue with post deletion even if image deletion fails
      }
    }

    // Delete post
    await post.destroy();

    return res.status(200).json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tournament post:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Vote on a post
const votePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { vote } = req.body; // 'upvote', 'downvote', or 'remove'
    const userId = req.user.user_id;

    // Validate UUID
    if (!validateUUID(postId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format'
      });
    }

    // Validate vote type
    if (!['upvote', 'downvote', 'remove'].includes(vote)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid vote type. Must be upvote, downvote, or remove'
      });
    }

    // Find post
    const post = await TournamentPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    // Find existing vote by this user for this post
    const existingVote = await UserVote.findOne({
      where: {
        user_id: userId,
        post_id: postId
      }
    });

    // Handle vote based on the request and existing vote
    if (vote === 'remove') {
      // Remove existing vote if there is one
      if (existingVote) {
        const voteType = existingVote.vote_type;
        await existingVote.destroy();
        
        // Decrement the vote count based on the previous vote type
        if (voteType === 'upvote') {
          await post.decrement('UpVotes');
        } else if (voteType === 'downvote') {
          await post.decrement('DownVotes');
        }
      }
    } else {
      // Handle upvote/downvote
      if (existingVote) {
        // If vote already exists
        if (existingVote.vote_type === vote) {
          // User is clicking the same vote type again, remove the vote
          await existingVote.destroy();
          
          if (vote === 'upvote') {
            await post.decrement('UpVotes');
          } else {
            await post.decrement('DownVotes');
          }
        } else {
          // User is changing vote type (upvote -> downvote or vice versa)
          // Update vote type
          await existingVote.update({ vote_type: vote });
          
          // Update post counts
          if (vote === 'upvote') {
            await post.increment('UpVotes');
            await post.decrement('DownVotes');
          } else {
            await post.increment('DownVotes');
            await post.decrement('UpVotes');
          }
        }
      } else {
        // No existing vote, create new one
        await UserVote.create({
          user_id: userId,
          post_id: postId,
          vote_type: vote
        });
        
        // Update post vote count
        if (vote === 'upvote') {
          await post.increment('UpVotes');
        } else {
          await post.increment('DownVotes');
        }
      }
    }

    // Refresh post to get updated vote counts
    await post.reload();

    // Get user's current vote status for the response
    const currentVote = await UserVote.findOne({
      where: {
        user_id: userId,
        post_id: postId
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Vote recorded successfully',
      data: {
        upvotes: post.UpVotes,
        downvotes: post.DownVotes,
        score: post.UpVotes - post.DownVotes,
        userVote: currentVote ? currentVote.vote_type : null
      }
    });
  } catch (error) {
    console.error('Error voting on post:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to record vote',
      error: error.message
    });
  }
};

// Get user votes for specific posts
const getUserVotes = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { postIds } = req.query;
    
    if (!postIds) {
      return res.status(400).json({
        status: 'error',
        message: 'Post IDs are required'
      });
    }
    
    // Convert comma-separated string to array
    const postIdArray = postIds.split(',');
    
    // Validate all UUIDs
    for (const postId of postIdArray) {
      if (!validateUUID(postId)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid post ID format: ${postId}`
        });
      }
    }
    
    // Fetch user votes for the specified posts
    const votes = await UserVote.findAll({
      where: {
        user_id: userId,
        post_id: { [Op.in]: postIdArray }
      }
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        votes
      }
    });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user votes',
      error: error.message
    });
  }
};

// Get all posts by a specific user
const getUserPosts = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, sort = 'latest' } = req.query;
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Determine sort order
    let order;
    if (sort === 'trending') {
      order = [
        [sequelize.literal('("UpVotes" - "DownVotes")'), 'DESC'],
        ['created_at', 'DESC']
      ];
    } else {
      // Default is latest
      order = [['created_at', 'DESC']];
    }
    
    // Fetch user's posts with tournament information
    const posts = await TournamentPost.findAndCountAll({
      where: { Author_id: userId },
      limit: parseInt(limit),
      offset,
      order,
      attributes: {
        include: [
          [
            sequelize.literal('("UpVotes" - "DownVotes")'),
            'vote_score'
          ]
        ]
      },
      include: [
        {
          model: Tournament,
          as: 'Tournament',
          attributes: ['tournament_id', 'tournament_Name', 'GameName', 'Status', 'Event_Start_Time']
        }
      ]
    });
    
    // Get user details
    const user = await User.findByPk(userId, {
      attributes: ['user_id', 'Name', 'profile_pic', 'GamerTag']
    });
    
    // Prepare post data with refreshed image URLs
    const postsWithDetails = await Promise.all(posts.rows.map(async post => {
      const postData = post.toJSON();
      
      // Refresh presigned URLs for images if they exist
      if (postData.Image_Keys && postData.Image_Keys.length > 0) {
        try {
          const refreshResult = await post.refreshImageUrls();
          if (refreshResult.status === 'success') {
            postData.Image_Urls = refreshResult.imageUrls;
          }
        } catch (err) {
          console.error(`Error refreshing image URLs for post ${post.Post_id}:`, err);
        }
      }
      
      return {
        ...postData,
        author: user ? user.toJSON() : { Name: 'Unknown' }
      };
    }));
    
    return res.status(200).json({
      status: 'success',
      data: {
        posts: postsWithDetails,
        pagination: {
          total: posts.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(posts.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user posts',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  getPost,
  getTournamentPosts,
  getTrendingPosts,
  getAllPosts,
  updatePost,
  deletePost,
  votePost,
  getUserVotes,
  getUserPosts
}; 