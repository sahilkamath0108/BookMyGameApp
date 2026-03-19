"use client"

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ThemeContext } from '../context/ThemeContext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Navbar from '../components/navbar'
import Advertisement from '../components/Advertisement'
import ImageWithFallback from '../components/ImageWithFallback'
import axios from 'axios'
import { debounce } from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTrophy,
  faCalendarAlt,
  faGamepad,
  faUsers,
  faMoneyBillWave,
  faClock,
  faMapMarkerAlt,
  faArrowLeft,
  faLock,
  faLockOpen,
  faUserPlus,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faTimes,
  faSpinner,
  faEdit,
  faUserShield,
  faExclamationTriangle,
  faSearch,
  faComments,
  faChartLine,
  faCog,
  faKey,
  faChevronUp,
  faChevronDown,
  faBolt,
  faCrown,
  faShield,
  faRocket,
  faBullseye,
  faGem,
} from '@fortawesome/free-solid-svg-icons'
import { toast } from 'react-toastify'
import BracketMatchupsView from './BracketMatchupsView'
// Currency formatting functions
const formatCurrency = (amount, currency = '') => {
  const numericAmount = Number.parseFloat(amount || 0);
  const formatted = numericAmount.toFixed(2);
  return currency ? `${formatted} ${currency}` : formatted;
};

const formatTournamentFees = (tournament) => {
  const regAmount = Number.parseFloat(tournament.Registration_Amount || 0);
  const platformFee = Number.parseFloat(tournament.Platform_fee || 0);
  const organizerFee = Number.parseFloat(tournament.Organizer_fee || 0);
  const total = regAmount + platformFee + organizerFee;
  
  return {
    registration: formatCurrency(regAmount),
    platform: formatCurrency(platformFee),
    organizer: formatCurrency(organizerFee),
    total: formatCurrency(total, tournament.Currency)
  };
};

