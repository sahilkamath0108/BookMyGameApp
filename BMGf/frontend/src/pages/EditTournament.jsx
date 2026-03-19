import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faArrowLeft, faExclamationTriangle, faImage, faUpload, faTrophy } from '@fortawesome/free-solid-svg-icons';

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

const EditTournament = () => {
  const { tournamentId } = useParams();
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
  const [currentBannerUrl, setCurrentBannerUrl] = useState(null);

  // Original values to track changes
  const [originalValues, setOriginalValues] = useState({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const successRef = useRef(null);

  const navigate = useNavigate();
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

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
    // If removing current banner, clear the current banner URL too
    setCurrentBannerUrl(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Check if the user is an admin for this tournament
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/super-admin/tournament/${tournamentId}/check`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.data) {
          setIsAdmin(response.data.data.isAdmin);
          setAdminRole(response.data.data.role);

          if (!response.data.data.isAdmin) {
            // Redirect if not an admin
            navigate(`/tournaments/${tournamentId}`);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate(`/tournaments/${tournamentId}`);
      }
    };

    // Fetch tournament details
    const fetchTournamentDetails = async () => {
      try {
        setInitialLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.data) {
          const tournament = response.data.data;

          // Populate form with tournament data
          setTournamentName(tournament.tournament_Name || '');
          setTournamentCode(tournament.Tournament_Code || '');
          setGameName(tournament.GameName || Object.values(GAME_NAMES)[0]);
          setStatus(
            tournament.Status || TOURNAMENT_STATUS.ACCEPTING_REGISTRATIONS
          );
          setTournamentPrizePool(
            tournament.Tournament_Prize_Pool || PRIZE_POOL_TYPES.DYNAMIC
          );
          setRoomCode(tournament.Room_Code || '');
          setRoomPassword(tournament.Room_Password || '');
          setIsPrivate(tournament.Is_Private || false);
          setIsSponsored(tournament.Is_Sponsored || false);
          setIsOffline(tournament.Is_Offline || false);
          setIsBracketCompetition(tournament.Is_Bracket_Competition || false);
          setRegistrationAmount(
            tournament.Registration_Amount?.toString() || ''
          );
          setCurrency(tournament.Currency || CURRENCIES.USD);
          setPrizeAmount(tournament.Prize_Amount?.toString() || '');

          // Initialize prize distribution if exists
          if (tournament.Prize_Distribution) {
            try {
              const prizeDistribution = typeof tournament.Prize_Distribution === 'string' 
                ? JSON.parse(tournament.Prize_Distribution) 
                : tournament.Prize_Distribution;
              setFirstPlace(prizeDistribution.first?.toString() || '');
              setSecondPlace(prizeDistribution.second?.toString() || '');
              setThirdPlace(prizeDistribution.third?.toString() || '');
            } catch (error) {
              console.error('Error parsing prize distribution:', error);
            }
          }

          // Format date strings for datetime-local input
          const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16);
          };

          setRegistrationStartTime(
            formatDateForInput(tournament.Registration_Start_Time)
          );
          setRegistrationEndTime(
            formatDateForInput(tournament.Registration_End_Time)
          );
          setEventStartTime(formatDateForInput(tournament.Event_Start_Time));
          setEventEndTime(formatDateForInput(tournament.Event_End_Time));

          setTeamSizeLimit(tournament.Team_Size_Limit?.toString() || '');
          setMaxPlayersAllowed(
            tournament.Max_Players_Allowed?.toString() || ''
          );
          setMinPlayersRequired(
            tournament.Min_Players_Required?.toString() || ''
          );

          // Set current banner URL if exists
          if (tournament.main_banner) {
            setCurrentBannerUrl(tournament.main_banner);
          }

          // Store original values for comparison
          setOriginalValues({
            registrationStartTime: formatDateForInput(tournament.Registration_Start_Time),
            registrationEndTime: formatDateForInput(tournament.Registration_End_Time),
            eventStartTime: formatDateForInput(tournament.Event_Start_Time),
            eventEndTime: formatDateForInput(tournament.Event_End_Time)
          });
        }
      } catch (error) {
        console.error('Error fetching tournament details:', error);
        setError('Failed to load tournament details');
      } finally {
        setInitialLoading(false);
      }
    };

    checkAdminStatus();
    fetchTournamentDetails();
  }, [tournamentId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);
    const token = localStorage.getItem('token');

    try {
      // Use FormData for file upload if banner is provided, otherwise use JSON
      let requestData;
      let headers = { Authorization: `Bearer ${token}` };

      if (bannerFile) {
        // Use FormData for file upload
        requestData = new FormData();
        
        // Add banner file
        requestData.append('banner', bannerFile);
        
        // Add all other fields to FormData
        if (tournamentName) requestData.append('tournament_Name', tournamentName);
        if (tournamentCode) requestData.append('Tournament_Code', tournamentCode);
        if (gameName) requestData.append('GameName', gameName);
        if (status) requestData.append('Status', status);
        if (tournamentPrizePool) requestData.append('Tournament_Prize_Pool', tournamentPrizePool);
        if (roomCode) requestData.append('Room_Code', roomCode);
        if (roomPassword) requestData.append('Room_Password', roomPassword);

        // Boolean fields - always include since they can be toggled
        requestData.append('Is_Private', isPrivate);
        requestData.append('Is_Sponsored', isSponsored);
        requestData.append('Is_Offline', isOffline);
        requestData.append('Is_Bracket_Competition', isBracketCompetition);

        // Numeric fields
        if (registrationAmount) requestData.append('Registration_Amount', Number(registrationAmount) || 0);
        if (currency) requestData.append('Currency', currency);
        if (prizeAmount) requestData.append('Prize_Amount', Number(prizeAmount) || 0);

        // Prize distribution
        const prizeDistribution = {
          first: Number(firstPlace) || 0,
          second: Number(secondPlace) || 0,
          third: Number(thirdPlace) || 0,
        };
        requestData.append('Prize_Distribution', JSON.stringify(prizeDistribution));

        // Date fields - only send if changed
        if (registrationStartTime && registrationStartTime !== originalValues.registrationStartTime) {
          requestData.append('Registration_Start_Time', registrationStartTime);
        }
        if (registrationEndTime && registrationEndTime !== originalValues.registrationEndTime) {
          requestData.append('Registration_End_Time', registrationEndTime);
        }
        if (eventStartTime && eventStartTime !== originalValues.eventStartTime) {
          requestData.append('Event_Start_Time', eventStartTime);
        }
        if (eventEndTime && eventEndTime !== originalValues.eventEndTime) {
          requestData.append('Event_End_Time', eventEndTime);
        }

        // Team fields
        if (teamSizeLimit) requestData.append('Team_Size_Limit', Number(teamSizeLimit) || 0);
        if (maxPlayersAllowed) requestData.append('Max_Players_Allowed', Number(maxPlayersAllowed) || 0);
        if (minPlayersRequired) requestData.append('Min_Players_Required', Number(minPlayersRequired) || 0);

        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON payload when no file upload
        const payload = {};

        // Only add fields to the payload if they have a value
        if (tournamentName) payload.tournament_Name = tournamentName;
        if (tournamentCode) payload.Tournament_Code = tournamentCode;
        if (gameName) payload.GameName = gameName;
        if (status) payload.Status = status;
        if (tournamentPrizePool) payload.Tournament_Prize_Pool = tournamentPrizePool;
        if (roomCode) payload.Room_Code = roomCode;
        if (roomPassword) payload.Room_Password = roomPassword;

        // Boolean fields - always include since they can be toggled
        payload.Is_Private = isPrivate;
        payload.Is_Sponsored = isSponsored;
        payload.Is_Offline = isOffline;
        payload.Is_Bracket_Competition = isBracketCompetition;

        // Only add numeric fields if they have a value
        if (registrationAmount) payload.Registration_Amount = Number(registrationAmount) || 0;
        if (currency) payload.Currency = currency;
        if (prizeAmount) payload.Prize_Amount = Number(prizeAmount) || 0;

        // Prize distribution
        const prizeDistribution = {
          first: Number(firstPlace) || 0,
          second: Number(secondPlace) || 0,
          third: Number(thirdPlace) || 0,
        };
        payload.Prize_Distribution = JSON.stringify(prizeDistribution);

        // Only add date fields if they have changed
        if (registrationStartTime && registrationStartTime !== originalValues.registrationStartTime) {
          payload.Registration_Start_Time = registrationStartTime;
        }
        if (registrationEndTime && registrationEndTime !== originalValues.registrationEndTime) {
          payload.Registration_End_Time = registrationEndTime;
        }
        if (eventStartTime && eventStartTime !== originalValues.eventStartTime) {
          payload.Event_Start_Time = eventStartTime;
        }
        if (eventEndTime && eventEndTime !== originalValues.eventEndTime) {
          payload.Event_End_Time = eventEndTime;
        }

        // Only add numeric fields if they have a value
        if (teamSizeLimit) payload.Team_Size_Limit = Number(teamSizeLimit) || 0;
        if (maxPlayersAllowed) payload.Max_Players_Allowed = Number(maxPlayersAllowed) || 0;
        if (minPlayersRequired) payload.Min_Players_Required = Number(minPlayersRequired) || 0;

        requestData = payload;
        headers['Content-Type'] = 'application/json';
      }

      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`,
        requestData,
        { headers }
      );

      // Log the response to the console
      
      setSuccess(true);
      
      // Clean up banner preview URL
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      
      // Scroll to success message
      if (successRef.current) {
        successRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Redirect after a brief delay
      setTimeout(() => {
        navigate(`/tournaments/${tournamentId}`);
      }, 2000);
    } catch (err) {
      console.error('Tournament update failed:', err);
      setError(err.response?.data?.message || 'Failed to update tournament');
      window.scrollTo(0, 0); // Scroll to top to show error
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTournament = () => {
    // Clean up banner preview URL when leaving
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    navigate(`/tournaments/${tournamentId}`);
  };

  // Clean up preview URL on component unmount
  useEffect(() => {
    return () => {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  if (initialLoading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
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
        
        <div className="container mx-auto px-4 py-12 flex justify-center items-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-purple-600' 
              : 'border-purple-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-pink-600' 
              : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ml-4 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading tournament details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
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
      
      <div className="container mx-auto px-4 py-10 relative z-10">
        <div className={`w-full max-w-4xl mx-auto ${isLight 
          ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
          : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-purple-600 via-pink-600 to-red-600' 
              : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent`}>
              Edit Tournament
            </h1>
            <button
              onClick={handleBackToTournament}
              className={`${isLight 
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'} px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-md`}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              <span>Back to Tournament</span>
            </button>
          </div>

          <div className={`${isLight 
            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-700' 
            : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'} p-4 rounded-xl mb-6`}>
            <p>
              Update only the fields you want to change. Empty fields will not
              be updated.
            </p>
          </div>

          {success && (
            <div 
              ref={successRef}
              className={`${isLight 
                ? 'bg-green-500/10 border border-green-500/30 text-green-700' 
                : 'bg-green-500/20 border border-green-500/30 text-green-300'} p-4 rounded-xl mb-6 flex items-center`}
            >
              <FontAwesomeIcon icon={faCheckCircle} className={`${isLight ? 'text-green-600' : 'text-green-400'} text-xl mr-3`} />
              <div className="flex-grow">Tournament updated successfully!</div>
              <button
                onClick={handleBackToTournament}
                className={`${isLight ? 'text-green-700 hover:text-green-800' : 'text-green-300 hover:text-white'} underline`}
              >
                Return to Tournament
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
              
              {/* Show current banner if exists and no new banner selected */}
              {currentBannerUrl && !bannerPreview && (
                <div className="relative mb-4">
                  <img
                    src={currentBannerUrl}
                    alt="Current tournament banner"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className={`absolute top-2 left-2 ${isLight 
                    ? 'bg-green-500' 
                    : 'bg-green-600'} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                    Current Banner
                  </div>
                  <button
                    type="button"
                    onClick={removeBanner}
                    className={`absolute top-2 right-2 ${isLight 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-red-600 hover:bg-red-700'} text-white p-2 rounded-full transition-colors duration-300`}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* Show new banner preview if selected */}
              {bannerPreview && (
                <div className="relative mb-4">
                  <img
                    src={bannerPreview}
                    alt="New banner preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className={`absolute top-2 left-2 ${isLight 
                    ? 'bg-blue-500' 
                    : 'bg-blue-600'} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                    New Banner
                  </div>
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
                    New banner selected: {bannerFile?.name}
                  </div>
                </div>
              )}
              
              {/* Upload area - show when no banner is displayed */}
              {!currentBannerUrl && !bannerPreview && (
                <div className={`border-2 border-dashed ${isLight 
                  ? 'border-gray-300 hover:border-purple-400' 
                  : 'border-gray-600 hover:border-purple-500'} rounded-xl p-8 text-center transition-colors duration-300`}>
                  <FontAwesomeIcon 
                    icon={faUpload} 
                    className={`text-4xl mb-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} 
                  />
                  <p className={`mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Upload a new banner image for your tournament
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
              )}
              
              {/* Upload button when banner exists - for replacement */}
              {(currentBannerUrl || bannerPreview) && (
                <label className={`inline-block px-6 py-3 ${isLight 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-xl cursor-pointer transition-colors duration-300`}>
                  <FontAwesomeIcon icon={faUpload} className="mr-2" />
                  {currentBannerUrl && !bannerPreview ? 'Replace Banner' : 'Choose Different Banner'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

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
                  placeholder="Enter tournament name"
                />
              </div>
              <div>
                <label className={`block mb-1 ${isLight ? 'text-gray-700' : 'text-white'}`}>Tournament Code</label>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-1`}>
                  🔒 Tournament codes cannot be changed after creation
                </div>
                <input
                  type="text"
                  value={tournamentCode}
                  readOnly
                  disabled
                  className={`w-full px-4 py-2 rounded-xl ${isLight 
                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-800 border border-gray-700 text-gray-400 cursor-not-allowed'} transition-all duration-300`}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                />
              </div>
            </div>

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
                  placeholder="e.g. 4"
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
                />
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
                    <span>Updating...</span>
                  </>
                ) : (
                  'Update Tournament'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToTournament}
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

export default EditTournament;
