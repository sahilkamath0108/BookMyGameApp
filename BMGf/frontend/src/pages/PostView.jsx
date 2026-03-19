import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faThumbsUp,
  faThumbsDown,
  faReply,
  faPaperPlane,
  faSpinner,
  faEdit,
  faTrash,
  faHeart,
} from '@fortawesome/free-solid-svg-icons';

// Remove dummy image URL
// const DUMMY_IMAGE_URL = '...';

const PostView = () => {
  const { colors, isLight } = useContext(ThemeContext);
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userVote, setUserVote] = useState(null);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Store the tournament ID so we can use it for navigation
  const [tournamentId, setTournamentId] = useState(null);

  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if(!token){
          navigate(('/login'))
        }

        // Fetch post details
        const postResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (
          postResponse.data &&
          postResponse.data.data &&
          postResponse.data.data.post
        ) {
          setPost(postResponse.data.data.post);
          
          // Save the tournament ID for navigation
          if (postResponse.data.data.post.Tournament && 
              postResponse.data.data.post.Tournament.tournament_id) {
            setTournamentId(postResponse.data.data.post.Tournament.tournament_id);
          }

          // Check if user has voted on this post
          try {
            const votesResponse = await axios.get(
              `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/user-votes`,
              {
                headers: { Authorization: `Bearer ${token}` },
                params: { postIds: postId },
              }
            );

            if (
              votesResponse.data &&
              votesResponse.data.data &&
              votesResponse.data.data.votes &&
              votesResponse.data.data.votes.length > 0
            ) {
              setUserVote(votesResponse.data.data.votes[0].vote_type);
            }
          } catch (voteError) {
            console.error('Error fetching user vote:', voteError);
          }

          // Fetch comments
          const commentsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}/comments`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (
            commentsResponse.data &&
            commentsResponse.data.data &&
            commentsResponse.data.data.comments
          ) {
            setComments(commentsResponse.data.data.comments);
          }
        } else {
          setError('Failed to load post');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndComments();
  }, [postId]);

  // Handle voting
  const handleVote = async (voteType) => {
    try {
      const token = localStorage.getItem('token');

      // Determine the vote action based on current state
      let voteAction;
      if (userVote === voteType) {
        // User is clicking the same vote type again, remove the vote
        voteAction = 'remove';
      } else {
        // User is either voting for the first time or changing vote type
        voteAction = voteType;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}/vote`,
        { vote: voteAction },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.data) {
        // Update the post's vote counts
        setPost((prev) => ({
          ...prev,
          UpVotes: response.data.data.upvotes,
          DownVotes: response.data.data.downvotes,
        }));

        // Update the user's vote state
        setUserVote(response.data.data.userVote);
      }
    } catch (error) {
      console.error('Error voting post:', error);
      alert('Failed to vote post');
    }
  };

  // Handle image navigation
  const nextImage = () => {
    if (!post || !post.Image_Urls || post.Image_Urls.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % post.Image_Urls.length);
  };

  const prevImage = () => {
    if (!post || !post.Image_Urls || post.Image_Urls.length <= 1) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + post.Image_Urls.length) % post.Image_Urls.length
    );
  };

  // Submit new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setCommentLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/comment`,
        {
          Post_Id: postId,
          Content: newComment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        // Update local post comment count
        setPost((prev) => ({
          ...prev,
          comment_count: prev.comment_count ? prev.comment_count + 1 : 1,
        }));

        // Refetch comments to include the new one
        const commentsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (
          commentsResponse.data &&
          commentsResponse.data.data &&
          commentsResponse.data.data.comments
        ) {
          setComments(commentsResponse.data.data.comments);
          setNewComment(''); // Clear input
        }
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    try {
      setCommentLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        // Refetch comments to reflect the deletion
        const commentsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (
          commentsResponse.data &&
          commentsResponse.data.data &&
          commentsResponse.data.data.comments
        ) {
          setComments(commentsResponse.data.data.comments);

          // Refetch post to update comment count
          const postResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (
            postResponse.data &&
            postResponse.data.data &&
            postResponse.data.data.post
          ) {
            setPost(postResponse.data.data.post);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    } finally {
      setCommentLoading(false);
      setShowDeleteConfirm(null);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Comment component with nested replies
  const Comment = ({ comment, level = 0 }) => {
    const isEditing = editingComment === comment.Comment_id;
    const isReplying = replyingTo === comment.Comment_id;
    const isDeleting = showDeleteConfirm === comment.Comment_id;
    const [localReplyContent, setLocalReplyContent] = useState('');
    const [localEditContent, setLocalEditContent] = useState(comment.Content);
    const isOwnComment =
      comment.author?.user_id ===
      JSON.parse(localStorage.getItem('user'))?.user_id;

    const handleEditClick = (comment) => {
      setEditingComment(comment.Comment_id);
      setLocalEditContent(comment.Content);
    };

    const handleReplyClick = (comment) => {
      setReplyingTo(comment.Comment_id);
    };

    const handleLocalReply = async () => {
      if (!localReplyContent.trim()) return;

      try {
        setCommentLoading(true);
        const token = localStorage.getItem('token');
        

        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/comment`,
          {
            Post_Id: postId,
            Content: localReplyContent,
            Parent_Comment_Id: comment.Comment_id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.status === 'success') {
          // Update local post comment count
          setPost((prev) => ({
            ...prev,
            comment_count: prev.comment_count ? prev.comment_count + 1 : 1,
          }));

          // Refetch comments to include the new reply
          const commentsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}/comments`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (
            commentsResponse.data &&
            commentsResponse.data.data &&
            commentsResponse.data.data.comments
          ) {
            setComments(commentsResponse.data.data.comments);
            setReplyingTo(null); // Close reply form
            setLocalReplyContent(''); // Clear input
          }
        }
      } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply');
      } finally {
        setCommentLoading(false);
      }
    };

    return (
      <div className="mt-3">
        <div
          className={`${isLight 
            ? 'bg-white/20 backdrop-blur-sm border-2 border-orange-500/20' 
            : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500/30'} p-3 rounded-lg`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                {comment.author && comment.author.profile_pic_url ? (
                  <img
                    src={comment.author.profile_pic_url}
                    alt={comment.author.Name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="text-white text-sm">
                    {comment.author?.Name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <div className={`font-semibold text-sm ${isLight ? 'text-gray-800' : 'text-white'}`}>
                  {comment.author?.Name || 'Anonymous'}
                </div>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  {formatDate(comment.created_at)}
                </div>
              </div>
            </div>
            {isOwnComment && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditClick(comment)}
                  className={`${isLight ? 'text-gray-600 hover:text-orange-500' : 'text-gray-300 hover:text-orange-400'} transition-colors`}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(comment.Comment_id)}
                  className={`${isLight ? 'text-gray-600 hover:text-red-500' : 'text-gray-300 hover:text-red-400'} transition-colors`}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            )}
          </div>
          <div className={`mt-2 ${isLight ? 'text-gray-800' : 'text-white'}`}>{comment.Content}</div>
          <div className="mt-2 flex items-center space-x-4">
            <button
              onClick={() => handleReplyClick(comment)}
              className={`${isLight ? 'text-orange-500 hover:text-orange-600' : 'text-orange-400 hover:text-orange-300'} transition-colors flex items-center space-x-1`}
            >
              <FontAwesomeIcon icon={faReply} />
              <span>Reply</span>
            </button>
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-2">
              <textarea
                value={localReplyContent}
                onChange={(e) => setLocalReplyContent(e.target.value)}
                className={`w-full p-2 bg-transparent border ${isLight 
                  ? 'border-orange-500/50 text-gray-800' 
                  : 'border-gray-600 text-white'} rounded-lg text-sm`}
                rows={2}
                placeholder="Write a reply..."
              ></textarea>
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setLocalReplyContent('');
                  }}
                  className={`px-3 py-1 text-xs ${isLight 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'} rounded-lg`}
                  disabled={commentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLocalReply}
                  className={`px-3 py-1 text-xs ${isLight 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-lg flex items-center`}
                  disabled={commentLoading || !localReplyContent.trim()}
                >
                  {commentLoading ? (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin mr-1"
                    />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
                  )}
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="pl-3">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.Comment_id}
                comment={reply}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-orange-50 via-white to-red-50 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse`}></div>
          <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
          <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
        </div>

        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-orange-600' 
              : 'border-orange-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-red-600' 
              : 'border-red-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-orange-700' : 'text-gray-400'} animate-pulse text-lg`}>Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="text-center py-20">
          <h2 className="text-2xl text-red-500">{error || 'Post not found'}</h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-[#F05454] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-orange-50 via-white to-red-50 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse`}></div>
        <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
      </div>

      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        {/* Back button */}
        <button
          onClick={() => tournamentId ? navigate(`/tournament-posts/${tournamentId}`) : navigate(-1)}
          className={`flex items-center gap-2 ${isLight 
            ? 'text-orange-600 hover:text-orange-500 border-orange-400 hover:bg-orange-50' 
            : 'text-orange-400 hover:text-orange-300 border-orange-500 hover:bg-orange-900/20'} transition duration-200 px-4 py-2 border rounded-lg mb-6`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Posts</span>
        </button>

        {/* Post */}
        <div className={`${isLight 
          ? 'bg-white/80 backdrop-blur-sm border-2 border-orange-400' 
          : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500'} rounded-2xl overflow-hidden mb-8`}>
          {/* Post Header with Author */}
          <div className="p-4 flex items-center border-b border-gray-700">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
              {post.author && post.author.profile_pic_url ? (
                <img
                  src={post.author.profile_pic_url}
                  alt="Author"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  {post.author?.Name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold">
                {post.author?.Name || 'Anonymous'}
              </div>
              <div className="text-xs opacity-70">
                {formatDate(post.created_at)}
              </div>
            </div>
            {post.Is_Sponsored_Post && (
              <div className={`ml-auto px-2 py-1 ${isLight 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500'} text-black text-xs rounded-full`}>
                Sponsored
              </div>
            )}
          </div>

          {/* Post Title */}
          <div className="p-4 pb-2">
            <h2 className={`text-xl font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>{post.Title}</h2>
          </div>

          {/* Post Content */}
          <div className="px-4 pb-4">
            <p className="text-sm whitespace-pre-wrap">{post.Content}</p>
          </div>

          {/* Post Images with Navigation Arrows */}
          {post.Image_Urls && post.Image_Urls.length > 0 && (
            <div className="relative mb-4">
              <div className="w-full h-[500px] bg-gray-800 flex items-center justify-center">
                <img
                  src={post.Image_Urls[currentImageIndex]}
                  alt={`${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                  }}
                />
              </div>

              {/* Image counter indicator */}
              {post.Image_Urls.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className={`inline-block ${isLight 
                    ? 'bg-black/50 text-white' 
                    : 'bg-black/70 text-white'} px-3 py-1 rounded-full text-sm`}>
                    {currentImageIndex + 1} / {post.Image_Urls.length}
                  </div>
                </div>
              )}

              {/* Navigation arrows */}
              {post.Image_Urls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isLight 
                      ? 'bg-black/50 hover:bg-black/70' 
                      : 'bg-black/70 hover:bg-black/90'} text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      hover:scale-110 active:scale-95`}
                    aria-label="Previous image"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
                  </button>
                  <button
                    onClick={nextImage}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isLight 
                      ? 'bg-black/50 hover:bg-black/70' 
                      : 'bg-black/70 hover:bg-black/90'} text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      hover:scale-110 active:scale-95`}
                    aria-label="Next image"
                  >
                    <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Tournament info if available */}
          {post.Tournament && (
            <div className="px-4 pb-4">
              <div className={`inline-block ${isLight 
                ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-400/30 text-orange-700' 
                : 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 text-orange-300'} px-3 py-1 rounded-lg text-sm border`}>
                Tournament:{' '}
                {post.Tournament.tournament_Name ||
                  post.Tournament.GameName ||
                  'Unknown Tournament'}
              </div>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex justify-between items-center p-4 border-t border-gray-700">
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="font-medium">{post.UpVotes || 0}</span> Upvotes
              </div>
              <div className="text-sm">
                <span className="font-medium">{post.DownVotes || 0}</span>{' '}
                Downvotes
              </div>
              <div className="text-sm">
                <span className="font-medium">{post.comment_count || 0}</span>{' '}
                Comments
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleVote('upvote')}
                className={`px-3 py-2 ${userVote === 'upvote' 
                  ? `${isLight 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                    : 'bg-gradient-to-r from-orange-600 to-red-600'} text-white` 
                  : isLight 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                    : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'} rounded-lg transition-all duration-300`}
              >
                <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
                Upvote
              </button>
              <button
                onClick={() => handleVote('downvote')}
                className={`px-3 py-2 ${userVote === 'downvote' 
                  ? `${isLight 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                    : 'bg-gradient-to-r from-orange-600 to-red-600'} text-white` 
                  : isLight 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                    : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'} rounded-lg transition-all duration-300`}
              >
                <FontAwesomeIcon icon={faThumbsDown} className="mr-2" />
                Downvote
              </button>
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>Comments</h3>
          <div className={`${isLight 
            ? 'bg-white/80 backdrop-blur-sm border-2 border-orange-400' 
            : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500'} rounded-2xl p-4`}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className={`w-full p-3 ${isLight 
                ? 'bg-transparent border-2 border-orange-200 focus:border-orange-400' 
                : 'bg-transparent border-2 border-gray-700 focus:border-orange-500'} rounded-xl text-sm transition-colors`}
              rows={3}
              placeholder="Write a comment..."
            ></textarea>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitComment}
                className={`px-4 py-2 ${isLight 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                  : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all duration-300`}
                disabled={commentLoading || !newComment.trim()}
              >
                {commentLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
                <span>Comment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="mb-8">
          {comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map((comment) => (
                <Comment key={comment.Comment_id} comment={comment} />
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${isLight 
              ? 'bg-white/80 backdrop-blur-sm border-2 border-orange-400' 
              : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500'} rounded-2xl`}>
              <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                No comments yet. Be the first to comment!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostView;