const TournamentDetails = () => {
  const { tournamentId } = useParams()
  const { colors, theme } = useContext(ThemeContext)
  const isLight = theme === 'light'
  const navigate = useNavigate()
  const location = useLocation()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)
  const [teamPassword, setTeamPassword] = useState("")
  const [teamNumber, setTeamNumber] = useState("")
  const [teamName, setTeamName] = useState("")
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState("")
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinType, setJoinType] = useState(null)
  const [joinError, setJoinError] = useState("")
  const [joinSuccess, setJoinSuccess] = useState("")
  const [joiningProcess, setJoiningProcess] = useState(false)
  const [redirectingToPayment, setRedirectingToPayment] = useState(false)
  const [participationInfo, setParticipationInfo] = useState(null)
  const [isParticipating, setIsParticipating] = useState(false)
  const [showTeamCarousel, setShowTeamCarousel] = useState(false)
  const [selectedTeamForJoin, setSelectedTeamForJoin] = useState(null)
  const [teamJoinPassword, setTeamJoinPassword] = useState("")
  const [viewOnlyMode, setViewOnlyMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState(null)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [adminGamerTag, setAdminGamerTag] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [adminActionError, setAdminActionError] = useState("")
  const [adminActionSuccess, setAdminActionSuccess] = useState("")
  const [showPaymentCanceledMessage, setShowPaymentCanceledMessage] = useState(false)
  const [cancelingReservation, setCancelingReservation] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const suggestionsRef = useRef(null)
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [teamSearchQuery, setTeamSearchQuery] = useState("")
  const [filteredTeams, setFilteredTeams] = useState([])
  const [sponsorImages, setSponsorImages] = useState({
    banner_images: [],
    promotional_images: [],
    logo_images: [],
    additional_images: []
  });
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [showMatchupDetails, setShowMatchupDetails] = useState(false);
  const [matchupData, setMatchupData] = useState(null);
  const [loadingMatchup, setLoadingMatchup] = useState(false);
  const [matchupError, setMatchupError] = useState("");

  // Check participation status
  const checkParticipationStatus = useCallback(async (token) => {
    if (!token || !tournamentId) {
      return
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/participants/tournament/${tournamentId}/check`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (response.data?.data) {
         
        setParticipationInfo(response.data.data)
        setIsParticipating(response.data.data.isParticipating)
         
         
      }
    } catch (error) {
      console.error("Error checking participation status:", error)
    }
  }, [tournamentId])

  // Function to handle cancellation of a reservation - wrapped in useCallback
  const handleCancelReservation = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !tournamentId) {
      
      return;
    }

    // Check what type of reservation it was
    const reservationType = localStorage.getItem('reservationType');
    if (!reservationType) {
      console.log(
        'No reservation type found in localStorage, nothing to cancel'
      );
      return;
    }

    let endpoint;
    if (reservationType === 'team') {
      endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team/cancel`;
    } else if (reservationType === 'player') {
      endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/player/cancel`;
    } else {
      
      return;
    }

    try {
      console.log(
        `Attempting to cancel ${reservationType} reservation for tournament ${tournamentId}`
      );
      setCancelingReservation(true);

      const response = await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      

      // Clear the reservation data from localStorage
      localStorage.removeItem('reservationType');
      localStorage.removeItem('teamPassword');
      localStorage.removeItem('currentTournamentId');
      

      // Refresh participation status after cancellation
      await checkParticipationStatus(token);
      
    } catch (error) {
      console.error(
        'Error canceling reservation:',
        error.response?.data || error.message
      );
      // If the error is 404, it might mean the reservation was already canceled or never existed
      if (error.response?.status === 404) {
        console.log(
          'Reservation not found - it may have already been canceled'
        );
        localStorage.removeItem('reservationType');
        localStorage.removeItem('teamPassword');
        localStorage.removeItem('currentTournamentId');
      }
    } finally {
      setCancelingReservation(false);
    }
  }, [tournamentId, checkParticipationStatus]); // Add dependencies

  // Function to fetch user's latest matchup details
  const fetchMatchupDetails = async () => {
    const token = localStorage.getItem('token');
    if (!token || !tournamentId) {
      setMatchupError('Authentication required');
      return;
    }

    try {
      setLoadingMatchup(true);
      setMatchupError("");
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/matchups/tournament/${tournamentId}/user/latest`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.status === 'success') {
        setMatchupData(response.data.data);
        setShowMatchupDetails(true);
      }
    } catch (error) {
      console.error('Error fetching matchup details:', error);
      setMatchupError(error.response?.data?.message || 'Failed to load matchup details');
    } finally {
      setLoadingMatchup(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")
    if(!token){
      navigate('/login')
    }

    if (token && user) {
      setIsUserLoggedIn(true)
    }

    const queryParams = new URLSearchParams(location.search)
    const paymentCanceled = queryParams.get("payment_canceled")
    const accessedByCode = queryParams.get("accessedByCode") === "true"

    if (paymentCanceled === "true") {
      setShowPaymentCanceledMessage(true)
      navigate(location.pathname, { replace: true })
      handleCancelReservation()
    }

    const fetchTournamentDetails = async () => {
      try {
        setLoading(true)
        
        let url = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`
        if (accessedByCode) {
          url += `?accessedByCode=true`
        }
        
        const response = await axios.get(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {})

        if (response.data && response.data.data) {
          setTournament(response.data.data)
          
          // Fetch sponsor images
          try {
            const sponsorsResponse = await axios.get(
              `${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsor-images`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (sponsorsResponse.data && sponsorsResponse.data.data) {
              setSponsorImages(sponsorsResponse.data.data);
            }
          } catch (sponsorError) {
            console.error('Error fetching sponsor images:', sponsorError);
          } finally {
            setLoadingSponsors(false);
          }
        } else {
          setError("Invalid tournament data received")
        }
      } catch (error) {
        console.error("Error fetching tournament details:", error)
        setError(error.response?.data?.message || "Failed to load tournament details")
      } finally {
        setLoading(false)
      }
    }

    const checkAdminStatus = async () => {
      if (token) {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/super-admin/tournament/${tournamentId}/check`,
            { headers: { Authorization: `Bearer ${token}` } },
          )

          if (response.data && response.data.data) {
            setIsAdmin(response.data.data.isAdmin)
            setAdminRole(response.data.data.role)
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
        }
      }
    }

    fetchTournamentDetails()
    checkAdminStatus()
    
    if (token) {
      checkParticipationStatus(token)
    }
  }, [tournamentId, location, navigate, handleCancelReservation, checkParticipationStatus])

  const handleJoin = (type) => {
    if (!isUserLoggedIn) {
      navigate("/login")
      return
    }

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData) {
      navigate("/login")
      return
    }

    // Check if user has gamer tag for this game
    const gameName = tournament.GameName
    const gamerTags = userData.GamerTag || {}
    
    if (!gamerTags[gameName]) {
      toast.error(`Please update your gamer tag for ${gameName} in your profile before joining this tournament.`)
      navigate("/profile")
      return
    }

    setJoinType(type)
    setJoinError("")
    setJoinSuccess("")
    setViewOnlyMode(false)

    if (type === "join") {
      setShowTeamCarousel(true)
      setSelectedTeamForJoin(null)
      setTeamJoinPassword("")
      setTeamSearchQuery("")
      setFilteredTeams(teams)
    } else {
      setShowJoinModal(true)
    }
  }

  const handleViewAllTeams = () => {
    setJoinType("join")
    setJoinError("")
    setJoinSuccess("")
    setViewOnlyMode(true)
    setShowTeamCarousel(true)
    setSelectedTeamForJoin(null)
    setTeamJoinPassword("")
    setTeamSearchQuery("")
    setFilteredTeams(teams)
  }

  const handleCloseModal = () => {
    setShowJoinModal(false)
    setTeamPassword("")
    setTeamNumber("")
    setTeamName("")
    setSelectedTeam("")
    setJoinError("")
    setJoinSuccess("")
  }

  const handleCloseTeamCarousel = () => {
    setShowTeamCarousel(false)
    setSelectedTeamForJoin(null)
    setTeamJoinPassword("")
    setJoinError("")
    setJoinSuccess("")
    setViewOnlyMode(false)
    setTeamSearchQuery("")
  }

  const handleSelectTeamToJoin = (team) => {
    if (team.isFull) {
      return
    }
    setSelectedTeamForJoin(team)
    setTeamJoinPassword("")
    }
    
  const handleJoinSelectedTeam = async () => {
    if (!selectedTeamForJoin || !teamJoinPassword) {
      setJoinError("Please select a team and enter the password")
      return
    }

    setJoiningProcess(true)
    setJoinError("")

    try {
      const token = localStorage.getItem("token")

      if (!token) {
        setJoinError("You must be logged in to join a tournament")
        setJoiningProcess(false)
        return
      }

      const response = await axios({
        method: "post",
        url: `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team/join`,
        data: {
          teamPassword: teamJoinPassword,
          teamNumber: selectedTeamForJoin.number,
        },
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data && response.data.status === "success") {
        setJoinSuccess("Successfully joined the team!")

        const token = localStorage.getItem("token")
        if (token) {
          await checkParticipationStatus(token)
        }

        setTimeout(() => {
          handleCloseTeamCarousel()
        }, 2000)
      }
    } catch (error) {
      console.error("Error joining team:", error)
      setJoinError(error.response?.data?.message || "Failed to join team")
    } finally {
      setJoiningProcess(false)
    }
  }

  const navigateToAdminConsole = () => {
    navigate(`/admin-console/${tournamentId}`)
  }

  const navigateToEditTournament = () => {
    navigate(`/edit-tournament/${tournamentId}`)
  }

  const handleAddAdminModal = () => {
    setShowAddAdminModal(true)
    setAdminGamerTag("")
    setAdminEmail("")
    setAdminActionError("")
    setAdminActionSuccess("")
  }

  const handleCloseAdminModal = () => {
    setShowAddAdminModal(false)
    setAdminGamerTag("")
    setAdminEmail("")
    setAdminActionError("")
    setAdminActionSuccess("")
    setEmailSuggestions([])
    setShowSuggestions(false)
  }

  const searchUsers = useCallback(
    async (query) => {
      if (!query || query.length < 2) {
        setEmailSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        setSearchLoading(true)
        const token = localStorage.getItem("token")
        
        if (!token) {
          console.error("No token found")
          return
        }
        // Fetch a larger set of users (first 100)
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}api/super-admin/tournament/${tournamentId}/search-users/${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (response.data && response.data.status === "success") {
          // Filter by name or email (case-insensitive)
          const lowerQuery = query.toLowerCase();
          const filtered = response.data.data.filter(user =>
            (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
            (user.Name && user.Name.toLowerCase().includes(lowerQuery))
          );
          setEmailSuggestions(filtered)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Error searching for users:", error)
      } finally {
        setSearchLoading(false)
      }
    },
    [tournamentId],
  )

  const debouncedSearch = useCallback(
    debounce((query) => {
      searchUsers(query)
    }, 300),
    [searchUsers],
  )

  const handleEmailChange = (e) => {
    const query = e.target.value
    setAdminEmail(query)
    debouncedSearch(query)
  }

  const handleSelectSuggestion = (email) => {
    setAdminEmail(email)
    setShowSuggestions(false)
  }

  const handleAddTempAdmin = async (e) => {
    e.preventDefault()
    setAdminActionLoading(true)
    setAdminActionError("")
    setAdminActionSuccess("")

    try {
      const token = localStorage.getItem("token")

      if (!token) {
        setAdminActionError("You must be logged in to add temp admins")
        setAdminActionLoading(false)
        return
      }

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/super-admin/add`,
        {
          email: adminEmail,
          tournamentId: tournamentId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (response.data && response.data.status === "success") {
        setAdminActionSuccess("Temporary admin added successfully!")
        setTimeout(() => {
          handleCloseAdminModal()
        }, 2000)
      }
    } catch (error) {
      console.error("Error adding temp admin:", error)
      setAdminActionError(error.response?.data?.message || "Failed to add temporary admin")
    } finally {
      setAdminActionLoading(false)
    }
  }

  const handleSubmitJoin = async (e) => {
    e.preventDefault()
    setJoiningProcess(true)
    setJoinError("")

    try {
      const token = localStorage.getItem("token")

      if (!token) {
        setJoinError("You must be logged in to join a tournament")
        setJoiningProcess(false)
        return
      }

      let endpoint, method, data
      let reservationType = null

      if (joinType === "create") {
        localStorage.setItem("teamPassword", teamPassword)
        localStorage.setItem("teamName", teamName)
        reservationType = "team"

        endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team1`
        method = "post"
        data = { 
          teamPassword: teamPassword,
          teamName: teamName,
        }
      } else if (joinType === "join") {
        endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team/join`
        method = "post"
        data = {
          teamPassword,
          teamNumber: selectedTeam,
        }
      } else if (joinType === "single") {
        reservationType = "player"
        endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/player1`
        method = "post"
        data = {}
      }

      // Set reservation type for payment tracking
      if (reservationType) {
        localStorage.setItem("reservationType", reservationType)
      }

      // Set current tournament ID for payment tracking
      localStorage.setItem("currentTournamentId", tournamentId)

      const response = await axios({
        method,
        url: endpoint,
        data,
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data && response.data.status === "success") {
        if ((joinType === "create" || joinType === "single") && response.data.data && response.data.data.checkoutUrl) {
          setRedirectingToPayment(true)
          window.location.href = response.data.data.checkoutUrl
          return
        } else {
          setJoinSuccess(joinType === "join" ? "Successfully joined the team!" : "Successfully joined the tournament!")

          const token = localStorage.getItem("token")
          if (token) {
            await checkParticipationStatus(token)
          }

          setTimeout(() => {
            handleCloseModal()
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Error joining tournament:", error)
      setJoinError(error.response?.data?.message || "Failed to join tournament")
    } finally {
      if (!redirectingToPayment) {
        setJoiningProcess(false)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepting Registrations':
        return isLight 
          ? "bg-gradient-to-r from-green-500 to-emerald-600" 
          : "bg-gradient-to-r from-green-500 to-emerald-600";
      case 'Registrations Closed':
        return isLight 
          ? "bg-gradient-to-r from-yellow-500 to-orange-600" 
          : "bg-gradient-to-r from-yellow-500 to-orange-600";
      case 'In Progress':
        return isLight 
          ? "bg-gradient-to-r from-blue-500 to-cyan-600" 
          : "bg-gradient-to-r from-blue-500 to-cyan-600";
      case 'Ended':
        return isLight 
          ? "bg-gradient-to-r from-gray-500 to-gray-700" 
          : "bg-gradient-to-r from-gray-500 to-gray-700";
      case 'Coming Soon':
        return isLight 
          ? "bg-gradient-to-r from-purple-500 to-pink-600" 
          : "bg-gradient-to-r from-purple-500 to-pink-600";
      default:
        return isLight 
          ? "bg-gradient-to-r from-gray-500 to-gray-700" 
          : "bg-gradient-to-r from-gray-500 to-gray-700";
    }
  };

  const getFormattedDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getGameStyle = (gameName) => {
    const gameStyles = {
      CallOfDuty: { 
        color: "from-green-600 to-green-800", 
        lightColor: "from-green-400 to-green-600", 
        icon: "🎯", 
        bg: "from-green-500/10 to-green-600/10" 
      },
      PUBG: { 
        color: "from-orange-600 to-red-700", 
        lightColor: "from-orange-400 to-red-500", 
        icon: "🔫", 
        bg: "from-orange-500/10 to-red-600/10" 
      },
      BGMI: { 
        color: "from-blue-600 to-purple-700", 
        lightColor: "from-blue-400 to-purple-500", 
        icon: "🏆", 
        bg: "from-blue-500/10 to-purple-600/10" 
      },
      FIFA: { 
        color: "from-green-500 to-blue-600", 
        lightColor: "from-green-300 to-blue-400", 
        icon: "⚽", 
        bg: "from-green-500/10 to-blue-600/10" 
      },
      Valorant: { 
        color: "from-red-500 to-pink-600", 
        lightColor: "from-red-300 to-pink-400", 
        icon: "💥", 
        bg: "from-red-500/10 to-pink-600/10" 
      },
      OverWatch: { 
        color: "from-orange-500 to-yellow-600", 
        lightColor: "from-orange-300 to-yellow-400", 
        icon: "🎮", 
        bg: "from-orange-500/10 to-yellow-600/10" 
      },
    };
    return (
      gameStyles[gameName] || { 
        color: "from-gray-600 to-gray-800", 
        lightColor: "from-gray-300 to-gray-500", 
        icon: "🎮", 
        bg: "from-gray-500/10 to-gray-600/10" 
      }
    );
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [suggestionsRef])

  useEffect(() => {
    const fetchTeams = async () => {
      if (showTeamCarousel || (showJoinModal && joinType === "join")) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/teams`)

          if (response.data && response.data.status === "success") {
            const joinableTeams = response.data.data
             
            
            // Debug: Log the first team and its members to check profile pictures
            if (joinableTeams.length > 0) {
               
              if (joinableTeams[0].members && joinableTeams[0].members.length > 0) {
                 
                 
              }
            }
            
            setTeams(joinableTeams)
            setFilteredTeams(joinableTeams)
          } else {
            console.error("No teams returned from API")
            setTeams([])
            setFilteredTeams([])
          }
        } catch (error) {
          console.error("Error fetching teams:", error)
          setTeams([])
          setFilteredTeams([])
        }
      }
    }

    fetchTeams()
  }, [showJoinModal, showTeamCarousel, joinType, tournamentId])

  const nextTeam = () => {
    if (filteredTeams.length > 0) {
      setCurrentTeamIndex((prevIndex) => (prevIndex === filteredTeams.length - 1 ? 0 : prevIndex + 1))
    }
  }

  const prevTeam = () => {
    if (filteredTeams.length > 0) {
      setCurrentTeamIndex((prevIndex) => (prevIndex === 0 ? filteredTeams.length - 1 : prevIndex - 1))
    }
  }
  
  const handleTeamSearch = (e) => {
    const query = e.target.value.toLowerCase()
    setTeamSearchQuery(query)
    
    if (!query.trim()) {
      setFilteredTeams(teams)
      setCurrentTeamIndex(0)
      return
    }
    
    const filtered = teams.filter(team => 
      (team.name && team.name.toLowerCase().includes(query)) || 
      `team #${team.number}`.toLowerCase().includes(query)
    )
    
    setFilteredTeams(filtered)
    setCurrentTeamIndex(0)
  }

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

        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-purple-600' 
              : 'border-purple-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-pink-600' 
              : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading epic tournament details...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className={`text-${isLight ? 'red-600' : 'red-400'} text-xl mb-6 bg-red-500/${isLight ? '5' : '10'} p-6 rounded-xl border border-red-500/${isLight ? '20' : '30'}`}>
            {error || "Tournament not found"}
          </div>
          <button
            onClick={() => navigate("/upcoming-tournaments")}
            className={`px-6 py-3 bg-gradient-to-r from-purple-${isLight ? '500' : '600'} to-pink-${isLight ? '500' : '600'} text-white rounded-xl flex items-center gap-3 hover:from-purple-${isLight ? '400' : '500'} hover:to-pink-${isLight ? '400' : '500'} transition-all duration-300 shadow-lg hover:shadow-purple-500/25`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Tournaments</span>
          </button>
        </div>
      </div>
    );
  }

  const gameStyle = getGameStyle(tournament.GameName)

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

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate(('/upcoming-tournaments'))}
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-700' 
            : 'text-purple-400 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400 hover:text-purple-300'} transition-all duration-300 px-6 py-3 rounded-xl mb-8 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Epic Battles</span>
        </button>

        {/* Tournament Banner */}
        <div className="relative w-full h-[250px] md:h-[350px] mb-8 rounded-2xl overflow-hidden group">
          {tournament.main_banner ? (
            <img 
              src={tournament.main_banner || "/placeholder.svg"}
              alt={`${tournament.tournament_Name} banner`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-r ${isLight ? gameStyle.lightColor : gameStyle.color} flex items-center justify-center relative`}
            >
              {/* Animated particles */}
              <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-4 h-4 bg-white/20 rounded-full animate-ping"></div>
                <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-400/30 rounded-full animate-pulse delay-500"></div>
                <div className="absolute bottom-16 left-1/4 w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce delay-1000"></div>
              </div>

              <div className="text-center text-white relative z-10">
                <div className="text-6xl md:text-8xl mb-6 animate-pulse">{gameStyle.icon}</div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  {tournament.tournament_Name}
                </h2>
                <p className="text-lg md:text-xl mt-2 opacity-90 font-semibold">{tournament.GameName}</p>
                
              </div>
            </div>
          )}

          {/* Enhanced overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          {/* Floating status badge */}
          <div className="absolute top-6 right-6">
            <div
              className={`${getStatusColor(tournament.Status)} px-4 py-2 rounded-full text-white font-bold text-sm shadow-lg backdrop-blur-sm flex items-center gap-2`}
            >
              <FontAwesomeIcon icon={faBolt} className="animate-pulse" />
              {tournament.Status}
            </div>
          </div>
        </div>

        {/* Top Banner Ad - Only show if there are sponsor images */}
        {sponsorImages.banner_images && sponsorImages.banner_images.length > 0 && (
          <div className="mb-6">
            <Advertisement 
              type="banner" 
              images={sponsorImages.banner_images}
              placeholder="Featured Tournament Sponsor"
            />
          </div>
        )}

        {/* Payment Canceled Message */}
        {showPaymentCanceledMessage && (
          <div className={`bg-gradient-to-r ${isLight 
            ? 'from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 text-yellow-700' 
            : 'from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 text-yellow-300'} p-6 rounded-2xl mb-8 flex items-center gap-4 backdrop-blur-sm`}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl animate-pulse" />
            <div className="flex-grow">
              <p className="font-bold text-lg mb-2">⚠️ Payment Canceled</p>
              <p className="text-sm opacity-90">
                Your reservation has been canceled and the slot is now available for others to join the battle.
              </p>
            </div>
            {cancelingReservation && (
              <div className={`animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 ${isLight ? 'border-yellow-600' : 'border-yellow-300'}`}></div>
            )}
          </div>
        )}

        {/* Tournament Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className={`text-4xl md:text-6xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-purple-600 via-pink-600 to-red-600' 
              : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
              {tournament.tournament_Name}
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className={`flex items-center gap-2 ${isLight 
                ? 'bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-300/50' 
                : 'bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50'}`}>
                <span className="text-2xl">{gameStyle.icon}</span>
                <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{tournament.GameName}</span>
              </div>

              {/* Admin badge */}
              {isAdmin && (
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-purple-600/10 to-indigo-600/10 border border-purple-500/20 text-purple-700' 
                  : 'from-purple-600/20 to-indigo-600/20 border border-purple-500/30 text-purple-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faUserShield} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
                  <span className="font-semibold">
                    {adminRole === "super_admin" ? "👑 Super Admin" : "🛡️ Temp Admin"}
                  </span>
                </div>
              )}
              
              {/* Participant badge */}
              {isParticipating && (
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-green-600/10 to-emerald-600/10 border border-green-500/20 text-green-700' 
                  : 'from-green-600/20 to-emerald-600/20 border border-green-500/30 text-green-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faCheckCircle} className={`${isLight ? 'text-green-600' : 'text-green-400'} animate-pulse`} />
                  <span className="font-semibold">
                    {participationInfo?.participationType === "team" ? "👥 Team Warrior" : "⚔️ Solo Fighter"}
                    
                  </span>
                  
                </div>
              )}
              {tournament && (
                  <span className={`ml-3 px-4 py-2 rounded-full  font-semibold ${tournament.Is_Offline ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                    {tournament.Is_Offline ? '📍 Offline' : '🌐 Online'}
                  </span>
                )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {/* Admin Controls */}
            {isAdmin && (
              <>
                <button
                  onClick={navigateToEditTournament}
                  className={`bg-gradient-to-r ${isLight 
                    ? 'from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500' 
                    : 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit Tournament</span>
                </button>

                <button
                  onClick={navigateToAdminConsole}
                  className={`bg-gradient-to-r ${isLight 
                    ? 'from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500' 
                    : 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faCog} />
                  <span>Admin Console</span>
                </button>

                {adminRole === "super_admin" && (
                  <button
                    onClick={handleAddAdminModal}
                    className={`bg-gradient-to-r ${isLight 
                      ? 'from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500' 
                      : 'from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105`}
                  >
                    <FontAwesomeIcon icon={faUserShield} />
                    <span>Add Temp Admin</span>
                  </button>
                )}

                <button
                  onClick={() => navigate(`/tournament-sponsors/${tournamentId}`)}
                  className={`bg-gradient-to-r ${isLight 
                    ? 'from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500' 
                    : 'from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-orange-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faGem} />
                  <span>Manage Sponsors</span>
                </button>
              </>
            )}
            
            {/* Participant Actions */}
            {isParticipating && (
              <button
                onClick={() => navigate(`/tournament-stats/${tournamentId}`)}
                className={`bg-gradient-to-r ${isLight 
                  ? 'from-green-500 to-green-600 hover:from-green-400 hover:to-green-500' 
                  : 'from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-green-500/25 transform hover:scale-105`}
              >
                <FontAwesomeIcon icon={faChartLine} />
                <span>Battle Stats</span>
              </button>
            )}
            
            {/* General Actions */}
            <button
              onClick={() => navigate(`/tournament-posts/${tournamentId}`)}
              className={`bg-gradient-to-r ${isLight 
                ? 'from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500' 
                : 'from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105`}
            >
              <FontAwesomeIcon icon={faComments} />
              <span>Battle Feed</span>
            </button>

            <button
              onClick={() => navigate(`/tournament-leaderboard/${tournamentId}`)}
              className={`bg-gradient-to-r ${isLight 
                ? 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500' 
                : 'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-amber-500/25 transform hover:scale-105`}
            >
              <FontAwesomeIcon icon={faTrophy} />
              <span>Leaderboard</span>
            </button>
            
            {/* Team Actions */}
            {tournament.Team_Size_Limit > 1 && (
              <button
                onClick={handleViewAllTeams}
                className={`bg-gradient-to-r ${isLight 
                  ? 'from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500' 
                  : 'from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600'} text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-teal-500/25 transform hover:scale-105`}
              >
                <FontAwesomeIcon icon={faUsers} />
                <span>View Teams</span>
              </button>
            )}

            {/* Join Tournament Buttons */}
            {tournament.Status === "Accepting Registrations" && !isParticipating && !isAdmin && (
              <>
                {tournament.Team_Size_Limit === 1 ? (
                  <button
                    onClick={() => handleJoin("single")}
                    className={`bg-gradient-to-r ${isLight 
                      ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                      : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white px-8 py-4 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-red-500/25 transform hover:scale-105 text-lg`}
                  >
                    <FontAwesomeIcon icon={faRocket} className="animate-pulse" />
                    <span>JOIN BATTLE</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleJoin("create")}
                      className={`bg-gradient-to-r ${isLight 
                        ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                        : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white px-8 py-4 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-red-500/25 transform hover:scale-105 text-lg`}
                    >
                      <FontAwesomeIcon icon={faCrown} className="animate-pulse" />
                      <span>CREATE TEAM</span>
                    </button>
                    <button
                      onClick={() => handleJoin("join")}
                      className={`border-2 ${isLight 
                        ? 'border-red-400 text-red-600 hover:bg-red-400 hover:text-white backdrop-blur-sm bg-white/20' 
                        : 'border-red-500 text-red-400 hover:bg-red-500 hover:text-white backdrop-blur-sm bg-black/20'} px-8 py-4 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 shadow-lg hover:shadow-red-500/25 transform hover:scale-105 text-lg`}
                    >
                      <FontAwesomeIcon icon={faShield} />
                      <span>JOIN TEAM</span>
                    </button>
                  </>
                )}
                  </>
                )}
          </div>
        </div>

        {/* Participation Information */}
        {isParticipating && participationInfo && (
          <div className={`bg-gradient-to-r ${isLight 
            ? 'from-green-500/5 to-emerald-500/5 border-2 border-green-500/20 text-green-700' 
            : 'from-green-500/10 to-emerald-500/10 border border-green-500/30 text-green-300'} p-6 rounded-2xl mb-8 backdrop-blur-sm`}>
            <div className="flex items-center gap-4 mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className={`text-2xl animate-pulse ${isLight ? 'text-green-600' : 'text-green-400'}`} />
              <h3 className="font-bold text-xl flex items-center gap-3">
                🎉 You're in the Battle! {participationInfo.participationType === "team" ? "👥 Team Warrior" : "⚔️ Solo Fighter"}
                
              </h3>
            </div>
            
            {participationInfo.participationType === "team" && (
              <div className="ml-10 space-y-2">
                <p className="text-lg">
                  <span className="font-bold">Team:</span>{" "}
                  {participationInfo.teamName || `Team #${participationInfo.teamId.substring(0, 6)}`}
                </p>
                <p className={`text-sm opacity-90 ${isLight ? 'text-green-700' : 'text-green-300'}`}>
                  Use <span className={`font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>"Battle Stats"</span> to track your performance and
                  upcoming matches.
                </p>
              </div>
            )}
            
            {participationInfo.participationType === "single" && (
              <div className="ml-10">
                <p className={`text-sm opacity-90 ${isLight ? 'text-green-700' : 'text-green-300'}`}>
                  Use <span className={`font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>"Battle Stats"</span> to track your performance and
                  upcoming matches.
                </p>
          </div>
            )}
        </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Tournament Info or Team Carousel */}
          <div className="lg:col-span-2">
            <div className={`${isLight 
              ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
              : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl`}>
            {showTeamCarousel ? (
                /* Enhanced Team Carousel */
              <div className="team-carousel">
                  <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r ${isLight 
                      ? 'from-cyan-600 to-blue-600' 
                      : 'from-cyan-400 to-blue-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                      <FontAwesomeIcon icon={faUsers} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                      {viewOnlyMode ? "Tournament Warriors" : "Join a Squad"}
                  </h2>
                  <button 
                    onClick={handleCloseTeamCarousel}
                      className={`text-gray-${isLight ? '600' : '400'} hover:text-red-${isLight ? '600' : '400'} transition-colors duration-200 p-2 hover:bg-red-500/10 rounded-full`}
                  >
                      <FontAwesomeIcon icon={faTimesCircle} className="text-2xl" />
                  </button>
                  </div>
                  
                  {/* Team Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for squads by name..."
                      value={teamSearchQuery}
                      onChange={handleTeamSearch}
                      className={`w-full p-3 pl-10 ${isLight 
                        ? 'bg-white/80 border-gray-300 focus:border-cyan-400 focus:shadow-cyan-400/25 text-gray-800 placeholder-gray-500' 
                        : 'bg-black/40 border-gray-600 focus:border-cyan-400 focus:shadow-cyan-500/25 text-white placeholder-gray-400'} border-2 rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300`}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FontAwesomeIcon icon={faSearch} className={`${isLight ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    {teamSearchQuery && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button 
                          onClick={() => {
                            setTeamSearchQuery('');
                            setFilteredTeams(teams);
                            setCurrentTeamIndex(0);
                          }}
                          className={`text-gray-${isLight ? '500' : '400'} hover:text-gray-${isLight ? '700' : '200'} transition-colors`}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {filteredTeams.length === 0 && teamSearchQuery && (
                    <div className={`mt-3 p-2 text-center ${isLight 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-gray-800/50 text-gray-300'} rounded-lg text-sm`}>
                      No squads found matching "{teamSearchQuery}"
                    </div>
                  )}
                </div>

                {joinError && (
                    <div className={`${isLight 
                      ? 'text-red-600 bg-red-50 border border-red-200' 
                      : 'text-red-400 bg-red-500/10 border border-red-500/30'} flex items-center gap-3 p-4 rounded-xl mb-6`}>
                    <FontAwesomeIcon icon={faTimesCircle} />
                    <span>{joinError}</span>
                  </div>
                )}

                {joinSuccess && (
                    <div className={`${isLight 
                      ? 'text-green-600 bg-green-50 border border-green-200' 
                      : 'text-green-400 bg-green-500/10 border border-green-500/30'} flex items-center gap-3 p-4 rounded-xl mb-6`}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span>{joinSuccess}</span>
                  </div>
                )}
                
                {viewOnlyMode && (
                    <div className={`${isLight 
                      ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                      : 'text-blue-400 bg-blue-500/10 border border-blue-500/30'} flex items-center gap-3 p-4 rounded-xl mb-6`}>
                    <FontAwesomeIcon icon={faInfoCircle} />
                      <span>🔍 Browse Mode: Explore all registered teams</span>
                  </div>
                )}

                {!teamSearchQuery && teams.length === 0 ? (
                    <div className="text-center py-12">
                      <FontAwesomeIcon icon={faUsers} className="text-6xl text-gray-600 mb-6" />
                    {viewOnlyMode ? (
                        <div>
                          <p className="text-xl text-gray-300 mb-2">No teams have joined this epic battle yet.</p>
                          <p className="text-gray-400">Be the first to assemble a squad!</p>
                        </div>
                    ) : (
                        <div>
                          <p className="text-xl text-gray-300 mb-4">No squads available to join.</p>
                        <button
                            onClick={() => handleJoin("create")}
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center gap-3 mx-auto shadow-lg hover:shadow-red-500/25"
                        >
                            <FontAwesomeIcon icon={faCrown} />
                            <span>Create Your Squad</span>
                        </button>
                        </div>
                    )}
                  </div>
                ) : filteredTeams.length === 0 && teamSearchQuery ? (
                    <div className="text-center py-12">
                      <FontAwesomeIcon icon={faSearch} className="text-6xl text-gray-600 mb-6" />
                      <p className="text-xl text-gray-300 mb-2">No squads match your search.</p>
                      <p className="text-gray-400">Try a different search term or clear the search.</p>
                  </div>
                ) : (
                  <div className="carousel-content">
                    <div className="relative flex flex-col items-center">
                        {/* Navigation Buttons */}
                      <button 
                        onClick={prevTeam}
                          className="mb-4 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-20"
                      >
                        <FontAwesomeIcon icon={faChevronUp} className="text-xl" />
                      </button>
                      
                        {/* Team Display Container */}
                        <div className="w-full h-[500px] relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
                        {filteredTeams.map((team, index) => (
                          <div 
                            key={team.id}
                              className={`w-full h-full transition-all duration-500 absolute inset-0 p-8 ${
                              index === currentTeamIndex 
                                  ? "opacity-100 translate-y-0 z-10"
                                : index === (currentTeamIndex + 1) % filteredTeams.length
                                    ? "opacity-0 translate-y-[100%] z-0"
                                  : index === (currentTeamIndex - 1 + filteredTeams.length) % filteredTeams.length
                                      ? "opacity-0 translate-y-[-100%] z-0"
                                      : "opacity-0 z-0"
                            }`}
                          >
                            <div 
                                className={`w-full h-full rounded-2xl p-6 transition-all duration-300 relative ${
                                selectedTeamForJoin && selectedTeamForJoin.id === team.id 
                                    ? "bg-gradient-to-br from-red-500/20 to-pink-500/20 border-2 border-red-500/50"
                                : team.isFull 
                                      ? "bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/50"
                                      : "bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/30 hover:border-cyan-500/50 cursor-pointer hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-blue-500/10"
                              }`}
                              onClick={() => !viewOnlyMode && !team.isFull && handleSelectTeamToJoin(team)}
                            >
                                {/* Team Status Badge */}
                              {team.isFull && (
                                  <div className="absolute right-6 top-6">
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-4 py-2 text-sm text-black font-bold flex items-center gap-2 shadow-lg">
                                    <FontAwesomeIcon icon={faExclamationTriangle} />
                                      <span>SQUAD FULL</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-col h-full">
                                  {/* Team Header */}
                                  <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                      {team.name || `Squad #${team.number}`}
                                  </h3>
                                    <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                                      {team.memberCount}/{team.maxMembers} Warriors
                                  </div>
                                </div>

                                  {/* Team Members Avatars */}
                                  <div className="flex flex-wrap gap-4 mb-6">
                                    {Array.from({ length: team.maxMembers }).map((_, i) => {
                                      const member = team.members && team.members[i]
                                      return (
                                        <div 
                                          key={i} 
                                          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                            i < team.memberCount
                                              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg transform hover:scale-110"
                                              : "bg-gray-700/50 text-gray-500 border-2 border-dashed border-gray-600"
                                          }`}
                                          title={member ? member.name : "Empty slot"}
                                        >
                                          {member ? (
                                            (() => {
                                              // Debug: Log member profile picture data
                                              
                                              
                                              return member.profile_pic_url ? (
                                                <ImageWithFallback 
                                                  src={member.profile_pic_url} 
                                                  alt={member.name} 
                                                  className="w-full h-full object-cover rounded-full"
                                                />
                                              ) : (
                                                <span className="text-xl font-bold">
                                                  {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                                                </span>
                                              );
                                            })()
                                          ) : (
                                            <span className="text-xl opacity-50">?</span>
                                          )}
                                          {member && member.isLeader && (
                                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-black font-bold shadow-lg">
                                              👑
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  
                                  {/* Team Members List */}
                                  <div className="flex-grow space-y-3 text-sm">
                                    {team.members &&
                                      team.members.map((member, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center bg-black/30 rounded-lg p-3 backdrop-blur-sm"
                                        >
                                          <span
                                            className={`mr-3 text-lg ${member.isLeader ? "text-yellow-400" : "text-cyan-400"}`}
                                          >
                                            {member.isLeader ? "👑" : "⚔️"}
                                        </span>
                                          <span
                                            className={`font-semibold ${member.isLeader ? "text-yellow-300" : "text-white"}`}
                                          >
                                          {member.name}
                                        </span>
                                          {member.isLeader && (
                                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                                              LEADER
                                            </span>
                                          )}
                                      </div>
                                    ))}
                                </div>
                                
                                  {/* Team Status Footer */}
                                  <div className="mt-6 pt-4 border-t border-gray-700/50">
                                  {viewOnlyMode ? (
                                      <div
                                        className={`${team.isFull ? "text-yellow-400" : "text-green-400"} flex items-center gap-3 text-lg font-bold`}
                                      >
                                        <FontAwesomeIcon icon={team.isFull ? faShield : faBullseye} />
                                        <span>
                                          {team.isFull
                                            ? "Squad Complete"
                                            : `${team.maxMembers - team.memberCount} slots available`}
                                        </span>
                                    </div>
                                  ) : team.isFull ? (
                                      <div className="text-yellow-400 flex items-center gap-3 text-lg font-bold">
                                      <FontAwesomeIcon icon={faExclamationTriangle} />
                                        <span>This squad is at full capacity</span>
                                    </div>
                                  ) : (
                                      <div className="text-green-400 flex items-center gap-3 text-lg font-bold">
                                        <FontAwesomeIcon icon={faCheckCircle} className="animate-pulse" />
                                        <span>
                                          Ready to join • {team.maxMembers - team.memberCount} slot
                                          {team.maxMembers - team.memberCount !== 1 ? "s" : ""} available
                                        </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Down Navigation Button */}
                      <button 
                        onClick={nextTeam}
                          className="mt-4 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-20"
                      >
                        <FontAwesomeIcon icon={faChevronDown} className="text-xl" />
                      </button>
                      
                        {/* Team Navigation Indicators */}
                        <div className="flex flex-wrap justify-center mt-6 gap-2">
                          {filteredTeams.length > 0 && (
                            <div className={`text-sm text-gray-400 mb-2 w-full text-center`}>
                              {filteredTeams.length} {filteredTeams.length === 1 ? 'squad' : 'squads'} {teamSearchQuery ? 'found' : 'available'}
                            </div>
                          )}
                          {filteredTeams.map((team, index) => (
                          <button
                            key={index}
                              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                              index === currentTeamIndex 
                                  ? "bg-gradient-to-r from-red-500 to-pink-500 transform scale-125 w-4 h-4 shadow-lg"
                                : team.isFull 
                                    ? "bg-yellow-500/60 hover:bg-yellow-400"
                                    : "bg-gray-500/60 hover:bg-gray-400"
                            }`}
                            onClick={() => setCurrentTeamIndex(index)}
                              title={`${team.name || `Team #${team.number}`}${team.isFull ? " (Full)" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                      {/* Team Join Form */}
                    {selectedTeamForJoin && !viewOnlyMode && (
                        <div className={`mt-8 p-6 bg-gradient-to-br ${isLight 
                          ? 'from-gray-100 to-gray-200 border border-gray-300' 
                          : 'from-gray-800/70 to-gray-900/70 border border-gray-700/50'} backdrop-blur-sm rounded-2xl shadow-2xl`}>
                          <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <FontAwesomeIcon icon={faUserPlus} className={isLight ? "text-red-600" : "text-red-400"} />
                            Join {selectedTeamForJoin.name || `Squad #${selectedTeamForJoin.number}`}
                        </h3>
                        
                          <div className="mb-6">
                            <label htmlFor="teamJoinPassword" className={`block mb-3 text-lg font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                              Squad Password
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id="teamJoinPassword"
                              value={teamJoinPassword}
                              onChange={(e) => setTeamJoinPassword(e.target.value)}
                                placeholder="Enter the squad password"
                                className={`w-full p-4 pl-12 border-2 rounded-xl ${isLight 
                                  ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-red-400' 
                                  : 'bg-black/40 border-gray-600 text-white placeholder-gray-400 focus:border-red-500'} focus:outline-none transition-all duration-300 text-lg`}
                            />
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FontAwesomeIcon icon={faKey} className={isLight ? "text-gray-500" : "text-gray-400"} />
                            </div>
                          </div>
                            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-3 italic`}>
                              🔐 Ask the squad leader for the secret password
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={handleJoinSelectedTeam}
                            disabled={joiningProcess || !teamJoinPassword}
                              className={`bg-gradient-to-r ${isLight 
                                ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                                : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white px-8 py-4 rounded-xl transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-red-500/25 transform hover:scale-105`}
                          >
                            {joiningProcess ? (
                              <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                  <span>Joining Squad...</span>
                              </>
                            ) : (
                              <>
                                  <FontAwesomeIcon icon={faRocket} />
                                  <span>JOIN SQUAD</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
                /* Enhanced Tournament Information */
              <div className="tournament-info">
                  <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-cyan-400 dark:text-cyan-400" />
                    Battle Intel
                </h2>

                  {/* Schedule Section */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600 dark:text-purple-400" />
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        Battle Schedule
                      </span>
                  </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl border border-purple-300 dark:border-purple-500/30">
                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-semibold">📝 Registration Period</p>
                        <div className="space-y-2">
                          <p className="text-gray-800 dark:text-white font-medium">
                        {getFormattedDate(tournament.Registration_Start_Time)}
                      </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">to</p>
                          <p className="text-gray-800 dark:text-white font-medium">{getFormattedDate(tournament.Registration_End_Time)}</p>
                    </div>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl border border-red-300 dark:border-red-500/30">
                        <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-semibold">⚔️ Battle Period</p>
                        <div className="space-y-2">
                          <p className="text-gray-800 dark:text-white font-medium">{getFormattedDate(tournament.Event_Start_Time)}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">to</p>
                          <p className="text-gray-800 dark:text-white font-medium">{getFormattedDate(tournament.Event_End_Time)}</p>
                        </div>
                    </div>
                  </div>
                </div>

                  {/* Team Information */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <FontAwesomeIcon icon={faUsers} className="text-cyan-600 dark:text-cyan-400" />
                      <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                        Squad Intel
                      </span>
                  </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl border border-blue-300 dark:border-blue-500/30">
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-semibold">👥 Squad Size</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">
                          {tournament.Team_Size_Limit > 1 ? `${tournament.Team_Size_Limit} Warriors` : "⚔️ Solo Battle"}
                      </p>
                    </div>
                      <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl border border-green-300 dark:border-green-500/30">
                        <p className="text-sm text-green-700 dark:text-green-300 mb-2 font-semibold">🎯 Max Fighters</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">{tournament.Max_Players_Allowed} players</p>
                    </div>
                      <div className="p-6 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-500/10 dark:to-red-500/10 rounded-xl border border-orange-300 dark:border-orange-500/30">
                        <p className="text-sm text-orange-700 dark:text-orange-300 mb-2 font-semibold">🔥 Open Slots</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">
                          {tournament.availableSlots && tournament.availableSlots.availableSlots !== undefined
                          ? tournament.availableSlots.availableSlots
                            : "0"}{" "}
                        Slots
                      </p>
                    </div>
                  </div>
                </div>

                  {/* Prize Information */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <FontAwesomeIcon icon={faTrophy} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                        Victory Rewards
                      </span>
                  </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl border border-yellow-300 dark:border-yellow-500/30">
                                                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2 font-semibold">💰 Total Prize Pool</p>
                          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                            {formatCurrency(tournament.Prize_Amount, tournament.Currency)}
                          </p>
                    </div>
                      <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl border border-purple-300 dark:border-purple-500/30">
                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-semibold">🏆 Prize Distribution</p>
                      {(() => {
                        // Try to parse Prize_Distribution first, then fallback to Payout_Structure
                        let prizeDistribution = null;
                        
                        if (tournament.Prize_Distribution) {
                          try {
                            prizeDistribution = typeof tournament.Prize_Distribution === 'string' 
                              ? JSON.parse(tournament.Prize_Distribution) 
                              : tournament.Prize_Distribution;
                          } catch (error) {
                            console.error('Error parsing prize distribution:', error);
                          }
                        }
                        
                        if (prizeDistribution && (prizeDistribution.first || prizeDistribution.second || prizeDistribution.third)) {
                          return (
                            <div className="space-y-2">
                              {prizeDistribution.first > 0 && (
                                <p className="text-sm text-gray-800 dark:text-white flex justify-between">
                                  <span>🥇 1st Place</span>
                                  <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                    {formatCurrency(prizeDistribution.first, tournament.Currency)}
                                  </span>
                                </p>
                              )}
                              {prizeDistribution.second > 0 && (
                                <p className="text-sm text-gray-800 dark:text-white flex justify-between">
                                  <span>🥈 2nd Place</span>
                                  <span className="font-bold text-gray-600 dark:text-gray-400">
                                    {formatCurrency(prizeDistribution.second, tournament.Currency)}
                                  </span>
                                </p>
                              )}
                              {prizeDistribution.third > 0 && (
                                <p className="text-sm text-gray-800 dark:text-white flex justify-between">
                                  <span>🥉 3rd Place</span>
                                  <span className="font-bold text-orange-600 dark:text-orange-400">
                                    {formatCurrency(prizeDistribution.third, tournament.Currency)}
                                  </span>
                                </p>
                              )}
                            </div>
                          );
                        } else if (tournament.Payout_Structure) {
                          return (
                            <div className="space-y-2">
                              {Object.entries(tournament.Payout_Structure).map(([position, percentage]) => (
                                <p key={position} className="text-sm text-gray-800 dark:text-white flex justify-between">
                                  <span>
                                    {position === "1"
                                      ? "🥇 1st"
                                      : position === "2"
                                        ? "🥈 2nd"
                                        : position === "3"
                                          ? "🥉 3rd"
                                          : `🏅 ${position}th`}
                                  </span>
                                  <span className="font-bold text-yellow-600 dark:text-yellow-400">{percentage}%</span>
                                </p>
                              ))}
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Prize distribution details coming soon</p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>

                  {/* Tournament Features */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-300 dark:border-gray-700/50">
                      <FontAwesomeIcon icon={tournament.Is_Private ? faLock : faLockOpen} className="text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{tournament.Is_Private ? "🔒 Private" : "🌐 Public"}</span>
                  </div>
                    <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-300 dark:border-gray-700/50">
                    <FontAwesomeIcon
                        icon={tournament.Is_Sponsored ? faMoneyBillWave : faGem}
                        className="text-green-600 dark:text-green-400"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {tournament.Is_Sponsored ? "💎 Sponsored" : "🎮 Community"}
                    </span>
                  </div>
                    <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-300 dark:border-gray-700/50">
                    <FontAwesomeIcon
                      icon={tournament.Is_Offline ? faMapMarkerAlt : faGamepad}
                        className="text-blue-600 dark:text-blue-400"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{tournament.Is_Offline ? "📍 Offline" : "🌐 Online"}</span>
                  </div>
                    <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-300 dark:border-gray-700/50">
                    <FontAwesomeIcon
                        icon={tournament.Is_Bracket_Competition ? faTrophy : faBullseye}
                        className="text-red-600 dark:text-red-400"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {tournament.Is_Bracket_Competition ? "🏆 Bracket" : "🎯 Points"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament Timeline - Always show after registration is closed */}
            
            </div>
          </div>

          {/* Registration Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`${isLight 
              ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
              : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
              <h2 className={`text-xl font-bold mb-6 bg-gradient-to-r ${isLight 
                ? 'from-red-600 to-pink-600' 
                : 'from-red-400 to-pink-400'} bg-clip-text text-transparent flex items-center gap-3`}>
                <FontAwesomeIcon icon={faRocket} className={isLight ? 'text-red-600' : 'text-red-400'} />
                Battle Entry
              </h2>

              <div className="space-y-6">
                <div className={`p-6 bg-gradient-to-br ${isLight 
                  ? 'from-red-500/10 to-pink-500/10 border border-red-500/20' 
                  : 'from-red-500/20 to-pink-500/20 border border-red-500/30'} rounded-xl`}>
                  <p className={`text-sm ${isLight ? 'text-red-700' : 'text-red-300'} mb-2 font-semibold`}>💳 Entry Fee</p>
                  
                  {/* Total Entry Fee */}
                  <p className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'} mb-4`}>
                    {formatTournamentFees(tournament).total}
                  </p>

                  {/* Fee Breakdown */}
                  <div className={`space-y-2 text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                          <div className="flex justify-between items-center">
                        <span>Registration Amount:</span>
                        <span className="font-semibold">{formatCurrency(tournament.Registration_Amount, tournament.Currency)}</span>
                      </div>
                      {tournament.Platform_fee && Number.parseFloat(tournament.Platform_fee) > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Platform Fee:</span>
                          <span className="font-semibold">{formatCurrency(tournament.Platform_fee, tournament.Currency)}</span>
                        </div>
                      )}
                      {tournament.Organizer_fee && Number.parseFloat(tournament.Organizer_fee) > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Organizer Fee:</span>
                          <span className="font-semibold">{formatCurrency(tournament.Organizer_fee, tournament.Currency)}</span>
                        </div>
                      )}
                      {(tournament.Platform_fee && Number.parseFloat(tournament.Platform_fee) > 0) || 
                       (tournament.Organizer_fee && Number.parseFloat(tournament.Organizer_fee) > 0) ? (
                        <div className={`border-t pt-2 mt-2 ${isLight ? 'border-gray-300' : 'border-gray-600'}`}>
                          <div className="flex justify-between items-center font-bold">
                            <span>Total:</span>
                            <span>{formatTournamentFees(tournament).total}</span>
                          </div>
                        </div>
                      ) : null}
                  </div>
                </div>

                {/* Timeline block below entry fee */}
                {tournament.Status === "Accepting Registrations" && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl text-center">
                    <span className="text-lg font-semibold">⏰ Registration closes on:</span>
                    <div className="text-2xl font-bold mt-1">{getFormattedDate(tournament.Registration_End_Time)}</div>
                  </div>
                )}
                {tournament.Status === "Registrations Closed" && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl text-center">
                    <span className="text-lg font-semibold">⚔️ Event starts on:</span>
                    <div className="text-2xl font-bold mt-1">{getFormattedDate(tournament.Event_Start_Time)}</div>
                  </div>
                )}
                {tournament.Status === "In Progress" && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl text-center">
                    <span className="text-lg font-semibold">🏁 Event ends on:</span>
                    <div className="text-2xl font-bold mt-1">{getFormattedDate(tournament.Event_End_Time)}</div>
                  </div>
                )}
                {tournament.Status === "Ended" && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-gray-500/10 to-gray-700/10 border border-gray-500/30 rounded-xl text-center">
                    <span className="text-lg font-semibold">🏆 Event ended on:</span>
                    <div className="text-2xl font-bold mt-1">{getFormattedDate(tournament.Event_End_Time)}</div>
                  </div>
                )}

                

                {/* Matchup Details Section - Only show for team tournaments and participating users */}
                {(() => {
                  const shouldShow = isParticipating;
                  console.log("Matchup Button Visibility Check:", {
                    teamSizeLimit: tournament.Team_Size_Limit,
                    isParticipating,
                    participationType: participationInfo?.participationType,
                    shouldShow
                  });
                  return shouldShow;
                })() && (
                  <div className={`p-4 bg-gradient-to-br ${isLight 
                    ? 'from-blue-500/5 to-cyan-500/5 border border-blue-500/20' 
                    : 'from-blue-500/10 to-cyan-500/10 border border-blue-500/30'} rounded-xl`}>
                    <h3 className={`text-sm font-bold mb-3 ${isLight ? 'text-blue-700' : 'text-blue-300'} flex items-center gap-2`}>
                      <FontAwesomeIcon icon={faBullseye} />
                      Match Details
                    </h3>
                    
                    {!showMatchupDetails ? (
                      <button
                        onClick={fetchMatchupDetails}
                        disabled={loadingMatchup}
                        className={`w-full py-2 px-4 bg-gradient-to-r ${isLight 
                          ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                          : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white rounded-lg transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {loadingMatchup ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faSearch} />
                            <span>Get Matchup Details</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {matchupError ? (
                          <div className={`text-red-400 text-xs p-2 bg-red-500/10 rounded border border-red-500/30`}>
                            {matchupError}
                          </div>
                        ) : matchupData ? (
                          <>
                            <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'} space-y-2`}>
                              <div className="flex justify-between">
                                <span className="font-semibold">Round:</span>
                                <span>{matchupData.matchup.round}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold">Status:</span>
                                <span className={`capitalize ${matchupData.matchup.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {matchupData.matchup.status}
                                </span>
                              </div>
                              {matchupData.opponentTeam && (
                                <div className="flex justify-between">
                                  <span className="font-semibold">Opponent:</span>
                                  <span>{matchupData.opponentTeam.name || `Team #${matchupData.opponentTeam.number}`}</span>
                                </div>
                              )}
                              {matchupData.matchup.scheduled_time && (
                                <div className="flex justify-between">
                                  <span className="font-semibold">Scheduled:</span>
                                  <span>{new Date(matchupData.matchup.scheduled_time).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {(matchupData.matchup.room_code || matchupData.matchup.room_password) && (
                              <div className={`mt-3 p-3 bg-gradient-to-r ${isLight 
                                ? 'from-green-500/10 to-emerald-500/10 border border-green-500/20' 
                                : 'from-green-500/20 to-emerald-500/20 border border-green-500/30'} rounded-lg`}>
                                <h4 className={`text-xs font-bold mb-2 ${isLight ? 'text-green-700' : 'text-green-300'} flex items-center gap-1`}>
                                  <FontAwesomeIcon icon={faKey} />
                                  Room Details
                                </h4>
                                {matchupData.matchup.room_code && (
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className={`font-semibold ${isLight ? 'text-green-700' : 'text-green-300'}`}>Code:</span>
                                    <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/20 px-2 py-1 rounded`}>
                                      {matchupData.matchup.room_code}
                                    </span>
                                  </div>
                                )}
                                {matchupData.matchup.room_password && (
                                  <div className="flex justify-between text-xs">
                                    <span className={`font-semibold ${isLight ? 'text-green-700' : 'text-green-300'}`}>Password:</span>
                                    <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/20 px-2 py-1 rounded`}>
                                      {matchupData.matchup.room_password}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <button
                              onClick={() => {
                                setShowMatchupDetails(false);
                                setMatchupData(null);
                                setMatchupError("");
                              }}
                              className={`w-full mt-2 py-1 px-3 text-xs ${isLight 
                                ? 'text-gray-600 hover:text-gray-800 border border-gray-300 hover:bg-gray-100' 
                                : 'text-gray-400 hover:text-gray-200 border border-gray-600 hover:bg-gray-700'} rounded transition-colors duration-200`}
                            >
                              Hide Details
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}

                                    {/* Info section - Show why matchup details might not be visible */}
                {tournament.Team_Size_Limit > 1 && (!isParticipating || participationInfo?.participationType !== "team") && (
                  <div className={`p-4 bg-gradient-to-br ${isLight 
                    ? 'from-gray-500/5 to-gray-500/5 border border-gray-500/20' 
                    : 'from-gray-500/10 to-gray-500/10 border border-gray-500/30'} rounded-xl`}>
                    <h3 className={`text-sm font-bold mb-3 ${isLight ? 'text-gray-700' : 'text-gray-300'} flex items-center gap-2`}>
                      <FontAwesomeIcon icon={faInfoCircle} />
                      Match Details
                    </h3>
                    <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'} space-y-1`}>
                      {!isParticipating ? (
                        <p>🔒 Join this tournament as a team member to view match details</p>
                      ) : participationInfo?.participationType !== "team" ? (
                        <p>🔒 Match details are only available for team participants</p>
                      ) : (
                        <p>🔒 Match details will be available once you join a team</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tournament Room Details Section - Only show for non-bracket tournaments when user is participating */}
                {!tournament.Is_Bracket_Competition && isParticipating && (tournament.Room_Code || tournament.Room_Password) && (
                  <div className={`p-4 bg-gradient-to-br ${isLight 
                    ? 'from-green-500/5 to-emerald-500/5 border border-green-500/20' 
                    : 'from-green-500/10 to-emerald-500/10 border border-green-500/30'} rounded-xl`}>
                    <h3 className={`text-sm font-bold mb-3 ${isLight ? 'text-green-700' : 'text-green-300'} flex items-center gap-2`}>
                      <FontAwesomeIcon icon={faKey} />
                      🎮 Tournament Room
                    </h3>
                    <div className="space-y-2">
                      {tournament.Room_Code && (
                        <div className="flex justify-between text-xs">
                          <span className={`font-semibold ${isLight ? 'text-green-700' : 'text-green-300'}`}>Room Code:</span>
                          <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/20 px-2 py-1 rounded`}>
                            {tournament.Room_Code}
                          </span>
                        </div>
                      )}
                      {tournament.Room_Password && (
                        <div className="flex justify-between text-xs">
                          <span className={`font-semibold ${isLight ? 'text-green-700' : 'text-green-300'}`}>Password:</span>
                          <span className={`font-mono ${isLight ? 'text-gray-800' : 'text-white'} bg-black/20 px-2 py-1 rounded`}>
                            {tournament.Room_Password}
                          </span>
                        </div>
                      )}
                      <div className={`text-xs ${isLight ? 'text-green-600' : 'text-green-400'} mt-2 bg-green-500/10 p-2 rounded border border-green-500/20`}>
                        💡 Use these details to join the tournament room when the event begins.
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar Ad - Only show if there are sponsor images */}
            {sponsorImages.promotional_images && sponsorImages.promotional_images.length > 0 && (
              <Advertisement 
                type="sidebar" 
                images={sponsorImages.promotional_images}
                placeholder="Sponsored Tournament" 
              />
            )}
          </div>
        </div>

        {/* In-feed Ad - Only show if there are sponsor images and leaderboard/timeline exists */}
        {(tournament.leaderboard || tournament.timeline) && sponsorImages.promotional_images && sponsorImages.promotional_images.length > 0 && (
          <div className="mb-6">
            <Advertisement 
              type="normal" 
              images={sponsorImages.promotional_images}
              placeholder="Featured Gaming Gear"
            />
          </div>
        )}

        {/* Bracket matchups only for bracket tournaments */}
        {tournament.Is_Bracket_Competition && (
          <BracketMatchupsView tournamentId={tournamentId} isLight={isLight} />
        )}
      </div>

      {/* Enhanced Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${isLight 
            ? 'bg-white/95 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/90 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl max-w-md w-full`}>
            <h2 className={`text-2xl font-bold mb-6 ${isLight 
              ? 'text-gray-900' 
              : 'bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent'}`}>
              {joinType === "create"
                ? "👑 Create Your Squad"
                : joinType === "join"
                  ? "🛡️ Join a Squad"
                  : "⚔️ Enter Battle"}
            </h2>

            {joinError ? (
              <div className={`${isLight 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'} flex items-center gap-3 p-4 rounded-xl mb-6 border`}>
                <FontAwesomeIcon icon={faTimesCircle} />
                <span>{joinError}</span>
              </div>
            ) : joinSuccess ? (
              <div className={`${isLight 
                ? 'bg-green-50 border-green-200 text-green-600' 
                : 'bg-green-500/10 border-green-500/30 text-green-400'} flex items-center gap-3 p-4 rounded-xl mb-6 border`}>
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>{joinSuccess}</span>
              </div>
            ) : (
              <div className={`mb-6 p-4 rounded-xl border ${isLight 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                <h3 className={`font-bold mb-2 flex items-center gap-2 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  <FontAwesomeIcon icon={faInfoCircle} />
                  {joinType === "create"
                    ? "🚀 Launch your own squad"
                    : joinType === "join"
                      ? "🤝 Join an existing squad"
                      : "⚡ Solo warrior mode"}
                </h3>
                <p className={`text-sm ${isLight ? 'text-blue-600' : 'text-blue-300'}`}>
                  {joinType === "create"
                    ? "You will become the squad leader. After payment, others can join using your squad password."
                    : joinType === "join"
                      ? "You need the squad password from the team leader to join."
                      : "You will be registered as a solo fighter."}
                </p>
              </div>
            )}

            {redirectingToPayment ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <FontAwesomeIcon icon={faSpinner} className={`${isLight ? 'text-red-600' : 'text-red-400'} text-4xl animate-spin`} />
                </div>
                <p className={`text-xl mb-2 font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>🚀 Launching payment portal...</p>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Please do not close this window.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitJoin}>
                {joinType === "create" && (
                  <>
                    <div className="mb-6">
                      <label htmlFor="teamName" className={`block mb-3 font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        Squad Name
                      </label>
                      <input
                        type="text"
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter your epic squad name"
                        required
                        className={`w-full p-4 border-2 rounded-xl ${isLight 
                          ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-red-400' 
                          : 'bg-black/40 border-gray-600 text-white placeholder-gray-400 focus:border-red-500'} focus:outline-none transition-all duration-300`}
                      />
                    </div>
                    <div className="mb-6">
                      <label htmlFor="teamPassword" className={`block mb-3 font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        Squad Password
                      </label>
                      <input
                        type="text"
                        id="teamPassword"
                        value={teamPassword}
                        onChange={(e) => setTeamPassword(e.target.value)}
                        placeholder="Create a secret password"
                        required
                        className={`w-full p-4 border-2 rounded-xl ${isLight 
                          ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-red-400' 
                          : 'bg-black/40 border-gray-600 text-white placeholder-gray-400 focus:border-red-500'} focus:outline-none transition-all duration-300`}
                      />
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-2`}>
                        🔐 This password will be used by others to join your squad. Complete payment to finalize squad
                        creation.
                      </p>
                    </div>
                    
                    {/* Time limit warning */}
                    <div className={`p-4 mb-6 rounded-xl ${isLight 
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' 
                      : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                        <p className="font-bold">⏰ Time Limit Warning</p>
                      </div>
                      <p className="text-sm">
                        You have 10 minutes to complete the checkout process. If you don't complete payment within this time, your slot will automatically be released, and any pending payment may still be processed.
                      </p>
                    </div>
                  </>
                )}

                {joinType === "join" && (
                  <>
                    <div className="mb-6">
                      <label htmlFor="teamSelect" className={`block mb-3 font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        Select Squad
                      </label>
                      <select
                        id="teamSelect"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        required
                        className={`w-full p-4 border-2 rounded-xl ${isLight 
                          ? 'bg-white border-gray-300 text-gray-800 focus:border-red-400' 
                          : 'bg-black/40 border-gray-600 text-white focus:border-red-500'} focus:outline-none transition-all duration-300`}
                      >
                        <option value="">Choose your squad</option>
                        {teams.length > 0 ? (
                          teams.map((team) => (
                            <option key={team.id} value={team.number}>
                              {team.name} ({team.memberCount}/{team.maxMembers})
                          </option>
                          ))
                        ) : (
                          <option disabled>No squads available to join</option>
                        )}
                      </select>
                      {teams.length === 0 && (
                        <p className={`text-sm ${isLight ? 'text-yellow-600' : 'text-yellow-400'} mt-2`}>
                          ⚠️ No squads are available to join. You may need to create a new squad.
                        </p>
                      )}
                    </div>
                    <div className="mb-6">
                      <label htmlFor="teamPassword" className={`block mb-3 font-bold text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        Squad Password
                      </label>
                      <input
                        type="text"
                        id="teamPassword"
                        value={teamPassword}
                        onChange={(e) => setTeamPassword(e.target.value)}
                        placeholder="Enter the squad password"
                        required
                        className={`w-full p-4 border-2 rounded-xl ${isLight 
                          ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-red-400' 
                          : 'bg-black/40 border-gray-600 text-white placeholder-gray-400 focus:border-red-500'} focus:outline-none transition-all duration-300`}
                      />
                    </div>
                  </>
                )}
                
                {joinType === "single" && (
                  /* Time limit warning for single player */
                  <div className={`p-4 mb-6 rounded-xl ${isLight 
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' 
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                      <p className="font-bold">⏰ Time Limit Warning</p>
                    </div>
                    <p className="text-sm">
                      You have 10 minutes to complete the checkout process. If you don't complete payment within this time, your slot will automatically be released, and any pending payment may still be processed.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={`px-6 py-3 border-2 rounded-xl transition-all duration-300 font-semibold ${isLight 
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-100' 
                      : 'border-gray-600 hover:bg-gray-700/50'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      joiningProcess ||
                      (joinType === "create" && (!teamPassword || !teamName)) ||
                      (joinType === "join" && (!teamPassword || !selectedTeam))
                    }
                    className={`px-8 py-3 bg-gradient-to-r ${isLight 
                      ? 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
                      : 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'} text-white rounded-xl transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-red-500/25 transform hover:scale-105`}
                  >
                    {joiningProcess ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon
                          icon={joinType === "create" ? faCrown : joinType === "join" ? faShield : faRocket}
                        />
                        <span>
                          {joinType === "create" ? "CREATE & PAY" : joinType === "join" ? "JOIN SQUAD" : "ENTER BATTLE"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Add Admin Modal */}
      {showAddAdminModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isLight ? 'bg-black/30' : 'bg-black/80'}`}>
          <div className={`backdrop-blur-xl rounded-2xl p-8 shadow-2xl max-w-md w-full ${isLight ? 'bg-white/95 border border-gray-200 text-gray-900' : 'bg-black/90 border border-gray-700 text-white'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent'}`}>
              🛡️ Add Temporary Admin
            </h2>

            {adminActionSuccess ? (
              <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${
                isLight ? 'text-green-700 bg-green-50 border-green-200' : 'text-green-400 bg-green-500/10 border-green-500/30'}`}>
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>{adminActionSuccess}</span>
              </div>
            ) : adminActionError ? (
              <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${
                isLight ? 'text-red-700 bg-red-50 border-red-200' : 'text-red-400 bg-red-500/10 border-red-500/30'}`}>
                <FontAwesomeIcon icon={faTimesCircle} />
                <span>{adminActionError}</span>
              </div>
            ) : null}

            <form onSubmit={handleAddTempAdmin}>
              <div className="mb-6 relative">
                <label htmlFor="adminEmail" className={`block mb-3 font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Search User
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="adminEmail"
                    value={adminEmail}
                    onChange={handleEmailChange}
                    placeholder="Search by email or name"
                    required
                    className={`w-full p-4 pl-12 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500'
                        : 'bg-black/60 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                    }`}
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon 
                      icon={searchLoading ? faSpinner : faSearch} 
                      className={`${isLight ? 'text-gray-500' : 'text-gray-400'} ${searchLoading ? "animate-spin" : ""}`}
                    />
                  </div>
                </div>
                {showSuggestions && emailSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className={`absolute mt-2 w-full rounded-xl shadow-2xl z-10 max-h-60 overflow-y-auto backdrop-blur-xl $$
                      {isLight ? 'bg-white border border-gray-200' : 'bg-black/90 border border-gray-700'}`}
                  >
                    {emailSuggestions.map((user) => (
                      <div 
                        key={user.user_id}
                        className={`p-4 cursor-pointer flex items-center gap-3 transition-colors $$
                          {isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700/50'}`}
                        onClick={() => handleSelectSuggestion(user.email)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold $$
                          {isLight ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}>
                          {user.Name ? user.Name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <div className={`font-semibold $$
                            {isLight ? 'text-gray-900' : 'text-white'}`}>{user.email}</div>
                          <div className={`text-sm $$
                            {isLight ? 'text-gray-500' : 'text-gray-400'}`}>{user.Name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className={`text-sm mt-2 $$
                  {isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  🔍 Search by email or name. This user will have temporary admin rights until the tournament ends.
                </p>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={handleCloseAdminModal}
                  className={`px-6 py-3 border-2 rounded-xl transition-all duration-300 font-semibold ${
                    isLight
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      : 'border-gray-600 text-white hover:bg-gray-700/50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminActionLoading || !adminEmail}
                  className={`px-8 py-3 bg-gradient-to-r rounded-xl transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg transform hover:scale-105 ${
                    isLight ? 'from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white' : 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'}`}
                >
                  {adminActionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserShield} />
                      <span>ADD ADMIN</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament Sponsors Section - Only show if there are logo images */}
      {!loadingSponsors && sponsorImages.logo_images && sponsorImages.logo_images.length > 0 && (
        <div className="container mx-auto px-4 py-6">
          <div className={`${isLight 
            ? 'bg-white/80 backdrop-blur-sm border border-orange-200' 
            : 'bg-black/40 backdrop-blur-xl border border-orange-300/50'} 
            rounded-xl p-4 shadow-lg`}>
            <h2 className={`text-lg font-bold mb-4 ${isLight 
              ? 'bg-gradient-to-r from-orange-600 to-red-600' 
              : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent text-center`}>
              🏆 Tournament Sponsors
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sponsorImages.logo_images.map((sponsor, index) => (
                <div key={sponsor.Sponsor_id || index} 
                     className={`${isLight 
                       ? 'bg-white/60 border-orange-100' 
                       : 'bg-black/20 border-orange-500/20'} 
                       border rounded-lg p-2 flex flex-col items-center justify-center
                       transform transition-all duration-300 hover:scale-105 hover:shadow-md
                       ${isLight ? 'hover:shadow-orange-400/20' : 'hover:shadow-orange-500/30'}`}>
                  {sponsor.url && (
                    <ImageWithFallback 
                      src={sponsor.url} 
                      alt={sponsor.sponsor_name || 'Sponsor Logo'} 
                      className="w-full h-16 object-contain mb-1"
                    />
                  )}
                  {sponsor.sponsor_name && (
                    <h3 className={`text-xs font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'} text-center truncate w-full`}>
                      {sponsor.sponsor_name}
                    </h3>
                  )}
                  {sponsor.sponsorship_level && (
                    <div className={`mt-1 px-2 py-0.5 rounded-full text-xs ${
                      sponsor.sponsorship_level.toLowerCase() === 'platinum' 
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                        : sponsor.sponsorship_level.toLowerCase() === 'gold'
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                        : sponsor.sponsorship_level.toLowerCase() === 'silver'
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                    }`}>
                      {sponsor.sponsorship_level}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TournamentDetails
