import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft,
  faCheckCircle,
  faSpinner,
  faUpload,
  faImage,
  faInfoCircle,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';

// Using the enum constants
const TOURNAMENT_STATUS = {
  ACCEPTING_REGISTRATIONS: 'Accepting Registrations',
  REGISTRATIONS_CLOSED: 'Registrations Closed',
  IN_PROGRESS: 'In Progress',
  COMING_SOON: 'Coming Soon',
  ENDED: 'Ended',
};

const GAME_NAMES = {
  CALL_OF_DUTY: 'CallOfDuty',
  PUBG: 'PUBG',
  BGMI: 'BGMI',
  FIFA: 'FIFA',
  VALORANT: 'Valorant',
  OVERWATCH: 'OverWatch',
};

const CURRENCIES = {
  USD: 'USD',
  INR: 'INR',
};

const PRIZE_POOL_TYPES = {
  FIXED: 'Fixed',
  DYNAMIC: 'Dynamic',
};

const CreateTournament = () => {
  const navigate = useNavigate();
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  
  // Check if user is logged in when component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } 
  }, [navigate]);
  
  // Function to verify token with backend
  

  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCode, setTournamentCode] = useState('');
  const [gameName, setGameName] = useState(Object.values(GAME_NAMES)[0]);
  const [status, setStatus] = useState(
    TOURNAMENT_STATUS.ACCEPTING_REGISTRATIONS
  );
  const [tournamentPrizePool, setTournamentPrizePool] = useState(
    PRIZE_POOL_TYPES.DYNAMIC
  );
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const [isPrivate, setIsPrivate] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isBracketCompetition, setIsBracketCompetition] = useState(false);

  const [registrationAmount, setRegistrationAmount] = useState('');
  const [currency, setCurrency] = useState(CURRENCIES.USD);
  const [prizeAmount, setPrizeAmount] = useState('');

  // Prize distribution states
  const [firstPlace, setFirstPlace] = useState('');
  const [secondPlace, setSecondPlace] = useState('');
  const [thirdPlace, setThirdPlace] = useState('');

  const [registrationStartTime, setRegistrationStartTime] = useState('');
  const [registrationEndTime, setRegistrationEndTime] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

  const [teamSizeLimit, setTeamSizeLimit] = useState('');
  const [maxPlayersAllowed, setMaxPlayersAllowed] = useState('');
  const [minPlayersRequired, setMinPlayersRequired] = useState('');

  // Banner upload states
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle banner file selection
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Banner image must be less than 5MB');
        return;
      }
      
      setBannerFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
      setError(''); // Clear any previous errors
    }
  };

  // Remove banner
  const removeBanner = () => {
    setBannerFile(null);
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
    }
  };

  // Calculate expected number of teams based on team size and max players
  const calculateExpectedTeams = () => {
    const teamSize = Number(teamSizeLimit) || 1;
    const maxPlayers = Number(maxPlayersAllowed) || 0;
    
    if (teamSize > 0 && maxPlayers > 0) {
      return Math.ceil(maxPlayers / teamSize);
    }
    return 0;
  };

  // Date validation function
  const validateDates = () => {
    const now = new Date();
    
    // Check if all dates are provided
    if (!registrationStartTime || !registrationEndTime || !eventStartTime || !eventEndTime) {
      return 'All date and time fields are required';
    }
    
    // Parse dates more carefully to handle datetime-local format
    const regStart = new Date(registrationStartTime);
    const regEnd = new Date(registrationEndTime);
    const evStart = new Date(eventStartTime);
    const evEnd = new Date(eventEndTime);
    
    // Date validation with lenient time checking
    
    // Check if dates are valid
    if (isNaN(regStart.getTime()) || isNaN(regEnd.getTime()) || isNaN(evStart.getTime()) || isNaN(evEnd.getTime())) {
      return 'Please provide valid dates and times';
    }
    
    // No time constraints - allow any registration start time
    
    // Check chronological order
    if (regEnd <= regStart) {
      return 'Registration end time must be after registration start time';
    }
    
    if (evStart <= regEnd) {
      return 'Event start time must be after registration end time';
    }
    
    if (evEnd <= evStart) {
      return 'Event end time must be after event start time';
    }
    
    return null; // No errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('You must be logged in to create a tournament');
      setLoading(false);
      return;
    }

    // Validate dates
    const dateError = validateDates();
    if (dateError) {
      setError(dateError);
      setLoading(false);
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add banner file if selected
      if (bannerFile) {
        formData.append('banner', bannerFile);
      }
      
      // Add all tournament data
      formData.append('tournament_Name', tournamentName);
      formData.append('Tournament_Code', tournamentCode);
      formData.append('GameName', gameName);
      formData.append('Status', status);
      formData.append('Tournament_Prize_Pool', tournamentPrizePool);
      formData.append('Room_Code', roomCode);
      formData.append('Room_Password', roomPassword);
      formData.append('Is_Private', isPrivate);
      formData.append('Is_Sponsored', isSponsored);
      formData.append('Is_Offline', isOffline);
      formData.append('Is_Bracket_Competition', isBracketCompetition);
      formData.append('Registration_Amount', Number(registrationAmount) || 0);
      formData.append('Currency', currency);
      formData.append('Prize_Amount', Number(prizeAmount) || 0);

      // Prize distribution
      const prizeDistribution = {
        first: Number(firstPlace) || 0,
        second: Number(secondPlace) || 0,
        third: Number(thirdPlace) || 0,
      };
      formData.append('Prize_Distribution', JSON.stringify(prizeDistribution));

      formData.append('Registration_Start_Time', registrationStartTime);
      formData.append('Registration_End_Time', registrationEndTime);
      formData.append('Event_Start_Time', eventStartTime);
      formData.append('Event_End_Time', eventEndTime);
      formData.append('Team_Size_Limit', Number(teamSizeLimit) || 0);
      formData.append('Max_Players_Allowed', Number(maxPlayersAllowed) || 0);
      formData.append('Min_Players_Required', Number(minPlayersRequired) || 0);
      formData.append('Payout_Structure', JSON.stringify({})); // Placeholder for now

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/tournaments/create`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        }
      );

      // Log the response to the console
      
      setSuccess(true);
      setLoading(false);
      
      // Clean up banner preview URL
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      
      // Optional: Navigate after a short delay to show success message
      setTimeout(() => navigate('/my-tournaments'), 1000);
    } catch (err) {
      console.error('Tournament creation failed:', err);
      if (err.response && err.response.status === 401) {
        // Unauthorized - token might be expired
        localStorage.removeItem('token');
        navigate('/login', { state: { from: '/create-tournament', message: 'Your session has expired. Please log in again.' } });
      } else {
        setError('Failed to create tournament: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    }
  };

  const handleBackToDashboard = () => {
    // Clean up banner preview URL when leaving
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    navigate('/dashboard');
  };

  // Clean up preview URL on component unmount
  useEffect(() => {
    return () => {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden py-10`}>
      <Navbar />
      
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
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className={`w-full max-w-4xl mx-auto ${isLight 
          ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
          : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-purple-600 via-pink-600 to-red-600' 
              : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent`}>
              Create a New Tournament
            </h1>
            <button
              onClick={handleBackToDashboard}
              className={`${isLight 
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'} px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-md`}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {success && (
            <div className={`${isLight 
              ? 'bg-green-500/10 border border-green-500/30 text-green-700' 
              : 'bg-green-500/20 border border-green-500/30 text-green-300'} p-4 rounded-xl mb-6 flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} className={`${isLight ? 'text-green-600' : 'text-green-400'}`} />
                <span>Tournament created successfully!</span>
              </div>
              <button
                onClick={handleBackToDashboard}
                className={`${isLight ? 'text-green-700' : 'text-green-300'} hover:underline`}
              >
                Return to Dashboard
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tournament Banner Upload Section */}
            <div className={`p-6 rounded-xl ${isLight 
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200' 
              : 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/50'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                <FontAwesomeIcon icon={faImage} className="mr-2" />
                Tournament Banner
              </h3>
              
              {!bannerPreview ? (
                <div className={`border-2 border-dashed ${isLight 
                  ? 'border-gray-300 hover:border-purple-400' 
                  : 'border-gray-600 hover:border-purple-500'} rounded-xl p-8 text-center transition-colors duration-300`}>
                  <FontAwesomeIcon 
                    icon={faUpload} 
                    className={`text-4xl mb-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} 
                  />
                  <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Upload a banner image for your tournament
                  </p>
                  <label className={`inline-block px-6 py-3 ${isLight 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-xl cursor-pointer transition-colors duration-300`}>
                    <FontAwesomeIcon icon={faUpload} className="mr-2" />
                    Choose Banner Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </label>
                  <p className={`text-sm mt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className={`absolute top-2 right-2 ${isLight 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-red-600 hover:bg-red-700'} text-white p-2 rounded-full transition-colors duration-300`}
                  >
                    ×
                  </button>
                  <div className={`mt-2 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Banner selected: {bannerFile?.name}
                  </div>
                </div>
              )}
            </div>

            {/* Basic Tournament Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Tournament Name</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                  placeholder="Enter tournament name"
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Tournament Code</label>
                <input
                  type="text"
                  value={tournamentCode}
                  onChange={(e) => setTournamentCode(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                  placeholder="e.g. TOUR2025"
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Game</label>
                <select
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                >
                  {Object.values(GAME_NAMES).map((game) => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                >
                  {Object.values(TOURNAMENT_STATUS).map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Prize Pool Type</label>
                <select
                  value={tournamentPrizePool}
                  onChange={(e) => setTournamentPrizePool(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                >
                  {Object.values(PRIZE_POOL_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                >
                  {Object.values(CURRENCIES).map((currencyOption) => (
                    <option key={currencyOption} value={currencyOption}>
                      {currencyOption}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="Optional room code"
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Room Password</label>
                <input
                  type="text"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="Optional password"
                />
              </div>
            </div>

            {/* Tournament Settings */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-medium">
              <label className={`flex items-center space-x-2 p-2 rounded-lg ${isLight 
                ? 'hover:bg-gray-200/70 text-gray-800' 
                : 'hover:bg-gray-700 text-white'} transition-colors duration-200`}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className={`w-5 h-5 ${isLight ? 'accent-purple-600' : 'accent-purple-500'} rounded`}
                />
                <span>Private Tournament</span>
              </label>
              <label className={`flex items-center space-x-2 p-2 rounded-lg ${isLight 
                ? 'hover:bg-gray-200/70 text-gray-800' 
                : 'hover:bg-gray-700 text-white'} transition-colors duration-200`}>
                <input
                  type="checkbox"
                  checked={isSponsored}
                  onChange={(e) => setIsSponsored(e.target.checked)}
                  className={`w-5 h-5 ${isLight ? 'accent-purple-600' : 'accent-purple-500'} rounded`}
                />
                <span>Sponsored</span>
              </label>
              <label className={`flex items-center space-x-2 p-2 rounded-lg ${isLight 
                ? 'hover:bg-gray-200/70 text-gray-800' 
                : 'hover:bg-gray-700 text-white'} transition-colors duration-200`}>
                <input
                  type="checkbox"
                  checked={isOffline}
                  onChange={(e) => setIsOffline(e.target.checked)}
                  className={`w-5 h-5 ${isLight ? 'accent-purple-600' : 'accent-purple-500'} rounded`}
                />
                <span>Offline Event</span>
              </label>
              <label className={`flex items-center space-x-2 p-2 rounded-lg ${isLight 
                ? 'hover:bg-gray-200/70 text-gray-800' 
                : 'hover:bg-gray-700 text-white'} transition-colors duration-200`}>
                <input
                  type="checkbox"
                  checked={isBracketCompetition}
                  onChange={(e) => setIsBracketCompetition(e.target.checked)}
                  className={`w-5 h-5 ${isLight ? 'accent-purple-600' : 'accent-purple-500'} rounded`}
                />
                <span>Bracket Competition</span>
              </label>
            </div>

            {/* Team Size and Player Limits - MOVED BEFORE REGISTRATION AMOUNT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Team Size Limit</label>
                <input
                  type="number"
                  value={teamSizeLimit}
                  onChange={(e) => setTeamSizeLimit(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="e.g. 4 (Use 1 for solo tournaments)"
                  required
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Max Players Allowed
                </label>
                <input
                  type="number"
                  value={maxPlayersAllowed}
                  onChange={(e) => setMaxPlayersAllowed(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="e.g. 100"
                  required
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Min Players Required
                </label>
                <input
                  type="number"
                  value={minPlayersRequired}
                  onChange={(e) => setMinPlayersRequired(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="e.g. 10"
                  required
                />
              </div>
            </div>

            {/* Tournament Overview Info */}
            {teamSizeLimit && maxPlayersAllowed && (
              <div className={`p-4 rounded-xl ${isLight 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-blue-900/20 border border-blue-700/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faInfoCircle} className={`${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  <span className={`font-semibold ${isLight ? 'text-blue-800' : 'text-blue-300'}`}>
                    Tournament Overview
                  </span>
                </div>
                <div className={`text-sm ${isLight ? 'text-blue-700' : 'text-blue-200'}`}>
                  <p>
                    <strong>Tournament Type:</strong> {Number(teamSizeLimit) === 1 ? 'Solo Tournament' : `Team Tournament (${teamSizeLimit} players per team)`}
                  </p>
                  <p>
                    <strong>Expected Teams:</strong> {calculateExpectedTeams()} teams
                  </p>
                  <p>
                    <strong>Total Players:</strong> {maxPlayersAllowed} players maximum
                  </p>
                </div>
              </div>
            )}

            {/* Prize and Registration Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Prize Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prizeAmount}
                  onChange={(e) => setPrizeAmount(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Registration Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={registrationAmount}
                  onChange={(e) => setRegistrationAmount(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  placeholder="0.00"
                />
                {/* Registration Amount Info Bar */}
                <div className={`mt-2 p-3 rounded-lg ${isLight 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-amber-900/20 border border-amber-700/50'}`}>
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon 
                      icon={faInfoCircle} 
                      className={`mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} 
                    />
                    <div className={`text-sm ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                      <p className="font-semibold mb-1">Registration Amount Info:</p>
                      <p>
                        This amount is collected {Number(teamSizeLimit) === 1 
                          ? 'per individual player' 
                          : `per team (${teamSizeLimit} players)`} when they register for the tournament.
                      </p>
                      {Number(teamSizeLimit) > 1 && (
                        <p className="mt-1">
                          <strong>Note:</strong> Team leaders pay the full registration amount for their entire team.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prize Distribution Section */}
            <div className={`p-6 rounded-xl ${isLight 
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
              : 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                <FontAwesomeIcon icon={faTrophy} className="mr-2" />
                Prize Distribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                    🥇 1st Place Prize
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={firstPlace}
                    onChange={(e) => setFirstPlace(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl ${isLight 
                      ? 'bg-white/80 border border-gray-300 focus:border-yellow-500/50 text-gray-800' 
                      : 'bg-gray-700/80 border border-gray-600 focus:border-yellow-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-yellow-500/30' : 'focus:ring-yellow-500/30'} transition-all duration-300`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                    🥈 2nd Place Prize
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={secondPlace}
                    onChange={(e) => setSecondPlace(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl ${isLight 
                      ? 'bg-white/80 border border-gray-300 focus:border-yellow-500/50 text-gray-800' 
                      : 'bg-gray-700/80 border border-gray-600 focus:border-yellow-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-yellow-500/30' : 'focus:ring-yellow-500/30'} transition-all duration-300`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                    🥉 3rd Place Prize
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={thirdPlace}
                    onChange={(e) => setThirdPlace(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl ${isLight 
                      ? 'bg-white/80 border border-gray-300 focus:border-yellow-500/50 text-gray-800' 
                      : 'bg-gray-700/80 border border-gray-600 focus:border-yellow-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-yellow-500/30' : 'focus:ring-yellow-500/30'} transition-all duration-300`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className={`mt-4 p-3 rounded-lg ${isLight 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-blue-900/20 border border-blue-700/50'}`}>
                <div className={`text-sm ${isLight ? 'text-blue-800' : 'text-blue-200'}`}>
                  <p className="font-semibold mb-1">💡 Prize Distribution Tips:</p>
                  <p>• Make sure the total prize distribution doesn't exceed your total prize pool</p>
                  <p>• You can leave fields empty if you don't want to award prizes for certain positions</p>
                  <p>• Consider setting aside some prize money for participation rewards</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Registration Start <span className="text-red-500">*</span>
                </label>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-1`}>
                  📅 Format: YYYY-MM-DD HH:MM (24-hour format)
                </div>
                <input
                  type="datetime-local"
                  value={registrationStartTime}
                  onChange={(e) => setRegistrationStartTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Registration End <span className="text-red-500">*</span>
                </label>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-1`}>
                  📅 Must be after registration start
                </div>
                <input
                  type="datetime-local"
                  value={registrationEndTime}
                  onChange={(e) => setRegistrationEndTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Event Start <span className="text-red-500">*</span>
                </label>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-1`}>
                  📅 Must be after registration ends
                </div>
                <input
                  type="datetime-local"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>
                  Event End <span className="text-red-500">*</span>
                </label>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-1`}>
                  📅 Must be after event starts
                </div>
                <input
                  type="datetime-local"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-white/80 border border-gray-300 focus:border-purple-500/50 text-gray-800' 
                    : 'bg-gray-700/80 border border-gray-600 focus:border-purple-500/50 text-white'} focus:outline-none focus:ring-2 ${isLight ? 'focus:ring-purple-500/30' : 'focus:ring-purple-500/30'} transition-all duration-300`}
                  required
                />
              </div>
            </div>

            {/* Date Validation Info */}
            <div className={`p-4 rounded-xl ${isLight 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-blue-900/20 border border-blue-700/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faInfoCircle} className={`${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                <span className={`font-semibold ${isLight ? 'text-blue-800' : 'text-blue-300'}`}>
                  Date & Time Requirements
                </span>
              </div>
              <div className={`text-sm ${isLight ? 'text-blue-700' : 'text-blue-200'} space-y-1`}>
                <p>• Use 24-hour format (e.g., 14:30 for 2:30 PM)</p>
                <p>• Times should be in your local timezone</p>
                <p>• Set appropriate dates and times for your tournament schedule</p>
                <p>• Consider your audience's timezone when scheduling</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 ${isLight 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center justify-center`}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create Tournament'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToDashboard}
                className={`px-6 ${isLight 
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'} py-3 rounded-xl text-lg font-semibold shadow-md transition-all duration-300`}
              >
                Cancel
              </button>
            </div>

            {error && (
              <p className={`${isLight ? 'text-red-600' : 'text-red-500'} text-center mt-2 p-2 rounded-lg ${isLight ? 'bg-red-100' : 'bg-red-900/20'}`}>
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;