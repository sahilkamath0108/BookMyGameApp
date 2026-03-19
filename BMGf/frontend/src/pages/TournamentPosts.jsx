import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faImage,
  faTimes,
  faSpinner,
  faCheck,
  faArrowLeft,
  faArrowRight,
  faThumbsUp,
  faThumbsDown,
  faBolt,
  faTrophy,
  faComment,
} from '@fortawesome/free-solid-svg-icons';
import Advertisement from '../components/Advertisement';
import ImageWithFallback from '../components/ImageWithFallback';

const TournamentPosts = () => {
  const { colors, theme } = useContext(ThemeContext);
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const isLight = theme === 'light';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [userVotes, setUserVotes] = useState({});

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState('');
  const [createPostSuccess, setCreatePostSuccess] = useState(false);

  // Sponsor images state (similar to TournamentDetails)
  const [sponsorImages, setSponsorImages] = useState({
    banner_images: [],
    promotional_images: [],
    logo_images: [],
    additional_images: []
  });
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // Ref for file input
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/tournament/${tournamentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.data && response.data.data.posts) {
          let postsData = response.data.data.posts;
          
          // Sort posts to show sponsored posts at the top
          postsData.sort((a, b) => {
            // First by sponsored status (sponsored posts first)
            if (a.Is_Sponsored_Post && !b.Is_Sponsored_Post) return -1;
            if (!a.Is_Sponsored_Post && b.Is_Sponsored_Post) return 1;
            // Then by creation date (newest first)
            return new Date(b.Created_At || b.created_at) - new Date(a.Created_At || a.created_at);
          });
          
          // Transform posts to have consistent author structure
          postsData = postsData.map((post) => {
            // Create consistent author structure
            const author = {
              Name: post.Username || post.author?.Name || 'Anonymous',
              user_id: post.author?.user_id,
              GamerTag: post.author?.GamerTag,
              // Ensure profile image fields are consistent
              profile_pic_url: post.author?.profile_pic_url || null,
              profile_pic_key: post.author?.profile_pic_key || null
            };
            
            return {
              ...post,
              author: author,
              // Ensure consistent field naming
              created_at: post.created_at || post.Created_At
            };
          });
          
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

        // Fetch sponsor images (similar to TournamentDetails)
                  try {
          const token = localStorage.getItem('token');
          const sponsorsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsor-images`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (sponsorsResponse.data && sponsorsResponse.data.data) {
            setSponsorImages(sponsorsResponse.data.data);
          }
        } catch (sponsorError) {
          console.error('Error fetching sponsor images:', sponsorError);
          // Set default empty arrays if no sponsor images are found
          setSponsorImages({
            banner_images: [],
            promotional_images: [],
            logo_images: [],
            additional_images: []
          });
        } finally {
          setLoadingSponsors(false);
        }
      } catch (error) {
        console.error('Error fetching tournament posts:', error);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [tournamentId]);

  const handleVote = async (postId, voteType, event) => {
    // Prevent navigation when clicking vote buttons
    if (event) {
      event.stopPropagation();
    }
    
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

  const handleViewPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Image navigation functions
  const nextImage = (postId) => {
    setCurrentImageIndex((prev) => {
      const post = posts.find((p) => p.Post_id === postId);
      if (!post || !post.Image_Urls || post.Image_Urls.length <= 1) return prev;

      return {
        ...prev,
        [postId]: (prev[postId] + 1) % post.Image_Urls.length,
      };
    });
  };

  const prevImage = (postId) => {
    setCurrentImageIndex((prev) => {
      const post = posts.find((p) => p.Post_id === postId);
      if (!post || !post.Image_Urls || post.Image_Urls.length <= 1) return prev;

      const currentIdx = prev[postId] || 0;
      return {
        ...prev,
        [postId]:
          (currentIdx - 1 + post.Image_Urls.length) % post.Image_Urls.length,
      };
    });
  };

  // Handle Create Post button click
  const openCreatePostModal = () => {
    setShowCreateModal(true);
    setPostTitle('');
    setPostContent('');
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setCreatePostError('');
    setCreatePostSuccess(false);
  };

  // Handle closing the create post modal
  const closeCreatePostModal = () => {
    if (!createPostLoading) {
      setShowCreateModal(false);

      // Reset form state if needed
      setTimeout(() => {
        setCreatePostSuccess(false);
        setCreatePostError('');
      }, 300);
    }
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files);

    // Limit to 5 images
    if (selectedImages.length + files.length > 5) {
      alert('You can only upload up to 5 images');
      return;
    }

    // Preview images and add them to state
    const newImageFiles = [...selectedImages];
    const newImagePreviews = [...imagePreviewUrls];

    files.forEach((file) => {
      // Only accept image files
      if (!file.type.match('image.*')) {
        return;
      }

      newImageFiles.push(file);

      // Create URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newImagePreviews.push(reader.result);
        setImagePreviewUrls([...newImagePreviews]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(newImageFiles);
  };

  // Remove an image from the selection
  const removeImage = (index) => {
    const newSelectedImages = [...selectedImages];
    const newImagePreviewUrls = [...imagePreviewUrls];

    newSelectedImages.splice(index, 1);
    newImagePreviewUrls.splice(index, 1);

    setSelectedImages(newSelectedImages);
    setImagePreviewUrls(newImagePreviewUrls);
  };

  // Submit the post creation
  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!postTitle.trim()) {
      setCreatePostError('Please enter a title for your post');
      return;
    }

    if (!postContent.trim()) {
      setCreatePostError('Please enter content for your post');
      return;
    }

    setCreatePostLoading(true);
    setCreatePostError('');

    try {
      const token = localStorage.getItem('token');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('Title', postTitle);
      formData.append('Content', postContent);
      formData.append('Tournament_Id', tournamentId);
      
      // Append each selected image with the correct field name 'images'
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      // Send the post data to the API
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/create`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      if (response.data && response.data.status === 'success') {
        setCreatePostSuccess(true);

        // Refetch posts to include the new one
        const postsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/tournament/${tournamentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (postsResponse.data && postsResponse.data.data && postsResponse.data.data.posts) {
          setPosts(postsResponse.data.data.posts);
        }

        // Close the modal after a delay
        setTimeout(() => {
          closeCreatePostModal();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setCreatePostError(
        error.response?.data?.message || 'Failed to create post'
      );
    } finally {
      setCreatePostLoading(false);
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

  // Comment component for displaying top comments
  const Comment = ({ comment }) => {
    return (
      <div className={`pl-3 py-2 border-l-2 ${isLight ? 'border-orange-300' : 'border-orange-700'} 
                    group-hover:border-orange-500 transition-colors rounded-md
                    ${isLight ? 'bg-orange-50/50' : 'bg-orange-900/10'} backdrop-blur-sm`}>
        <div className="flex items-center mb-1">
          <div className="w-5 h-5 rounded-full bg-gray-600 mr-2 flex items-center justify-center overflow-hidden">
            {comment.author && comment.author.profile_pic_url ? (
              <ImageWithFallback
                src={comment.author.profile_pic_url}
                imageKey={comment.author.profile_pic_key}
                alt={comment.author?.Name || 'Anonymous'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="text-white text-xs">
                {comment.author?.Name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">
              {comment.author?.Name || 'Anonymous'}
            </div>
          </div>
          <div className="text-xs opacity-70 ml-auto">
            {formatDate(comment.created_at || comment.Created_At)}
          </div>
        </div>
        <p className="text-xs ml-7 line-clamp-2">{comment.Content}</p>
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
          <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse`}></div>
          <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
          <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
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
          <p className={`mt-6 ${isLight ? 'text-orange-700' : 'text-gray-400'} animate-pulse text-lg`}>Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-gray-900'} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-0 -right-40 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-40 left-1/2 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <div className="relative">
            {/* Outer spinner */}
            <div className={`w-16 h-16 border-4 ${isLight ? 'border-orange-500/20' : 'border-orange-500/30'} border-t-orange-500 rounded-full animate-spin`}></div>
            {/* Inner spinner */}
            <div className={`absolute top-0 left-0 w-16 h-16 border-4 ${isLight ? 'border-red-500/20' : 'border-red-500/30'} border-t-red-500 rounded-full animate-spin animation-delay-500`}></div>
          </div>
          <p className={`mt-4 text-lg font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'} animate-pulse`}>
            {error}
          </p>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className={`mt-4 px-4 py-2 ${isLight ? 'bg-orange-500 text-white' : 'bg-orange-400 text-black'} rounded-lg`}
          >
            Back to Tournament
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
                <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Main Content with Sidebar Layout */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 xl:gap-6">
          {/* Left Sidebar for Navigation and Ads */}
          <div className="w-full xl:w-56 xl:flex-shrink-0 mb-6 xl:mb-0">
            <div className="xl:sticky xl:top-4">
              <button
                onClick={() => navigate(`/tournaments/${tournamentId}`)}
                className={`flex items-center gap-2 ${isLight 
                  ? 'text-orange-600 hover:text-orange-500 border-orange-400 hover:bg-orange-50' 
                  : 'text-orange-400 hover:text-orange-300 border-orange-500 hover:bg-orange-500/10'} transition duration-200 px-4 py-2 border rounded-lg mb-6 w-full`}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to Tournament
              </button>
              
              {/* Left sidebar ads - Match post rows */}
              <div className="hidden xl:block space-y-4">
                {Array.from({ length: Math.max(1, Math.ceil(posts.length / 3)) }).map((_, index) => {
                  // Combine all available sponsor images
                  const allSponsorImages = [
                    ...sponsorImages.banner_images,
                    ...sponsorImages.promotional_images,
                    ...sponsorImages.logo_images,
                    ...sponsorImages.additional_images
                  ].filter(img => img && img.url); // Filter out any null/undefined images
                  
                  // If no sponsor images available, use a fallback
                  const imagesToShow = allSponsorImages.length > 0 ? allSponsorImages : [];
                  
                  const adTypes = [
                    { images: imagesToShow, placeholder: "Gaming Gear" },
                    { images: imagesToShow, placeholder: "Tournaments" },
                    { images: imagesToShow, placeholder: "Gaming Events" },
                    { images: imagesToShow, placeholder: "Sponsors" }
                  ];
                  const adType = adTypes[index % adTypes.length];
                  
                  return (
                    <Advertisement 
                      key={`left-ad-${index}`}
                      type="sidebar" 
                      images={adType.images}
                      placeholder={adType.placeholder}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Center */}
          <div className="flex-grow max-w-5xl mx-auto w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight ? 'from-orange-400/10 to-red-400/10 border-orange-400/20' : 'from-orange-600/20 to-red-600/20 border-orange-500/30'} px-6 py-2 rounded-full border mb-4`}>
                  <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-orange-700' : 'text-orange-300'}`}>TOURNAMENT COMMUNITY</span>
                  <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
                </div>
                <h1 className={`text-3xl font-bold ${isLight 
                  ? 'bg-gradient-to-r from-orange-600 via-red-600 to-red-600' 
                  : 'bg-gradient-to-r from-orange-400 via-red-400 to-red-400'} bg-clip-text text-transparent`}>
                  Tournament Posts
                </h1>
              </div>
              <button
                onClick={openCreatePostModal}
                className={`px-4 py-2 ${isLight 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                  : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} text-white rounded-xl font-bold transition-all duration-300 flex items-center gap-2 hover:shadow-lg ${isLight ? 'hover:shadow-orange-400/25' : 'hover:shadow-orange-500/25'} text-sm`}
              >
                <FontAwesomeIcon icon={faPlus} />
                Create Post
              </button>
            </div>

            {posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {posts.map((post, index) => {
                 
                  

                  
                  return (
                    <React.Fragment key={post.Post_id}>
                      <div className="transition-all duration-300 hover:scale-[1.02] hover:z-10">
                        {/* Uniform Post Card */}
                        <div 
                          onClick={() => handleViewPost(post.Post_id)}
                          className={`group h-[480px] flex flex-col relative ${isLight 
                            ? 'bg-white/90 backdrop-blur-sm border-2 border-orange-200' 
                            : 'bg-black/60 backdrop-blur-xl border-2 border-orange-300'} 
                            rounded-2xl overflow-hidden cursor-pointer
                            transform perspective-1000 transition-all duration-500
                            shadow-xl hover:shadow-2xl
                            ${isLight ? 'hover:shadow-orange-400/20' : 'hover:shadow-orange-500/30'}
                            hover:translate-y-[-3px] hover:border-orange-500
                            ${post.Is_Sponsored_Post ? `${isLight ? 'ring-2 ring-yellow-400' : 'ring-2 ring-yellow-500'}` : ''}`}
                        >
                          {/* Card Glow Effect - Enhanced for 3D look */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${isLight 
                            ? 'from-orange-400/0 via-orange-400/5 to-red-400/0' 
                            : 'from-orange-600/0 via-orange-600/5 to-red-600/0'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                          {/* 3D Border Effect */}
                          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 opacity-30 animate-gradient-x"></div>
                          </div>

                          {/* Post Header with Author */}
                          <div className="p-3 flex items-center border-b border-gray-700 relative z-10">
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2 
                                          group-hover:ring-2 group-hover:ring-orange-500 transition-all duration-300">
                              {post.author && post.author.profile_pic_url ? (
                                <ImageWithFallback
                                  src={post.author.profile_pic_url}
                                  imageKey={post.author.profile_pic_key}
                                  alt={post.author.Name || 'Author'}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                                  {post.author?.Name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="font-semibold text-sm">
                                {post.author?.Name || 'Anonymous'}
                              </div>
                              <div className="text-xs opacity-70">
                                {formatDate(post.created_at || post.Created_At)}
                              </div>
                            </div>
                            {post.Is_Sponsored_Post && (
                              <div className={`ml-2 px-2 py-1 ${isLight 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                : 'bg-gradient-to-r from-yellow-400 to-orange-500'} text-black text-xs rounded-full whitespace-nowrap
                                animate-pulse-slow transform group-hover:scale-105 transition-transform`}>
                                Sponsored
                              </div>
                            )}
                          </div>

                          {/* Post Title */}
                          <div className="p-3 pb-2">
                            <h2 className={`text-sm font-semibold ${isLight ? 'text-gray-800' : 'text-white'} group-hover:text-orange-500 transition-colors line-clamp-2`}>
                              {post.Title}
                            </h2>
                          </div>

                          {/* Post Content */}
                          <div className="px-3 pb-3">
                            <p className="text-xs whitespace-pre-wrap line-clamp-2">{post.Content}</p>
                          </div>

                          {/* Post Images */}
                          {post.Image_Urls && post.Image_Urls.length > 0 && (
                            <div className="relative mb-3 mt-auto">
                              <div className="w-full h-40 bg-gray-800 flex items-center justify-center overflow-hidden">
                                {post.Image_Urls[currentImageIndex[post.Post_id] || 0] ? (
                                  <img
                                    src={post.Image_Urls[currentImageIndex[post.Post_id] || 0]}
                                    alt={`Post by ${post.author?.Name || 'Anonymous'}`}
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                      console.error("Image failed to load:", post.Image_Urls[currentImageIndex[post.Post_id] || 0]);
                                      
                                      // If there are image keys and the current post has them, try to refresh the URL
                                      if (post.Image_Keys && post.Image_Keys.length > 0) {
                                        const currentKey = post.Image_Keys[currentImageIndex[post.Post_id] || 0];
                                        
                                        
                                        // For now, just hide the image if it fails
                                        e.target.onerror = null; // Prevent infinite loop
                                        e.target.style.display = 'none';
                                        
                                        // Show a placeholder
                                        const placeholder = document.createElement('div');
                                        placeholder.className = 'w-full h-full flex items-center justify-center text-white';
                                        placeholder.textContent = 'Image unavailable';
                                        e.target.parentNode.appendChild(placeholder);
                                      } else {
                                        // If there's no key, just hide the image
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="text-gray-500 text-sm">No image available</div>
                                )}
                              </div>
                                                              {post.Image_Urls.length > 1 && (
                                <div className="absolute bottom-2 left-0 right-0 text-center">
                                  <div className={`inline-block ${isLight 
                                    ? 'bg-black/50 text-white' 
                                    : 'bg-black/70 text-white'} px-2 py-1 rounded-full text-xs`}>
                                    {(currentImageIndex[post.Post_id] || 0) + 1} /{' '}
                                    {post.Image_Urls.length}
                                  </div>
                                </div>
                              )}

                              {/* Navigation arrows */}
                              {post.Image_Urls.length > 1 && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      prevImage(post.Post_id);
                                    }}
                                    className={`absolute left-1 top-1/2 transform -translate-y-1/2 ${isLight 
                                      ? 'bg-black/50 hover:bg-black/70' 
                                      : 'bg-black/70 hover:bg-black/90'} text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                      hover:scale-110 active:scale-95`}
                                    aria-label="Previous image"
                                  >
                                    <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      nextImage(post.Post_id);
                                    }}
                                    className={`absolute right-1 top-1/2 transform -translate-y-1/2 ${isLight 
                                      ? 'bg-black/50 hover:bg-black/70' 
                                      : 'bg-black/70 hover:bg-black/90'} text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                      hover:scale-110 active:scale-95`}
                                    aria-label="Next image"
                                  >
                                    <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Post interactions info */}
                          <div className="px-3 pb-2 text-xs flex gap-3 mt-auto">
                            <span><b>{post.UpVotes || 0}</b> Upvotes</span>
                            <span><b>{post.comment_count || post.totalComments || 0}</b> Comments</span>
                          </div>

                          {/* Post Actions */}
                          <div className="flex justify-between items-center p-3 border-t border-gray-700 mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(post.Post_id, 'upvote', e);
                              }}
                              className={`px-2 py-1 text-xs ${userVotes[post.Post_id] === 'upvote' 
                                ? `${isLight 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                                  : 'bg-gradient-to-r from-orange-600 to-red-600'} text-white` 
                                : isLight 
                                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                  : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'} 
                                  rounded-lg transition-all duration-300
                                  hover:scale-105 active:scale-95 transform`}
                            >
                              <FontAwesomeIcon icon={faThumbsUp} className="mr-1" />
                              Upvote
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPost(post.Post_id);
                              }}
                              className={`px-2 py-1 text-xs ${isLight 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} 
                                text-white rounded-lg transition-all duration-300
                                hover:scale-105 active:scale-95 transform`}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                      

                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-12 ${isLight 
                ? 'bg-white/80 backdrop-blur-sm border-2 border-orange-400' 
                : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500'} rounded-2xl`}>
                <div className="relative mb-8">
                  <FontAwesomeIcon icon={faTrophy} className={`text-6xl ${isLight ? 'text-gray-400' : 'text-gray-600'} animate-pulse`} />
                  <div className={`absolute -top-2 -right-2 w-6 h-6 ${isLight ? 'bg-orange-500' : 'bg-orange-500'} rounded-full animate-ping`}></div>
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${isLight 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600' 
                  : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent`}>
                  No Posts Yet
                </h3>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'} mb-8`}>
                  Be the first to create a post and start the discussion!
                </p>
                <button
                  onClick={openCreatePostModal}
                  className={`px-6 py-3 ${isLight 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} text-white rounded-xl font-bold transition-all duration-300 flex items-center gap-2 hover:shadow-lg ${isLight ? 'hover:shadow-orange-400/25' : 'hover:shadow-orange-500/25'} mx-auto`}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>Create First Post</span>
                  </button>
              </div>
            )}
          </div>
          
          {/* Right Sidebar Ads - Hidden on mobile */}
          <div className="hidden xl:block w-56 flex-shrink-0">
            <div className="space-y-4 mt-[76px]">
              {Array.from({ length: Math.max(1, Math.ceil(posts.length / 3)) }).map((_, index) => {
                // Combine all available sponsor images
                const allSponsorImages = [
                  ...sponsorImages.banner_images,
                  ...sponsorImages.promotional_images,
                  ...sponsorImages.logo_images,
                  ...sponsorImages.additional_images
                ].filter(img => img && img.url); // Filter out any null/undefined images
                
                // If no sponsor images available, use a fallback
                const imagesToShow = allSponsorImages.length > 0 ? allSponsorImages : [];
                
                const adTypes = [
                  { images: imagesToShow, placeholder: "Esports Events" },
                  { images: imagesToShow, placeholder: "Gaming Hardware" },
                  { images: imagesToShow, placeholder: "Tournament Sponsors" },
                  { images: imagesToShow, placeholder: "Game Releases" }
                ];
                const adType = adTypes[index % adTypes.length];
                
                return (
                  <Advertisement 
                    key={`right-ad-${index}`}
                    type="sidebar" 
                    images={adType.images}
                    placeholder={adType.placeholder}
                  />
                );
              })}
            </div>
          </div>
        </div>


      </div>
      
      {/* Create Post Modal */}
      {showCreateModal && (
        <div className={`fixed inset-0 ${isLight ? 'bg-black/50' : 'bg-black/70'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
          <div className={`${isLight 
            ? 'bg-white/95 border-2 border-orange-200' 
            : 'bg-black/95 border-2 border-orange-500/30'} backdrop-blur-xl rounded-2xl p-6 shadow-2xl max-w-2xl w-full`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${isLight 
                ? 'bg-gradient-to-r from-orange-600 to-red-600' 
                : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent`}>
                Create a Post
              </h2>
              <button
                onClick={closeCreatePostModal}
                className={`${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} transition-colors`}
                disabled={createPostLoading}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {createPostSuccess ? (
              <div className="text-center py-8">
                <FontAwesomeIcon
                  icon={faCheck}
                  className={`${isLight ? 'text-green-600' : 'text-green-400'} text-4xl mb-4`}
                />
                <p className={`text-center ${isLight ? 'text-green-600' : 'text-green-400'} font-medium`}>
                  Post created successfully!
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreatePost}>
                {createPostError && (
                  <div className={`${isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400'} p-3 rounded-lg mb-4`}>
                    {createPostError}
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="postTitle" className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Title
                  </label>
                  <input
                    type="text"
                    id="postTitle"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={`w-full p-3 ${isLight 
                      ? 'bg-white/80 border-gray-300 focus:border-orange-400 focus:shadow-orange-400/25' 
                      : 'bg-black/40 border-gray-600 focus:border-orange-400 focus:shadow-orange-500/25'} border-2 rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300`}
                    placeholder="Enter post title"
                    disabled={createPostLoading}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="postContent" className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Content
                  </label>
                  <textarea
                    id="postContent"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className={`w-full p-3 ${isLight 
                      ? 'bg-white/80 border-gray-300 focus:border-orange-400 focus:shadow-orange-400/25' 
                      : 'bg-black/40 border-gray-600 focus:border-orange-400 focus:shadow-orange-500/25'} border-2 rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300 min-h-[150px]`}
                    placeholder="Write your post content here..."
                    disabled={createPostLoading}
                  />
                </div>

                <div className="mb-6">
                  <label className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Images (optional, max 5)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className={`absolute top-1 right-1 ${isLight 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-red-600 hover:bg-red-700'} text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors`}
                          disabled={createPostLoading}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={createPostLoading || selectedImages.length >= 5}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed ${isLight 
                      ? 'border-gray-300 hover:border-orange-400' 
                      : 'border-gray-600 hover:border-orange-500'} rounded-xl p-4 w-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                      createPostLoading || selectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={createPostLoading || selectedImages.length >= 5}
                  >
                    <FontAwesomeIcon icon={faImage} className={`text-2xl mb-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      Click to select images
                      <br />
                      <span className="text-xs opacity-70">
                        {selectedImages.length}/5 images selected
                      </span>
                    </p>
                  </button>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreatePostModal}
                    className={`px-4 py-2 ${isLight 
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                      : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'} rounded-lg transition-all duration-300 cursor-pointer`}
                    disabled={createPostLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 ${isLight 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} text-white rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer`}
                    disabled={createPostLoading}
                  >
                    {createPostLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} />
                        <span>Create Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentPosts;
