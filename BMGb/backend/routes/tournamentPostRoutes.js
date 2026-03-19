const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadMultiple, handleMulterError } = require('../middleware/upload');
const postController = require('../controllers/tournamentPostController');
const commentController = require('../controllers/tournamentPostCommentController');

// Tournament Post Routes
router.post('/create', authenticate, uploadMultiple('images', 5), handleMulterError, postController.createPost);
router.get('/all', postController.getAllPosts);
router.get('/user/my-posts', authenticate, postController.getUserPosts);
router.get('/tournament/:tournamentId', postController.getTournamentPosts);
router.get('/tournament/:tournamentId/trending', postController.getTrendingPosts);
router.get('/user-votes', authenticate, postController.getUserVotes);
router.get('/:postId', postController.getPost);
router.patch('/:postId', authenticate, uploadMultiple('images', 5), handleMulterError, postController.updatePost);
router.delete('/:postId', authenticate, postController.deletePost);
router.post('/:postId/vote', authenticate, postController.votePost);

// Tournament Post Comment Routes
router.post('/comment', authenticate, commentController.createComment);
router.get('/:postId/comments', commentController.getPostComments);
router.get('/comment/:commentId', commentController.getComment);
router.get('/comment/:commentId/replies', commentController.getCommentReplies);
router.patch('/comment/:commentId', authenticate, commentController.updateComment);
router.delete('/comment/:commentId', authenticate, commentController.deleteComment);

module.exports = router; 