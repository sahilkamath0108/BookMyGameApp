import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import ImageWithFallback from '../components/ImageWithFallback';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faThumbsUp,
  faThumbsDown,
  faComment,
  faEdit,
  faTrash,
  faEye,
  faNewspaper,
  faCalendarAlt,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';

const MyPosts = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    images: [],
    existingImages: []
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchUserPosts();
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      editFormData.images.forEach(file => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [editFormData.images]);

  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/user/my-posts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.data && response.data.data.posts) {
        const postsData = response.data.data.posts;
        
        // Initialize current image index for each post
        const indices = {};
        postsData.forEach((post) => {
          indices[post.Post_id] = 0;
        });
        setCurrentImageIndex(indices);

        // Fetch top comments for each post
        const postsWithComments = await Promise.all(
          postsData.map(async (post) => {
            try {
              const commentsResponse = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${post.Post_id}/comments`,
                { 
                  headers: { Authorization: `Bearer ${token}` },
                  params: { limit: 2 } // Request just top 2 comments
                }
              );
              
              if (commentsResponse.data && 
                  commentsResponse.data.data && 
                  commentsResponse.data.data.comments) {
                return {
                  ...post,
                  topComments: commentsResponse.data.data.comments,
                  totalComments: commentsResponse.data.data.total || post.comment_count || 0
                };
              }
              return { ...post, topComments: [], totalComments: post.comment_count || 0 };
            } catch (err) {
              console.error(`Error fetching comments for post ${post.Post_id}:`, err);
              return { ...post, topComments: [], totalComments: post.comment_count || 0 };
            }
          })
        );
        
        setPosts(postsWithComments);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          pages: response.data.data.pagination.pages
        }));

        // Fetch user votes for these posts
        if (postsData.length > 0) {
          try {
            const postIds = postsData.map((post) => post.Post_id);
                          const votesResponse = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/user-votes`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  params: { postIds: postIds.join(',') },
                }
              );

            if (
              votesResponse.data &&
              votesResponse.data.data &&
              votesResponse.data.data.votes
            ) {
              const votesMap = {};
              votesResponse.data.data.votes.forEach((vote) => {
                votesMap[vote.post_id] = vote.vote_type;
              });
              setUserVotes(votesMap);
            }
          } catch (voteError) {
            console.error('Error fetching user votes:', voteError);
            // Non-critical error, continue showing posts without votes
          }
        }
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setError('Failed to load your posts');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId, voteType) => {
    try {
      const token = localStorage.getItem('token');
      const currentVote = userVotes[postId];

      // Determine the vote action based on current state
      let voteAction;
      if (currentVote === voteType) {
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
        // Update the post's vote counts immediately
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.Post_id === postId
              ? {
                  ...post,
                  UpVotes: response.data.data.upvotes,
                  DownVotes: response.data.data.downvotes,
                }
              : post
          )
        );

        // Update the user's vote state
        setUserVotes((prev) => ({
          ...prev,
          [postId]: response.data.data.userVote,
        }));
      }
    } catch (error) {
      console.error('Error voting post:', error);
      alert('Failed to vote post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the deleted post from the state
      setPosts(posts.filter(post => post.Post_id !== postId));
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));

      alert('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditFormData({
      title: post.Title || '',
      content: post.Content || '',
      images: [],
      existingImages: post.Image_Urls || []
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    // Clean up object URLs to prevent memory leaks
    editFormData.images.forEach(file => {
      if (file instanceof File) {
        URL.revokeObjectURL(URL.createObjectURL(file));
      }
    });

    setShowEditModal(false);
    setEditingPost(null);
    setEditFormData({
      title: '',
      content: '',
      images: [],
      existingImages: []
    });
    setEditLoading(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setEditFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const handleRemoveNewImage = (index) => {
    setEditFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveExistingImage = (index) => {
    setEditFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index)
    }));
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editingPost) return;

    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Add text fields
      formData.append('Title', editFormData.title);
      formData.append('Content', editFormData.content);

      // Add new images
      editFormData.images.forEach((file) => {
        formData.append('images', file);
      });

      // Calculate removed images
      const originalImages = editingPost.Image_Urls || [];
      const removedImages = originalImages.filter(
        img => !editFormData.existingImages.includes(img)
      );

      if (removedImages.length > 0) {
        formData.append('remove_images', JSON.stringify(removedImages));
      }

      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${editingPost.Post_id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data && response.data.data && response.data.data.post) {
        // Update the post in the local state
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.Post_id === editingPost.Post_id
              ? { ...post, ...response.data.data.post }
              : post
          )
        );

        handleCloseEditModal();
        alert('Post updated successfully!');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleViewPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  const nextImage = (postId) => {
    setCurrentImageIndex((prev) => {
      const post = posts.find((p) => p.Post_id === postId);
      const maxIndex = post?.Image_Urls?.length - 1 || 0;
      return {
        ...prev,
        [postId]: prev[postId] < maxIndex ? prev[postId] + 1 : 0,
      };
    });
  };

  const prevImage = (postId) => {
    setCurrentImageIndex((prev) => {
      const post = posts.find((p) => p.Post_id === postId);
      const maxIndex = post?.Image_Urls?.length - 1 || 0;
      return {
        ...prev,
        [postId]: prev[postId] > 0 ? prev[postId] - 1 : maxIndex,
      };
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const Comment = ({ comment }) => (
    <div className={`p-3 ${isLight 
      ? 'bg-gray-50 border border-gray-200' 
      : 'bg-gray-800 border border-gray-700'} rounded-lg mb-2`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-medium text-sm ${isLight ? 'text-gray-800' : 'text-white'}`}>
          {comment.author?.Name || 'Anonymous'}
        </span>
        <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {formatDate(comment.created_at)}
        </span>
      </div>
      <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        {comment.Content}
      </p>
    </div>
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
          <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
            ? 'border-purple-600' 
            : 'border-purple-400'}`}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className={`text-xl ${isLight ? 'text-red-600' : 'text-red-400'}`}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900'}`}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-4 bg-gradient-to-r ${isLight 
            ? 'from-purple-600 via-blue-600 to-indigo-600' 
            : 'from-purple-400 via-blue-400 to-indigo-400'} bg-clip-text text-transparent`}>
            My Posts
          </h1>
          <p className={`text-lg ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Manage all your tournament posts in one place
          </p>
        </div>

        {posts.length === 0 ? (
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 text-center`}>
            <FontAwesomeIcon
              icon={faNewspaper}
              className={`text-6xl mb-4 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}
            />
            <h2 className={`text-2xl font-semibold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
              No Posts Yet
            </h2>
            <p className={`mb-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              You haven't created any posts yet. Join a tournament and start sharing your thoughts!
            </p>
            <button
              onClick={() => navigate('/upcoming-tournaments')}
              className={`px-6 py-3 bg-gradient-to-r ${isLight 
                ? 'from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400' 
                : 'from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
            >
              Browse Tournaments
            </button>
          </div>
        ) : (
          <>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                                  <div key={post.Post_id} className="h-full transform transition-transform duration-300 hover:-translate-y-1">
                    <div className={`${isLight 
                      ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
                      : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col`}
                  >
                    {/* Post Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                                                  <h2 className={`text-xl font-bold mb-2 line-clamp-2 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            {post.Title}
                          </h2>
                        
                        {/* Tournament Info */}
                                                  <div className="flex flex-col mb-2">
                            <button
                              onClick={() => navigate(`/tournaments/${post.Tournament.tournament_id}`)}
                              className={`flex items-center gap-1 ${isLight 
                                ? 'text-purple-600 hover:text-purple-700' 
                                : 'text-purple-400 hover:text-purple-300'} hover:underline text-sm`}
                            >
                              <FontAwesomeIcon icon={faTrophy} className="text-xs" />
                              <span className="truncate">{post.Tournament.tournament_Name}</span>
                            </button>
                            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {post.Tournament.GameName}
                            </span>
                          </div>

                                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                              {formatDate(post.created_at)}
                            </span>
                            <span className={`font-medium ${post.vote_score > 0 
                              ? isLight ? 'text-green-600' : 'text-green-400'
                              : post.vote_score < 0 
                                ? isLight ? 'text-red-600' : 'text-red-400'
                                : isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {post.vote_score > 0 ? '+' : ''}{post.vote_score} votes
                            </span>
                            <span className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {post.totalComments} comments
                            </span>
                          </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPost(post.Post_id)}
                          className={`p-2 rounded-lg ${isLight 
                            ? 'text-blue-600 hover:bg-blue-100' 
                            : 'text-blue-400 hover:bg-blue-900/30'} transition-colors duration-200`}
                          title="View Post"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          onClick={() => handleEditPost(post)}
                          className={`p-2 rounded-lg ${isLight 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-green-400 hover:bg-green-900/30'} transition-colors duration-200`}
                          title="Edit Post"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.Post_id)}
                          className={`p-2 rounded-lg ${isLight 
                            ? 'text-red-600 hover:bg-red-100' 
                            : 'text-red-400 hover:bg-red-900/30'} transition-colors duration-200`}
                          title="Delete Post"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    {post.Content && (
                      <div className={`mb-4 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                        <p className="whitespace-pre-wrap line-clamp-3">{post.Content}</p>
                      </div>
                    )}

                    {/* Post Images */}
                    {post.Image_Urls && post.Image_Urls.length > 0 && (
                      <div className="mb-4 mt-auto">
                        <div className="relative">
                          <ImageWithFallback
                            src={post.Image_Urls[currentImageIndex[post.Post_id] || 0]}
                            alt={`Post image ${(currentImageIndex[post.Post_id] || 0) + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          
                          {post.Image_Urls.length > 1 && (
                            <>
                              <button
                                onClick={() => prevImage(post.Post_id)}
                                className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${isLight 
                                  ? 'bg-white/80 text-gray-800 hover:bg-white' 
                                  : 'bg-black/80 text-white hover:bg-black'} rounded-full p-2 transition-all duration-200`}
                              >
                                <FontAwesomeIcon icon={faArrowLeft} />
                              </button>
                              <button
                                onClick={() => nextImage(post.Post_id)}
                                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isLight 
                                  ? 'bg-white/80 text-gray-800 hover:bg-white' 
                                  : 'bg-black/80 text-white hover:bg-black'} rounded-full p-2 transition-all duration-200`}
                              >
                                <FontAwesomeIcon icon={faArrowRight} />
                              </button>
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                                {(currentImageIndex[post.Post_id] || 0) + 1} / {post.Image_Urls.length}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Voting and Comments */}
                    <div className="flex justify-between items-center mt-auto">
                      {/* Voting Section */}
                                              <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVote(post.Post_id, 'upvote')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 text-xs ${
                              userVotes[post.Post_id] === 'upvote'
                                ? isLight 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-green-900/30 text-green-400'
                                : isLight 
                                  ? 'hover:bg-gray-100 text-gray-600' 
                                  : 'hover:bg-gray-800/50 text-gray-400'
                            }`}
                          >
                            <FontAwesomeIcon icon={faThumbsUp} />
                            <span>{post.UpVotes}</span>
                          </button>
                          
                          <button
                            onClick={() => handleVote(post.Post_id, 'downvote')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 text-xs ${
                              userVotes[post.Post_id] === 'downvote'
                                ? isLight 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-red-900/30 text-red-400'
                                : isLight 
                                  ? 'hover:bg-gray-100 text-gray-600' 
                                  : 'hover:bg-gray-800/50 text-gray-400'
                            }`}
                          >
                            <FontAwesomeIcon icon={faThumbsDown} />
                            <span>{post.DownVotes}</span>
                          </button>
                        </div>

                      {/* Comments Button */}
                                              <button
                          onClick={() => handleViewPost(post.Post_id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isLight 
                            ? 'hover:bg-gray-100 text-gray-600' 
                            : 'hover:bg-gray-800/50 text-gray-400'} transition-all duration-200`}
                        >
                          <FontAwesomeIcon icon={faComment} />
                          <span>{post.totalComments}</span>
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

                          {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-4 py-2 rounded-lg flex items-center ${pagination.page === 1
                      ? isLight 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : isLight 
                        ? 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50' 
                        : 'bg-gray-800 border border-purple-600 text-purple-300 hover:bg-gray-700'
                    } transition-all duration-200`}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                    Previous
                  </button>
                  
                  <div className="flex items-center">
                    <span className={`${isLight ? 'text-gray-700' : 'text-gray-300'} font-medium`}>
                      Page <span className={`${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{pagination.page}</span> of {pagination.pages}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className={`px-4 py-2 rounded-lg flex items-center ${pagination.page === pagination.pages
                      ? isLight 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : isLight 
                        ? 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50' 
                        : 'bg-gray-800 border border-purple-600 text-purple-300 hover:bg-gray-700'
                    } transition-all duration-200`}
                  >
                    Next
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </button>
                </div>
              )}
          </>
        )}
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isLight 
            ? 'bg-white border border-gray-300' 
            : 'bg-gray-900 border border-gray-700'} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                  Edit Post
                </h2>
                <button
                  onClick={handleCloseEditModal}
                  className={`p-2 rounded-lg ${isLight 
                    ? 'text-gray-500 hover:bg-gray-100' 
                    : 'text-gray-400 hover:bg-gray-800'} transition-colors duration-200`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleUpdatePost} className="p-6">
              {/* Tournament Info */}
              {editingPost && (
                <div className={`mb-6 p-4 ${isLight 
                  ? 'bg-gray-50 border border-gray-200' 
                  : 'bg-gray-800 border border-gray-700'} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faTrophy} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
                    <span className={`font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {editingPost.Tournament.tournament_Name}
                    </span>
                    <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      ({editingPost.Tournament.GameName})
                    </span>
                  </div>
                </div>
              )}

              {/* Title Field */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  Post Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-lg border ${isLight 
                    ? 'border-gray-300 bg-white text-gray-900 focus:border-purple-500' 
                    : 'border-gray-600 bg-gray-800 text-white focus:border-purple-400'} focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors duration-200`}
                  placeholder="Enter post title..."
                  required
                />
              </div>

              {/* Content Field */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  Post Content
                </label>
                <textarea
                  value={editFormData.content}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className={`w-full px-4 py-3 rounded-lg border ${isLight 
                    ? 'border-gray-300 bg-white text-gray-900 focus:border-purple-500' 
                    : 'border-gray-600 bg-gray-800 text-white focus:border-purple-400'} focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors duration-200 resize-vertical`}
                  placeholder="Share your thoughts about the tournament..."
                />
              </div>

              {/* Existing Images */}
              {editFormData.existingImages.length > 0 && (
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    Current Images
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {editFormData.existingImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Existing image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images Upload */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  Add New Images
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={`w-full px-4 py-3 rounded-lg border ${isLight 
                    ? 'border-gray-300 bg-white text-gray-900' 
                    : 'border-gray-600 bg-gray-800 text-white'} focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors duration-200`}
                />
                
                {/* Preview New Images */}
                {editFormData.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {editFormData.images.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className={`flex-1 px-6 py-3 rounded-lg border ${isLight 
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50' 
                    : 'border-gray-600 text-gray-300 hover:bg-gray-800'} transition-colors duration-200 font-medium`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editFormData.title.trim()}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    editLoading || !editFormData.title.trim()
                      ? isLight 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isLight 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-purple-500/25' 
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25'
                  }`}
                >
                  {editLoading ? 'Updating...' : 'Update Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPosts; 