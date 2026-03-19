import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import Advertisement from '../components/Advertisement';
import ImageWithFallback from '../components/ImageWithFallback';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faThumbsUp,
  faThumbsDown,
  faComment,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';

const AllPosts = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [userVotes, setUserVotes] = useState({});

  // Global sponsor images state
  const [globalSponsorImages, setGlobalSponsorImages] = useState({
    banner_images: [],
    promotional_images: [],
    logo_images: [],
    additional_images: []
  });
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/all`,
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

        // Fetch global sponsor images
        try {
          const sponsorsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/sponsors/global/sponsor-images`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (sponsorsResponse.data && sponsorsResponse.data.data) {
            setGlobalSponsorImages(sponsorsResponse.data.data);
          }
        } catch (sponsorError) {
          console.error('Error fetching global sponsor images:', sponsorError);
          // Set default empty arrays if no sponsor images are found
          setGlobalSponsorImages({
            banner_images: [],
            promotional_images: [],
            logo_images: [],
            additional_images: []
          });
        } finally {
          setLoadingSponsors(false);
        }
      } catch (error) {
        console.error('Error fetching all posts:', error);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
        setLoadingSponsors(false);
      }
    };

    fetchPosts();
  }, []);

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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <p className={`mt-6 ${isLight ? 'text-orange-700' : 'text-gray-400'} animate-pulse text-lg`}>Loading epic posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="text-center py-20">
          <h2 className="text-2xl text-red-500">{error}</h2>
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

  // Comment component for displaying top comments
  const Comment = ({ comment }) => {
    return (
      <div className="pl-4 py-2 border-l-2 border-gray-700 mt-2">
        <div className="flex items-center mb-1">
          <div className="w-6 h-6 rounded-full bg-gray-600 mr-2 flex items-center justify-center">
            {comment.author && comment.author.profile_pic_url ? (
              <img
                src={comment.author.profile_pic_url}
                alt={comment.author.Name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="text-white text-xs">
                {comment.author?.Name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium">
              {comment.author?.Name || 'Anonymous'}
            </div>
            <div className="text-xs opacity-70">
              {formatDate(comment.created_at)}
            </div>
          </div>
        </div>
        <p className="text-xs ml-8">{comment.Content}</p>
      </div>
    );
  };

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
        {/* Hero Header Section */}
        <div className="text-center mb-12 relative">
          <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight ? 'from-orange-400/10 to-red-400/10 border-orange-400/20' : 'from-orange-600/20 to-red-600/20 border-orange-500/30'} px-6 py-2 rounded-full border mb-6`}>
            <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
            <span className={`text-sm font-semibold ${isLight ? 'text-orange-700' : 'text-orange-300'}`}>TRENDING POSTS</span>
            <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${isLight 
            ? 'bg-gradient-to-r from-orange-600 via-red-600 to-red-600' 
            : 'bg-gradient-to-r from-orange-400 via-red-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
            GAMING COMMUNITY
          </h1>
          <p className={`text-xl ${isLight ? 'text-gray-600' : 'text-gray-300'} max-w-2xl mx-auto`}>
            Join the conversation and share your gaming experiences!
          </p>
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 xl:gap-6">
          {/* Left Sidebar for Ads */}
          <div className="w-full xl:w-56 xl:flex-shrink-0 mb-6 xl:mb-0">
            <div className="xl:sticky xl:top-4">              
              {/* Left sidebar ads - Match post rows */}
              <div className="hidden xl:block space-y-4">
                {Array.from({ length: Math.max(1, Math.ceil(posts.length / 3)) }).map((_, index) => {
                  // Combine all available sponsor images
                  const allSponsorImages = [
                    ...globalSponsorImages.banner_images,
                    ...globalSponsorImages.promotional_images,
                    ...globalSponsorImages.logo_images,
                    ...globalSponsorImages.additional_images
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
            {posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {posts.map((post, index) => {
                  return (
                    <div 
                      key={post.Post_id} 
                      className="transition-all duration-300 hover:scale-[1.02] hover:z-10"
                    >
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
                              {formatDate(post.created_at)}
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
                                    
                                    e.target.onerror = null; // Prevent infinite loop
                                    e.target.style.display = 'none'; // Hide the image if it fails to load
                                  }}
                                />
                              ) : (
                                <div className="text-gray-500 text-sm">No image available</div>
                              )}
                            </div>

                            {/* Image counter indicator */}
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
                          <span><b>{post.comment_count || 0}</b> Comments</span>
                        </div>

                        {/* Post Actions */}
                        <div className="flex justify-between items-center p-3 border-t border-gray-700 mt-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post.Post_id, 'upvote');
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
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-12 ${isLight 
                ? 'bg-white/80 backdrop-blur-sm border-2 border-orange-400' 
                : 'bg-black/60 backdrop-blur-xl border-2 border-orange-500'} rounded-2xl`}>
                <p className={`text-lg mb-2 ${isLight ? 'text-gray-800' : 'text-white'}`}>No trending posts found.</p>
                <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'} text-sm`}>Check back later for popular content!</p>
              </div>
            )}
          </div>
          
          {/* Right Sidebar Ads - Hidden on mobile */}
          <div className="hidden xl:block w-56 flex-shrink-0">
            <div className="space-y-4 mt-[76px]">
              {Array.from({ length: Math.max(1, Math.ceil(posts.length / 3)) }).map((_, index) => {
                // Combine all available sponsor images
                const allSponsorImages = [
                  ...globalSponsorImages.banner_images,
                  ...globalSponsorImages.promotional_images,
                  ...globalSponsorImages.logo_images,
                  ...globalSponsorImages.additional_images
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
    </div>
  );
};

export default AllPosts;
