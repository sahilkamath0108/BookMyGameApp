import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faGamepad,
  faSave,
  faTimesCircle,
  faCheckCircle,
  faEdit,
  faCamera,
  faArrowLeft,
  faSpinner,
  faInfoCircle,
  faLightbulb,
  faPalette,
  faExclamationTriangle,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const GAMES = {
  CallOfDuty: 'Call of Duty',
  PUBG: 'PUBG',
  BGMI: 'BGMI',
  FIFA: 'FIFA',
  Valorant: 'Valorant',
  OverWatch: 'Overwatch'
};

const Profile = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // User data state
  const [user, setUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gamerTags, setGamerTags] = useState({});
  const [selectedGame, setSelectedGame] = useState('');
  const [newGamerTag, setNewGamerTag] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Add a separate loading state for image operations
  const [imageLoading, setImageLoading] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        const userData = response.data.data;
        
        // Update local storage and state with latest data
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setOriginalUser(userData);
        
        // Update form fields
        setName(userData.Name || '');
        setEmail(userData.email || '');
        
        // Update GamerTag - handle both object and string formats
        if (userData.GamerTag) {
          if (typeof userData.GamerTag === 'object') {
            setGamerTags(userData.GamerTag);
          } else if (typeof userData.GamerTag === 'string') {
            setGamerTags({ [Object.keys(GAMES)[0]]: userData.GamerTag });
          } else {
            // Default to empty object for unexpected types
            setGamerTags({});
          }
        } else {
          setGamerTags({});
        }
        
        // Update profile image - ensure it's a valid string
        if (userData.profile_pic_url && typeof userData.profile_pic_url === 'string') {
          
          setImagePreview(userData.profile_pic_url);
        } else {
          
          setImagePreview(null);
        }
      } else {
        console.warn("Unexpected response format:", response.data);
        // Continue with locally stored data
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.response?.data?.message || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('user');

    if (!token || !storedUserData) {
      navigate('/login');
      return;
    }

    // First, set the data from localStorage for immediate display
    try {
      const userData = JSON.parse(storedUserData);
      setUser(userData);
      setOriginalUser(userData);
      setName(userData.Name || '');
      setEmail(userData.email || '');

      // Handle GamerTag (JSONB object in the model)
      if (typeof userData.GamerTag === 'object') {
        setGamerTags(userData.GamerTag || {});
      } else if (typeof userData.GamerTag === 'string') {
        // Convert old string format to object format with the first game's lowercase key
        setGamerTags({ [Object.keys(GAMES)[0]]: userData.GamerTag });
      }

      // Handle profile image - direct link stored in profile_pic_url field
      if (userData.profile_pic_url) {
        
        setImagePreview(userData.profile_pic_url);
      } else {
        
        setImagePreview(null);
      }
      
      // Then, fetch the latest data from the server
      fetchUserProfile();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate, fetchUserProfile]);

  const handleAddGamerTag = () => {
    if (selectedGame && newGamerTag) {
      setGamerTags(prev => ({
        ...prev,
        [selectedGame]: newGamerTag
      }));
      setNewGamerTag('');
      setSelectedGame('');
    }
  };

  const handleRemoveGamerTag = (game) => {
    setGamerTags(prev => {
      const newTags = { ...prev };
      delete newTags[game];
      return newTags;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Prepare the data for update
      const updatedData = {
        Name: name,
        GamerTag: gamerTags // Send the entire gamer tags object
      };

      

      // If profile image has changed, handle image upload first
      if (profileImage) {
        setImageLoading(true);
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('profileImage', profileImage);

        try {
          // Upload the profile image first
          const uploadResponse = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}api/users/profile/image`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          
          // If image upload is successful, get the URL and update profile_pic_url field
          if (
            uploadResponse.data &&
            uploadResponse.data.status === 'success' &&
            uploadResponse.data.data &&
            uploadResponse.data.data.profileImageUrl
          ) {
            // Direct URL string stored in profile_pic_url field
            updatedData.profile_pic_url = uploadResponse.data.data.profileImageUrl;
            
          }
        } catch (imageError) {
          console.error('Error uploading profile image:', imageError);
          setError(imageError.response?.data?.message || 'Failed to upload profile image');
          setSaving(false);
          setImageLoading(false);
          return;
        } finally {
          setImageLoading(false);
        }
      }

      // Update user data
      const updateResponse = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/users/profile`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (updateResponse.data && updateResponse.data.data) {
        const updatedUser = updateResponse.data.data;
        setUser(updatedUser);
        setOriginalUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        
        // Fetch the latest profile data to ensure everything is in sync
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(originalUser.Name || '');
    setEmail(originalUser.email || '');
    setGamerTags(originalUser.GamerTag || {});
    setImagePreview(originalUser.profile_pic_url || null);
    setProfileImage(null);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  // Function to remove profile image
  const handleRemoveProfileImage = async () => {
    try {
      setError(null);
      setImageLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Delete the profile image
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}api/users/profile/image`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.status === 'success') {
        // Update the user state and local storage
        setProfileImage(null);
        setImagePreview(null);
        
        // Set profile_pic_url to null in user data
        const updatedUser = { ...user, profile_pic_url: null };
        setUser(updatedUser);
        setOriginalUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        
        setSuccess('Profile image removed successfully');
        
        // Fetch the latest profile data to ensure everything is in sync
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error removing profile image:', error);
      setError(error.response?.data?.message || 'Failed to remove profile image');
    } finally {
      setImageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F05454]"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${colors.background} ${colors.text}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="text-[#F05454] text-xl mb-4">
            User profile not found. Please log in again.
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-[#F05454] text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
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

      <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
            : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl mb-4 sm:mb-6 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Dashboard</span>
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-purple-600 via-pink-600 to-red-600' 
              : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent`}>
              My Profile
            </h1>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={`mt-3 sm:mt-0 px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg ${isLight 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-2 border-blue-400/50' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-2 border-blue-500/50'}`}
              >
                <FontAwesomeIcon icon={faEdit} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-0 w-full sm:w-auto">
                <button
                  onClick={cancelEditing}
                  className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${isLight 
                    ? 'bg-white/40 text-gray-700 hover:bg-gray-100/50 border-2 border-gray-300/50' 
                    : 'bg-black/40 text-gray-300 hover:bg-gray-800/50 border-2 border-gray-700/50'}`}
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${isLight 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-400/50' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-500/50'}`}
                >
                  {saving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <> 
                      <FontAwesomeIcon icon={faSave} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Status messages */}
          {error && (
            <div className={`mb-4 sm:mb-6 p-4 rounded-xl border-2 shadow-lg flex items-center gap-3 ${isLight 
              ? 'bg-red-100/60 border-red-300/70 text-red-700' 
              : 'bg-red-900/40 border-red-700/50 text-red-300'}`}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
              <div>
                <p className="font-bold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className={`mb-4 sm:mb-6 p-4 rounded-xl border-2 shadow-lg flex items-center gap-3 ${isLight 
              ? 'bg-green-100/60 border-green-300/70 text-green-700' 
              : 'bg-green-900/40 border-green-700/50 text-green-300'}`}>
              <FontAwesomeIcon icon={faCheckCircle} className="text-xl" />
              <div>
                <p className="font-bold">Success</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border-2 border-gray-300/70' 
            : 'bg-black/60 backdrop-blur-xl border-2 border-gray-700/70'} rounded-2xl p-6 sm:p-8 shadow-2xl`}>
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative mb-3 sm:mb-4">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Profile"
                        onError={(e) => {
                          console.error("Failed to load profile image:", imagePreview);
                          setImagePreview(null);
                          e.target.onerror = null;
                        }}
                        className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 ${isLight 
                          ? 'border-purple-500' 
                          : 'border-purple-400'} shadow-lg transition-all duration-300 group-hover:scale-105`}
                      />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <label htmlFor="profile_image" className="cursor-pointer text-white text-sm mb-2">
                            <FontAwesomeIcon icon={faCamera} className="mr-2" />
                            Change Photo
                          </label>
                          <button 
                            type="button" 
                            onClick={handleRemoveProfileImage}
                            disabled={imageLoading}
                            className="text-red-300 hover:text-red-100 text-sm cursor-pointer"
                          >
                            {imageLoading ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
                                Remove
                              </>
                            )}
                          </button>
                          <input
                            type="file"
                            id="profile_image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ${isLight 
                      ? 'bg-gray-200/50 border-4 border-gray-300/50' 
                      : 'bg-gray-700/50 border-4 border-gray-600/50'} flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 relative group`}>
                      <FontAwesomeIcon
                        icon={faUser}
                        className={`text-4xl sm:text-5xl ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <label htmlFor="profile_image" className="cursor-pointer text-white text-sm">
                            <FontAwesomeIcon icon={faCamera} className="mr-2" />
                            Add Photo
                          </label>
                          <input
                            type="file"
                            id="profile_image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {isEditing && (
                    <label
                      htmlFor={imageLoading ? null : "profile_image"}
                      className={`absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${imageLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} shadow-lg transition-all duration-300 hover:scale-110 ${isLight 
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {imageLoading ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="text-white text-base sm:text-lg animate-spin"
                        />
                      ) : (
                        <FontAwesomeIcon
                          icon={faCamera}
                          className="text-white text-base sm:text-lg"
                        />
                      )}
                      {!imageLoading && (
                        <input
                          type="file"
                          id="profile_image"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      )}
                    </label>
                  )}
                </div>

                <h2 className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${isLight 
                  ? 'from-purple-600 to-pink-600' 
                  : 'from-purple-400 to-pink-400'} bg-clip-text text-transparent`}>
                  {user.Name}
                </h2>
              </div>

              {/* Profile Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className={`mb-1 sm:mb-2 font-semibold flex items-center gap-2 text-sm sm:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
                  >
                    <FontAwesomeIcon icon={faUser} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    required
                    className={`w-full p-3 rounded-xl text-base ${isLight 
                      ? 'bg-white/50 border-2 border-gray-300/70 text-gray-800 focus:border-blue-500 focus:ring-blue-500' 
                      : 'bg-black/50 border-2 border-gray-700/70 text-white focus:border-blue-400 focus:ring-blue-400'} focus:outline-none focus:ring-1 transition-all duration-300`}
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className={`block mb-1 sm:mb-2 font-semibold flex items-center gap-2 text-sm sm:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
                  >
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className={isLight ? 'text-green-600' : 'text-green-400'}
                    />
                    <span>Email</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={true}
                    required
                    className={`w-full p-3 rounded-xl text-base ${isLight 
                      ? 'bg-gray-100/50 border-2 border-gray-300/70 text-gray-600' 
                      : 'bg-gray-800/50 border-2 border-gray-700/70 text-gray-400'} focus:outline-none focus:ring-1 transition-all duration-300 cursor-not-allowed`}
                  />
                </div>

                {/* Gamer Tags Section */}
                <div className="col-span-2">
                  <label className={`block mb-1 sm:mb-2 font-semibold flex items-center gap-2 text-sm sm:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    <FontAwesomeIcon icon={faGamepad} className={isLight ? 'text-orange-600' : 'text-orange-400'} />
                    <span>Gamer Tags</span>
                  </label>
                  
                  {/* Display existing gamer tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {Object.entries(gamerTags).map(([game, tag]) => (
                      <div key={game} className={`flex items-center justify-between p-3 rounded-xl ${isLight 
                        ? 'bg-white/50 border-2 border-gray-300/70' 
                        : 'bg-black/50 border-2 border-gray-700/70'}`}>
                        <div>
                          <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                            {GAMES[game] || game}: {tag}
                          </span>
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGamerTag(game)}
                            className={`p-2 rounded-lg ${isLight 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-red-400 hover:bg-red-900/30'}`}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add new gamer tag form */}
                  {isEditing && (
                    <div className={`p-4 rounded-xl ${isLight 
                      ? 'bg-white/50 border-2 border-gray-300/70' 
                      : 'bg-black/50 border-2 border-gray-700/70'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={selectedGame}
                          onChange={(e) => setSelectedGame(e.target.value)}
                          className={`p-3 rounded-xl text-base ${isLight 
                            ? 'bg-white/50 border-2 border-gray-300/70 text-gray-800 focus:border-orange-500 focus:ring-orange-500' 
                            : 'bg-black/50 border-2 border-gray-700/70 text-white focus:border-orange-400 focus:ring-orange-400'} focus:outline-none focus:ring-1 transition-all duration-300`}
                        >
                          <option value="">Select Game</option>
                          {Object.entries(GAMES).map(([key, value]) => (
                            <option key={key} value={key} disabled={gamerTags[key]}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newGamerTag}
                            onChange={(e) => setNewGamerTag(e.target.value)}
                            placeholder="Enter gamer tag"
                            className={`flex-1 p-3 rounded-xl text-base ${isLight 
                              ? 'bg-white/50 border-2 border-gray-300/70 text-gray-800 focus:border-orange-500 focus:ring-orange-500' 
                              : 'bg-black/50 border-2 border-gray-700/70 text-white focus:border-orange-400 focus:ring-orange-400'} focus:outline-none focus:ring-1 transition-all duration-300`}
                          />
                          <button
                            type="button"
                            onClick={handleAddGamerTag}
                            disabled={!selectedGame || !newGamerTag}
                            className={`px-4 py-2 rounded-xl ${isLight 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-orange-600 hover:bg-orange-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {user.created_at && (
                    <div className={`${isLight 
                      ? 'bg-gray-100/50 border-2 border-gray-300/70 text-gray-800' 
                      : 'bg-gray-800/50 border-2 border-gray-700/70 text-gray-300'} rounded-lg p-4 transition-all duration-300 hover:shadow-lg`}>
                      <p className={`text-xs sm:text-sm mb-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Account Created</p>
                      <p className={`font-semibold text-sm sm:text-base ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}

                  {user.updated_at && (
                    <div className={`${isLight 
                      ? 'bg-gray-100/50 border-2 border-gray-300/70 text-gray-800' 
                      : 'bg-gray-800/50 border-2 border-gray-700/70 text-gray-300'} rounded-lg p-4 transition-all duration-300 hover:shadow-lg`}>
                      <p className={`text-xs sm:text-sm mb-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Last Updated</p>
                      <p className={`font-semibold text-sm sm:text-base ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                        {new Date(user.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit button (only shown on small screens when editing) */}
                {isEditing && (
                  <div className="md:hidden">
                    <button
                      type="submit"
                      disabled={saving}
                      className={`w-full py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.01] shadow-lg ${isLight 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-400/50' 
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-500/50'}`}
                    >
                      {saving ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <> 
                          <FontAwesomeIcon icon={faSave} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
