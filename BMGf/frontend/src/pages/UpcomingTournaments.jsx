"use client"

import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Advertisement from '../components/Advertisement';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faCalendarAlt,
  faGamepad,
  faFilter,
  faSort,
  faSearch,
  faUsers,
  faChevronRight,
  faMoneyBill,
  faClock,
  faHourglassHalf,
  faBolt,
  faStar,
  faFire,
} from '@fortawesome/free-solid-svg-icons';
// Currency formatting function
const formatCurrency = (amount, currency = '') => {
  const numericAmount = Number.parseFloat(amount || 0);
  const formatted = numericAmount.toFixed(2);
  return currency ? `${formatted} ${currency}` : formatted;
};

// Countdown Timer Component with enhanced gaming style
const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime) - new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className={`flex items-center gap-3 bg-gradient-to-r ${isLight ? 'from-orange-500/10 to-red-500/10 border-orange-500/20' : 'from-orange-500/20 to-red-500/20 border-orange-500/30'} p-3 rounded-lg border`}>
      <FontAwesomeIcon icon={faHourglassHalf} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} animate-pulse`} fixedWidth />
      <div className="flex gap-2 text-sm font-mono">
        {timeLeft.days > 0 && (
          <div className={`${isLight ? 'bg-orange-100' : 'bg-black/40'} px-2 py-1 rounded ${isLight ? 'text-orange-600' : 'text-orange-300'} font-bold`}>{timeLeft.days}d</div>
        )}
        <div className={`${isLight ? 'bg-orange-100' : 'bg-black/40'} px-2 py-1 rounded ${isLight ? 'text-orange-600' : 'text-orange-300'} font-bold`}>{timeLeft.hours}h</div>
        <div className={`${isLight ? 'bg-orange-100' : 'bg-black/40'} px-2 py-1 rounded ${isLight ? 'text-orange-600' : 'text-orange-300'} font-bold`}>{timeLeft.minutes}m</div>
        <div className={`${isLight ? 'bg-orange-100' : 'bg-black/40'} px-2 py-1 rounded ${isLight ? 'text-orange-600' : 'text-orange-300'} font-bold animate-pulse`}>{timeLeft.seconds}s</div>
      </div>
    </div>
  );
};

const UpcomingTournaments = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [privateCodeInput, setPrivateCodeInput] = useState('');
  const [privateCode, setPrivateCode] = useState('');
  const [filterGame, setFilterGame] = useState('');
  const [filterType, setFilterType] = useState(''); // online/offline filter
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // New state for tab management
  const [pastTournaments, setPastTournaments] = useState([]);
  const [pastTournamentsLoading, setPastTournamentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Global sponsor images state
  const [globalSponsorImages, setGlobalSponsorImages] = useState({
    banner_images: [],
    promotional_images: [],
    logo_images: [],
    additional_images: []
  });
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // List of available games with gaming colors
  const availableGames = [
    { name: "CallOfDuty", color: "from-green-600 to-green-800", lightColor: "from-green-400 to-green-600", icon: "🎯" },
    { name: "PUBG", color: "from-orange-600 to-red-700", lightColor: "from-orange-400 to-red-500", icon: "🔫" },
    { name: "BGMI", color: "from-blue-600 to-purple-700", lightColor: "from-blue-400 to-purple-500", icon: "🏆" },
    { name: "FIFA", color: "from-green-500 to-blue-600", lightColor: "from-green-300 to-blue-400", icon: "⚽" },
    { name: "Valorant", color: "from-red-500 to-pink-600", lightColor: "from-red-300 to-pink-400", icon: "💥" },
    { name: "OverWatch", color: "from-orange-500 to-yellow-600", lightColor: "from-orange-300 to-yellow-400", icon: "🎮" },
  ];

  // Function to fetch upcoming tournaments
  const fetchUpcomingTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchMessage('');
      
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/upcoming`;

      // If private code is provided, use the private tournament search endpoint
      if (privateCode) {
        url = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/private/${privateCode}`;
      } else {
        // Add online/offline filter for upcoming tournaments
        const params = new URLSearchParams();
        if (filterType) {
          params.append('isOffline', filterType === 'offline');
        }
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      const response = await axios.get(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (response.data && response.data.data) {
        // Check if this is a redirect response from the private code endpoint
        if (privateCode && response.data.data.shouldRedirect && response.data.data.tournament_id) {
          // Redirect to the tournament details page with the accessedByCode flag
          navigate(`/tournaments/${response.data.data.tournament_id}?accessedByCode=true`);
          return; // Exit early since we're navigating away
        }
        
        if (privateCode && !Array.isArray(response.data.data)) {
          // If it's a single tournament response (from private code search)
          setTournaments([response.data.data]);
        } else {
          setTournaments(response.data.data);
        }
      } else {
        setTournaments([]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setTournaments([]);
      
      // Handle specific error responses from the backend
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || 'An error occurred';
        
        if (privateCode) {
          // Specific error handling for private tournament searches
          if (status === 404) {
            setSearchMessage(`No tournament found with code "${privateCode}"`);
          } else if (status === 403) {
            setSearchMessage('This tournament has not been approved yet');
          } else if (status === 401) {
            setSearchMessage('You need to be logged in to view this tournament');
          } else {
            setSearchMessage(errorMessage);
          }
        } else {
          // General error handling
          setError('Failed to load tournaments: ' + errorMessage);
        }
      } else if (error.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to load tournaments: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch past tournaments
  const fetchPastTournaments = async (page = 1) => {
    try {
      setPastTournamentsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      // Build URL with filters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (filterType) {
        params.append('isOffline', filterType === 'offline');
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/tournaments/past?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.data) {
        setPastTournaments(response.data.data.tournaments || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setPastTournaments([]);
      }
    } catch (error) {
      console.error('Error fetching past tournaments:', error);
      setPastTournaments([]);
      setError('Failed to load past tournaments: ' + (error.response?.data?.message || error.message));
    } finally {
      setPastTournamentsLoading(false);
    }
  };

  // Function to fetch global sponsor images
  const fetchSponsorImages = async () => {
    try {
      const token = localStorage.getItem('token');
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
  };

  useEffect(() => {
    // Fetch sponsor images on component mount
    fetchSponsorImages();
    
    // Fetch tournaments based on active tab
    if (activeTab === 'upcoming') {
      fetchUpcomingTournaments();
    } else if (activeTab === 'past') {
      fetchPastTournaments(currentPage);
    }
  }, [privateCode, navigate, activeTab, currentPage, filterType]);

  // Handle Enter key press for private code search
  const handlePrivateCodeKeyDown = (e) => {
    if (e.key === 'Enter' && privateCodeInput.trim()) {
      setPrivateCode(privateCodeInput.trim());
    }
  };

  // Handle search button click for private code
  const handlePrivateCodeSearch = () => {
    if (privateCodeInput.trim()) {
      setPrivateCode(privateCodeInput.trim());
    }
  };

  // Clear private code search
  const clearPrivateCodeSearch = () => {
    setPrivateCodeInput('');
    setPrivateCode('');
  };

  // Filter and sort tournaments
  const filteredAndSortedTournaments = () => {
    let filtered = activeTab === 'upcoming' ? [...tournaments] : [...pastTournaments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((tournament) =>
        tournament.tournament_Name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    // Apply game filter
    if (filterGame) {
      filtered = filtered.filter(
        (tournament) => tournament.GameName === filterGame
      );
    }

    // Apply tournament type filter (online/offline)
    if (filterType) {
      filtered = filtered.filter(
        (tournament) => {
          if (filterType === 'online') {
            return !tournament.Is_Offline;
          } else if (filterType === 'offline') {
            return tournament.Is_Offline;
          }
          return true;
        }
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = activeTab === 'upcoming' 
          ? new Date(a.Event_Start_Time) 
          : new Date(a.Event_End_Time);
        const dateB = activeTab === 'upcoming' 
          ? new Date(b.Event_Start_Time) 
          : new Date(b.Event_End_Time);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'prize') {
        return sortOrder === 'asc'
          ? a.Prize_Amount - b.Prize_Amount
          : b.Prize_Amount - a.Prize_Amount;
      } else if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.tournament_Name.localeCompare(b.tournament_Name)
          : b.tournament_Name.localeCompare(a.tournament_Name);
      }
      return 0;
    });

    return filtered;
  };

  const handleViewDetails = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getGameStyle = (gameName) => {
    const game = availableGames.find((g) => g.name === gameName);
    return game || { color: "from-gray-600 to-gray-800", lightColor: "from-gray-300 to-gray-500", icon: "🎮" };
  };

  return (
    <div
      className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight ? 'from-purple-300/20 to-pink-300/20' : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
        <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight ? 'from-blue-300/20 to-cyan-300/20' : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight ? 'from-orange-300/20 to-red-300/20' : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
      </div>

      <Navbar />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Top Banner Ad */}
        <div className="mb-8">
          <Advertisement 
            type="banner" 
            images={globalSponsorImages.banner_images}
            placeholder="Featured Tournaments" 
          />
        </div>

        {/* Hero Header Section */}
        <div className="text-center mb-12 relative">
          <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${isLight ? 'from-purple-400/10 to-pink-400/10 border-purple-400/20' : 'from-purple-600/20 to-pink-600/20 border-purple-500/30'} px-6 py-2 rounded-full border mb-6`}>
            <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
            <span className={`text-sm font-semibold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>LIVE TOURNAMENTS</span>
            <FontAwesomeIcon icon={faBolt} className={`${isLight ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${isLight 
            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600' 
            : 'bg-gradient-to-r from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
            EPIC BATTLES AWAIT
          </h1>
          <p className={`text-xl ${isLight ? 'text-gray-600' : 'text-gray-300'} max-w-2xl mx-auto`}>
            {privateCode
              ? "Viewing exclusive private tournament"
              : "Join the ultimate gaming tournaments and claim your victory!"}
          </p>
        </div>

        {/* Tournament Type Tabs */}
        {!privateCode && (
          <div className="flex justify-center mb-8">
            <div className={`flex ${isLight 
              ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
              : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-2 shadow-xl`}>
              <button
                onClick={() => {
                  setActiveTab('upcoming');
                  setCurrentPage(1);
                  setSearchTerm('');
                  setFilterGame('');
                  setFilterType('');
                  setSortBy('date');
                }}
                className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${
                  activeTab === 'upcoming' 
                    ? isLight 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-red-400/25' 
                      : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-red-500/25'
                    : isLight
                      ? 'text-gray-700 hover:bg-gray-100/50' 
                      : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <FontAwesomeIcon icon={faBolt} className={activeTab === 'upcoming' ? 'animate-pulse' : ''} />
                <span>UPCOMING BATTLES</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('past');
                  setCurrentPage(1);
                  setSearchTerm('');
                  setFilterGame('');
                  setFilterType('');
                  setSortBy('date');
                }}
                className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${
                  activeTab === 'past' 
                    ? isLight 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-purple-400/25' 
                      : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
                    : isLight
                      ? 'text-gray-700 hover:bg-gray-100/50' 
                      : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <FontAwesomeIcon icon={faTrophy} className={activeTab === 'past' ? 'text-yellow-400' : ''} />
                <span>PAST BATTLES</span>
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Private Tournament Code Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔐 Private tournament code"
                value={privateCodeInput}
                onChange={(e) => setPrivateCodeInput(e.target.value)}
                onKeyDown={handlePrivateCodeKeyDown}
                className={`w-full md:w-64 p-3 pl-12 ${isLight 
                  ? 'bg-white/80 border-gray-300 placeholder-gray-500 focus:border-purple-400 focus:shadow-purple-400/25' 
                  : 'bg-black/40 backdrop-blur-sm border-gray-600 placeholder-gray-400 focus:border-purple-400 focus:shadow-purple-500/25'} border-2 ${privateCode ? 'border-purple-500' : ''} rounded-xl text-current focus:outline-none focus:shadow-lg transition-all duration-300`}
              />
              <FontAwesomeIcon
                icon={faSearch}
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${privateCode ? 'text-purple-400' : isLight ? 'text-gray-500' : 'text-gray-400'} cursor-pointer hover:text-purple-300 transition-colors`}
                onClick={handlePrivateCodeSearch}
              />
              {privateCodeInput && (
                <button
                  onClick={clearPrivateCodeSearch}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'} hover:text-red-400 transition-colors`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Regular Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search epic tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full md:w-64 p-3 pl-12 ${isLight 
                  ? 'bg-white/80 border-gray-300 placeholder-gray-500 focus:border-red-400 focus:shadow-red-400/25' 
                  : 'bg-black/40 backdrop-blur-sm border-gray-600 placeholder-gray-400 focus:border-red-400 focus:shadow-red-500/25'} border-2 ${searchTerm ? 'border-red-500' : ''} rounded-xl text-current focus:outline-none focus:shadow-lg transition-all duration-300`}
              />
              <FontAwesomeIcon
                icon={faSearch}
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${searchTerm ? 'text-red-400' : isLight ? 'text-gray-500' : 'text-gray-400'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'} hover:text-red-400 transition-colors`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-3 px-6 py-3 ${showFilters || filterGame || filterType || sortBy !== "date" 
                ? isLight ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-400/25' 
                : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-500/25' 
                : isLight ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-red-600 hover:from-red-500 hover:to-red-600 hover:text-white'
                : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-red-600 hover:to-red-700'} rounded-xl transition-all duration-300 font-semibold ${isLight ? 'border-red-400/30' : 'border-red-500/30'} border hover:shadow-lg relative`}
            >
              <FontAwesomeIcon icon={faFilter} />
              <span>FILTER & SORT</span>
              {(filterGame || filterType || sortBy !== "date") && (
                <span className={`absolute -top-2 -right-2 ${isLight ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'} text-black text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold animate-bounce`}>
                  {(filterGame ? 1 : 0) + (filterType ? 1 : 0) + (sortBy !== "date" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Filter Options Panel */}
        {showFilters && !loading && !error && (
          <div className={`mb-8 p-6 ${isLight 
            ? 'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl' 
            : 'bg-black/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl'}`}>
            <div className="flex items-center gap-3 mb-6">
              <FontAwesomeIcon icon={faFire} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} text-xl`} />
              <h2 className={`text-2xl font-bold ${isLight 
                ? 'bg-gradient-to-r from-orange-600 to-red-600' 
                : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent`}>
                TOURNAMENT FILTERS
              </h2>
            </div>

            <div className="space-y-8">
              {/* Game Filter */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-700' : 'text-gray-200'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faGamepad} className={`${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                  Filter by Game
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setFilterGame("")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${!filterGame 
                      ? `bg-gradient-to-r ${isLight ? 'from-purple-500 to-pink-500' : 'from-purple-600 to-pink-600'} text-white shadow-lg` 
                      : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                  >
                    🎮 All Games
                  </button>
                  {availableGames.map((game) => (
                    <button
                      key={game.name}
                      onClick={() => setFilterGame(game.name)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${filterGame === game.name 
                        ? `bg-gradient-to-r ${isLight ? game.lightColor : game.color} text-white shadow-lg` 
                        : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                    >
                      {game.icon} {game.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tournament Type Filter */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-700' : 'text-gray-200'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faClock} className={`${isLight ? 'text-green-600' : 'text-green-400'}`} />
                  Tournament Type
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setFilterType("")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${!filterType 
                      ? `bg-gradient-to-r ${isLight ? 'from-green-500 to-emerald-500' : 'from-green-600 to-emerald-600'} text-white shadow-lg` 
                      : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                  >
                    🌐 All Types
                  </button>
                  <button
                    onClick={() => setFilterType("online")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${filterType === "online" 
                      ? `bg-gradient-to-r ${isLight ? 'from-blue-500 to-cyan-500' : 'from-blue-600 to-cyan-600'} text-white shadow-lg` 
                      : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                  >
                    💻 Online
                  </button>
                  <button
                    onClick={() => setFilterType("offline")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${filterType === "offline" 
                      ? `bg-gradient-to-r ${isLight ? 'from-orange-500 to-red-500' : 'from-orange-600 to-red-600'} text-white shadow-lg` 
                      : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                  >
                    🏢 Offline
                  </button>
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-700' : 'text-gray-200'} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faSort} className={`${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  Sort Tournaments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Sort By</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "date", label: "📅 Date", icon: faCalendarAlt },
                        { key: "prize", label: "💰 Prize", icon: faMoneyBill },
                        { key: "name", label: "🏆 Name", icon: faTrophy },
                      ].map((option) => (
                        <button
                          key={option.key}
                          onClick={() => setSortBy(option.key)}
                          className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 ${sortBy === option.key 
                            ? `bg-gradient-to-r ${isLight ? 'from-blue-500 to-cyan-500' : 'from-blue-600 to-cyan-600'} text-white shadow-lg` 
                            : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Order</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSortOrder("asc")}
                        className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 ${sortOrder === "asc" 
                          ? `bg-gradient-to-r ${isLight ? 'from-green-500 to-emerald-500' : 'from-green-600 to-emerald-600'} text-white shadow-lg` 
                          : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                      >
                        ⬆️ Ascending
                      </button>
                      <button
                        onClick={() => setSortOrder("desc")}
                        className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 ${sortOrder === "desc" 
                          ? `bg-gradient-to-r ${isLight ? 'from-green-500 to-emerald-500' : 'from-green-600 to-emerald-600'} text-white shadow-lg` 
                          : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'}`}
                      >
                        ⬇️ Descending
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {(filterGame || filterType || sortBy !== "date") && (
                <div className="flex flex-wrap gap-3">
                  {filterGame && (
                    <div className={`${isLight 
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-400/30 text-purple-700' 
                      : 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-300'} px-4 py-2 rounded-full text-sm flex items-center gap-2 border`}>
                      <FontAwesomeIcon icon={faGamepad} />
                      <span>{filterGame}</span>
                      <button
                        onClick={() => setFilterGame("")}
                        className="ml-1 hover:text-white focus:outline-none transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {sortBy !== "date" && (
                    <div className={`${isLight 
                      ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-400/30 text-blue-700' 
                      : 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-blue-300'} px-4 py-2 rounded-full text-sm flex items-center gap-2 border`}>
                      <FontAwesomeIcon icon={faSort} />
                      <span>Sort: {sortBy === "prize" ? "Prize" : "Name"}</span>
                      <button
                        onClick={() => setSortBy("date")}
                        className="ml-1 hover:text-white focus:outline-none transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div>
          {/* Loading State */}
          {(loading || pastTournamentsLoading) && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight ? 'border-purple-600' : 'border-purple-500'}`}></div>
                <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight ? 'border-pink-600' : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
              </div>
              <p className={`mt-4 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse`}>
                Loading {activeTab === 'upcoming' ? 'epic' : 'legendary'} tournaments...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && !pastTournamentsLoading && error && !privateCode && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className={`text-red-500 text-xl mb-4 ${isLight ? 'bg-red-100' : 'bg-red-500/10'} p-6 rounded-xl border ${isLight ? 'border-red-200' : 'border-red-500/30'}`}>
                {error}
              </div>
            </div>
          )}

          {/* Tournament Cards */}
          {!loading && !pastTournamentsLoading && (!error || privateCode) && (
            <>
              {filteredAndSortedTournaments().length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredAndSortedTournaments().map((tournament, index) => {
                    const gameStyle = getGameStyle(tournament.GameName)

                    return (
                      <React.Fragment key={tournament.tournament_id}>
                        {/* Insert ad after every 3rd tournament */}
                        {index > 0 && index % 3 === 0 && (
                          <div className="col-span-1 md:col-span-2 lg:col-span-3 my-6">
                            <Advertisement 
                              type="in-feed" 
                              images={globalSponsorImages.promotional_images}
                              placeholder="Featured Gaming Tournament" 
                            />
                          </div>
                        )}

                        {/* Enhanced Tournament Card */}
                        <div
                          onClick={() => handleViewDetails(tournament.tournament_id)}
                          className={`group relative ${isLight 
                            ? 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-400/10' 
                            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20'} rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-500`}
                        >
                          {/* Card Glow Effect */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${isLight 
                            ? 'from-purple-400/0 via-purple-400/5 to-pink-400/0' 
                            : 'from-purple-600/0 via-purple-600/5 to-pink-600/0'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                          {/* Tournament Header */}
                          <div className={`px-6 py-4 bg-gradient-to-r ${isLight 
                            ? gameStyle.lightColor 
                            : gameStyle.color} relative`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-bold text-xl text-white mb-2 group-hover:text-yellow-300 transition-colors">
                                  {tournament.tournament_Name}
                                </h3>
                                <div className="flex items-center gap-2 text-white/90">
                                  <span className="text-2xl">{gameStyle.icon}</span>
                                  <span className="font-medium">{tournament.GameName}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`text-xs font-bold py-2 px-3 rounded-full ${tournament.Status === "Accepting Registrations" 
                                    ? "bg-green-500 text-white animate-pulse" 
                                    : "bg-yellow-500 text-black"}`}
                                >
                                  {`${tournament.Status }`}
                                </span>
                                <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xl animate-pulse" />
                              </div>
                            </div>
                          </div>

                          {/* Tournament Details */}
                          <div className="p-6 space-y-4">
                            {/* Date */}
                            <div className={`flex items-center gap-3 p-3 ${isLight 
                              ? 'bg-gray-100 rounded-lg' 
                              : 'bg-gray-800/40 rounded-lg'}`}>
                              <FontAwesomeIcon icon={faCalendarAlt} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-lg`} />
                              <div>
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {activeTab === 'upcoming' ? 'Event Date' : 'Completed'}
                                </span>
                                <div className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                  {activeTab === 'upcoming' 
                                    ? formatDate(tournament.Event_Start_Time)
                                    : formatDate(tournament.Event_End_Time)}
                                </div>
                              </div>
                            </div>

                            {/* Prize */}
                            <div className={`flex items-center gap-3 p-3 bg-gradient-to-r ${isLight 
                              ? 'from-green-100 to-emerald-100 border border-green-200' 
                              : 'from-green-500/10 to-emerald-500/10 border border-green-500/20'} rounded-lg`}>
                              <FontAwesomeIcon icon={faMoneyBill} className={`${isLight ? 'text-green-600' : 'text-green-400'} text-lg`} />
                              <div>
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Prize Pool</span>
                                                                  <div className={`font-bold text-xl ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                                    {formatCurrency(tournament.Prize_Amount, tournament.Currency)}
                                  </div>
                              </div>
                            </div>

                            {/* Players/Teams */}
                            <div className={`flex items-center gap-3 p-3 ${isLight 
                              ? 'bg-gray-100 rounded-lg' 
                              : 'bg-gray-800/40 rounded-lg'}`}>
                              <FontAwesomeIcon icon={faUsers} className={`${isLight ? 'text-purple-600' : 'text-purple-400'} text-lg`} />
                              <div>
                                <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Format</span>
                                <div className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                  {tournament.Team_Size_Limit === 1
                                    ? "👤 Solo Battle"
                                    : `👥 Teams of ${tournament.Team_Size_Limit}`}
                                </div>
                              </div>
                            </div>

                            {/* Available Slots */}
                            {tournament.availableSlots && tournament.availableSlots.status === "success" && (
                              <div className={`flex items-center gap-3 p-3 ${isLight 
                                ? 'bg-orange-100 border border-orange-200' 
                                : 'bg-orange-500/10 border border-orange-500/20'} rounded-lg`}>
                                <FontAwesomeIcon icon={faClock} className={`${isLight ? 'text-orange-600' : 'text-orange-400'} text-lg`} />
                                <div>
                                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Available Slots</span>
                                  <div className={`font-semibold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                                    {tournament.availableSlots.availableSlots} spots left
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Registration Countdown */}
                            {activeTab === 'upcoming' && tournament.Status === "Accepting Registrations" && (
                              <CountdownTimer endTime={tournament.Registration_End_Time} />
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="px-6 pb-6">
                            <button
                              className={`w-full ${isLight 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 group-hover:shadow-lg ${isLight ? 'group-hover:shadow-red-400/25' : 'group-hover:shadow-red-500/25'} transform group-hover:scale-105`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetails(tournament.tournament_id)
                              }}
                            >
                              <FontAwesomeIcon icon={activeTab === 'upcoming' ? faBolt : faTrophy} className={activeTab === 'upcoming' ? 'animate-pulse' : 'text-yellow-400'} />
                              {activeTab === 'upcoming' ? 'VIEW BATTLE' : 'VIEW RESULTS'}
                              <FontAwesomeIcon
                                icon={faChevronRight}
                                className="group-hover:translate-x-1 transition-transform"
                              />
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>

                {/* Pagination for Past Tournaments */}
                {activeTab === 'past' && totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-12">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isLight
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg hover:shadow-purple-400/25'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-purple-500/25'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className={`flex items-center gap-2 px-4 py-2 ${isLight 
                      ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
                      : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-xl`}>
                      <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isLight
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg hover:shadow-purple-400/25'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-purple-500/25'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative mb-8">
                    <FontAwesomeIcon icon={faTrophy} className={`text-6xl ${isLight ? 'text-gray-400' : 'text-gray-600'} animate-pulse`} />
                    <div className={`absolute -top-2 -right-2 w-6 h-6 ${isLight ? 'bg-red-500' : 'bg-red-500'} rounded-full animate-ping`}></div>
                  </div>
                  <h3 className={`text-2xl font-bold mb-4 ${isLight 
                    ? 'bg-gradient-to-r from-gray-600 to-gray-800' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-600'} bg-clip-text text-transparent`}>
                    No Epic Battles Found
                  </h3>
                  <p className={`${isLight ? 'text-gray-600' : 'text-gray-400'} mb-8 max-w-md`}>
                    {searchTerm || filterGame || filterType
                      ? "Try adjusting your filters to discover more tournaments"
                      : privateCode && searchMessage
                        ? searchMessage
                        : privateCode
                          ? `No tournament found with code "${privateCode}"`
                          : "New tournaments are being prepared. Check back soon for epic battles!"}
                  </p>
                  {(searchTerm || filterGame || filterType || privateCode) && (
                    <button
                      onClick={() => {
                        setSearchTerm("")
                        setFilterGame("")
                        setFilterType("")
                        setSortBy("date")
                        clearPrivateCodeSearch()
                        setSearchMessage("")
                      }}
                      className={`px-8 py-3 ${isLight 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg hover:shadow-purple-400/25' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg hover:shadow-purple-500/25'} text-white rounded-xl font-semibold transition-all duration-300`}
                    >
                      🔄 Reset All Filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Banner Ad */}
        <div className="mt-12">
          <Advertisement 
            type="banner" 
            images={globalSponsorImages.banner_images}
            placeholder="Featured Gaming Sponsors" 
          />
        </div>
      </div>
    </div>
  );
};

export default UpcomingTournaments;
