import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faGamepad,
  faCalendarAlt,
  faUserCircle,
  faSignOutAlt,
  faPlus,
  faBell,
  faExclamationTriangle,
  faChartLine,
  faEdit,
  faTrash,
  faEye,
  faNewspaper
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Dashboard = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [userTournaments, setUserTournaments] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      // Parse user data from localStorage
      const parsedUser = JSON.parse(userData);

      // Set initial user data (without profile pic URL for now)
      setUser({
        user_id: parsedUser.user_id || '',
        Name: parsedUser.Name || '',
        GamerTag:
          typeof parsedUser.GamerTag === 'object'
            ? Object.keys(parsedUser.GamerTag).length > 0
              ? Object.keys(parsedUser.GamerTag)[0]
              : 'gamer'
            : parsedUser.GamerTag || 'gamer',
        email: parsedUser.email || '',
        profile_pic_url: null, // Will be fetched from backend
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      setError('Error loading user data');
      setUser(null);
    }

    // Create a function to handle API calls
    const fetchData = async () => {
      try {
        // First, fetch updated user profile to get fresh profile pic URL
        const profileResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (profileResponse.data && profileResponse.data.data) {
          const profileData = profileResponse.data.data;
          
          // Update user with fresh profile data including pre-signed URL
          setUser(prevUser => ({
            ...prevUser,
            profile_pic_url: profileData.profile_pic_url || null,
            // Update other fields that might have changed
            Name: profileData.Name || prevUser.Name,
            GamerTag: typeof profileData.GamerTag === 'object'
              ? Object.keys(profileData.GamerTag).length > 0
                ? Object.keys(profileData.GamerTag)[0]
                : prevUser.GamerTag
              : profileData.GamerTag || prevUser.GamerTag,
            email: profileData.email || prevUser.email,
          }));

          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(profileData));
        }

        // Fetch upcoming tournaments
        const upcomingResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/upcoming`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Check if response has expected structure
        if (upcomingResponse.data && upcomingResponse.data.data) {
          setUpcomingTournaments(upcomingResponse.data.data);
        } else {
          setUpcomingTournaments([]);
        }

        // Fetch user tournaments for recent activities
        const userTournamentsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/user/my-tournaments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (userTournamentsResponse.data && userTournamentsResponse.data.data) {
          setUserTournaments(userTournamentsResponse.data.data);
        } else {
          setUserTournaments([]);
        }

        // Fetch user posts
        const userPostsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/user/my-posts?limit=3`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (userPostsResponse.data && userPostsResponse.data.data) {
          setUserPosts(userPostsResponse.data.data.posts);
        } else {
          setUserPosts([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        
        // If it's an auth error, redirect to login
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the deleted post from the state
      setUserPosts(userPosts.filter(post => post.Post_id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleEditPost = (postId) => {
    // Navigate to edit post page (you might need to create this page)
    navigate(`/my-posts`);
  };

  const handleViewPost = (postId) => {
    // Navigate to view post page
    navigate(`/post/${postId}`);
  };

  // Transform user tournaments into recent activities format
  const getRecentActivities = () => {
    if (!userTournaments || userTournaments.length === 0) return [];

    // Create activities from user tournaments
    return userTournaments
      .map((item, index) => {
        // Using the tournament data from the API
        const tournament = item.tournament;
        const userRole = item.userRole;
        
        // Get date from tournament registration or listing date
        const date = new Date(tournament.listed_at).toISOString();
        
        return {
          id: index,
          type: userRole === 'leader' ? 'host' : 'join',
          tournament: tournament.tournament_Name,
          tournamentId: tournament.tournament_id,
          date: date,
          gameName: tournament.GameName
        };
      })
      // Sort by date (newest first)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      // Take only the 3 most recent activities
      .slice(0, 3);
  };

  // Get processed recent activities
  const recentActivity = getRecentActivities();

  // Show loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
            ? 'from-purple-300/20 to-pink-300/20' 
            : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
          <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
            ? 'from-blue-300/20 to-cyan-300/20' 
            : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
          <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
        </div>

        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-purple-600' 
              : 'border-purple-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-pink-600' 
              : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl max-w-md w-full text-center`}>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className={`text-5xl mb-6 ${isLight ? 'text-red-600' : 'text-red-400'}`}
            />
            <p className="text-xl mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className={`px-6 py-3 bg-gradient-to-r ${isLight 
                ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is null after loading is complete, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
          ? 'from-purple-300/20 to-pink-300/20' 
          : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
        <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
          ? 'from-blue-300/20 to-cyan-300/20' 
          : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
          ? 'from-orange-300/20 to-red-300/20' 
          : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
      </div>

      <Navbar />

      {/* Dashboard header */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-purple-600 via-pink-600 to-red-600' 
              : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent`}>
              Dashboard
            </h1>
            <p className={`text-lg mt-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              Welcome back, {user.Name}!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className={`${isLight 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} p-2 rounded-full text-white shadow-lg`}>
              <FontAwesomeIcon icon={faBell} />
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 ${isLight 
                ? 'border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white' 
                : 'border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white'} rounded-xl transition-all duration-300 font-semibold`}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              Logout
            </button>
          </div>
        </div>

        {/* Main dashboard grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className={`col-span-1 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
            <div className="flex flex-col items-center">
              {user.profile_pic_url ? (
                <img
                  src={user.profile_pic_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-purple-500/50"
                />
              ) : (
                <div className={`w-24 h-24 rounded-full mb-4 flex items-center justify-center ${isLight 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>
                  <FontAwesomeIcon icon={faUserCircle} className="text-4xl" />
                </div>
              )}
              <h2 className={`text-2xl font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                {user.Name}
              </h2>
              <p className={`${isLight ? 'text-purple-600' : 'text-purple-400'}`}>@{user.GamerTag}</p>

              <div className="w-full mt-6">
                <div className={`flex justify-between py-2 border-b ${isLight ? 'border-gray-300/50' : 'border-gray-700/50'}`}>
                  <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className={`flex justify-between py-2 border-b ${isLight ? 'border-gray-300/50' : 'border-gray-700/50'}`}>
                  <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Tournaments</span>
                  <span className="font-medium">{userTournaments.length || 0}</span>
                </div>
                <div className={`flex justify-between py-2 border-b ${isLight ? 'border-gray-300/50' : 'border-gray-700/50'}`}>
                  <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Victories</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Points</span>
                  <span className="font-medium">-</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className={`w-full mt-6 py-2 px-4 bg-gradient-to-r ${isLight 
                  ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                  : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-purple-500/25 transform hover:scale-105`}
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Middle column - My Posts */}
          <div className={`col-span-1 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-semibold bg-gradient-to-r ${isLight 
                ? 'from-purple-600 to-blue-600' 
                : 'from-purple-400 to-blue-400'} bg-clip-text text-transparent`}>
                My Posts
              </h2>
              <FontAwesomeIcon icon={faNewspaper} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
            </div>

            {userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.Post_id}
                    className={`p-4 ${isLight 
                      ? 'border border-gray-300/50 hover:border-purple-500/50 bg-white/40' 
                      : 'border border-gray-700/50 hover:border-purple-500/50 bg-black/40'} rounded-xl transition-all duration-300 hover:shadow-lg`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'} line-clamp-2 flex-1`}>
                        {post.Title}
                      </h3>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => handleViewPost(post.Post_id)}
                          className={`p-1.5 rounded-lg ${isLight 
                            ? 'text-blue-600 hover:bg-blue-100' 
                            : 'text-blue-400 hover:bg-blue-900/30'} transition-colors duration-200`}
                          title="View Post"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleEditPost(post.Post_id)}
                          className={`p-1.5 rounded-lg ${isLight 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-green-400 hover:bg-green-900/30'} transition-colors duration-200`}
                          title="Edit Post"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.Post_id)}
                          className={`p-1.5 rounded-lg ${isLight 
                            ? 'text-red-600 hover:bg-red-100' 
                            : 'text-red-400 hover:bg-red-900/30'} transition-colors duration-200`}
                          title="Delete Post"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-sm" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Tournament Info */}
                    <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>
                      <span className="font-medium">Tournament:</span>{' '}
                      <button
                        onClick={() => navigate(`/tournaments/${post.Tournament.tournament_id}`)}
                        className={`${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'} hover:underline`}
                      >
                        {post.Tournament.tournament_Name}
                      </button>
                    </div>

                    {/* Post Stats */}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-4">
                        <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {post.Tournament.GameName}
                        </span>
                        <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${post.vote_score > 0 
                          ? isLight ? 'text-green-600' : 'text-green-400'
                          : post.vote_score < 0 
                            ? isLight ? 'text-red-600' : 'text-red-400'
                            : isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {post.vote_score > 0 ? '+' : ''}{post.vote_score}
                        </span>
                        <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                          {post.comment_count} comments
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/my-posts')}
                  className={`w-full py-2 ${isLight 
                    ? 'border-2 border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white' 
                    : 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white'} rounded-xl transition-all duration-300 font-semibold`}
                >
                  View All Posts
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FontAwesomeIcon
                  icon={faNewspaper}
                  className={`text-4xl mb-4 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}
                />
                <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>No posts yet</p>
                <button
                  onClick={() => navigate('/upcoming-tournaments')}
                  className={`py-2 px-4 bg-gradient-to-r ${isLight 
                    ? 'from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400' 
                    : 'from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
                >
                  Join Tournaments & Create Posts
                </button>
              </div>
            )}
          </div>

          {/* Right column - Recent activity */}
          <div className={`col-span-1 ${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-semibold bg-gradient-to-r ${isLight 
                ? 'from-blue-600 to-cyan-600' 
                : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent`}>
                Recent Activity
              </h2>
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className={isLight ? 'text-blue-600' : 'text-blue-400'}
              />
            </div>

            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-3 ${isLight 
                      ? 'border border-gray-300/50 hover:border-blue-500/50 bg-white/40' 
                      : 'border border-gray-700/50 hover:border-blue-500/50 bg-black/40'} rounded-xl transition-all duration-300 cursor-pointer hover:shadow-lg`}
                    onClick={() => navigate(`/tournaments/${activity.tournamentId}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-full ${
                          activity.type === 'host' 
                            ? isLight ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                            : activity.type === 'join' 
                              ? isLight ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'
                              : isLight ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-amber-600 to-orange-600'
                        } text-white shadow-md`}
                      >
                        <FontAwesomeIcon
                          icon={
                            activity.type === 'host'
                              ? faGamepad
                              : activity.type === 'join'
                                ? faGamepad
                                : faCalendarAlt
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className={`font-medium text-sm ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            {activity.type === 'host'
                              ? 'You created a tournament'
                              : 'You joined a tournament'}
                          </p>
                          <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(activity.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'} truncate`}>
                          {activity.tournament}
                        </p>
                        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                          {activity.gameName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className={`text-4xl mb-4 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}
                  />
                  <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>No recent activity</p>
                  <button
                    onClick={() => navigate('/upcoming-tournaments')}
                    className={`py-2 px-4 bg-gradient-to-r ${isLight 
                      ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                      : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300`}
                  >
                    Join a Tournament
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8">
          <h2 className={`text-2xl font-bold mb-4 bg-gradient-to-r ${isLight 
            ? 'from-purple-600 to-pink-600' 
            : 'from-purple-400 to-pink-400'} bg-clip-text text-transparent`}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/upcoming-tournaments')}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-green-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-green-500/50'} p-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              <div className="flex flex-col items-center">
                <FontAwesomeIcon
                  icon={faGamepad}
                  className={`text-3xl mb-2 ${isLight ? 'text-green-600' : 'text-green-400'}`}
                />
                <span className="font-medium">
                  Join Tournament
                </span>
              </div>
            </button>
            <button
              onClick={() => navigate('/create-tournament')}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-green-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-green-500/50'} p-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              <div className="flex flex-col items-center">
                <FontAwesomeIcon
                  icon={faPlus}
                  className={`text-3xl mb-2 ${isLight ? 'text-green-600' : 'text-green-400'}`}
                />
                <span className="font-medium">
                  Create Tournament
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/my-tournaments')}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-blue-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-blue-500/50'} p-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              <div className="flex flex-col items-center">
                <FontAwesomeIcon
                  icon={faGamepad}
                  className={`text-3xl mb-2 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
                />
                <span className="font-medium">
                  My Tournaments
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/my-statistics')}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-purple-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-purple-500/50'} p-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              <div className="flex flex-col items-center">
                <FontAwesomeIcon
                  icon={faChartLine}
                  className={`text-3xl mb-2 ${isLight ? 'text-purple-600' : 'text-purple-400'}`}
                />
                <span className="font-medium">My Statistics</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
