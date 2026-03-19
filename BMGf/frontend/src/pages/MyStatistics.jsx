"use client"

import { useState, useEffect, useContext } from "react"
import { ThemeContext } from "../context/ThemeContext"
import { useNavigate, Link } from "react-router-dom"
import Navbar from "../components/navbar"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faTrophy,
  faExclamationTriangle,
  faArrowLeft,
  faGamepad,
  faChevronDown,
  faChevronUp,
  faMedal,
  faSkull,
  faChartBar,
  faHistory,
  faRocket,
  faShieldAlt,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"

const MyStatistics = () => {
  const { colors, theme } = useContext(ThemeContext)
  const isLight = theme === "light"
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [tournamentStats, setTournamentStats] = useState([])
  const [expandedTournament, setExpandedTournament] = useState(null)
  const [activeTab, setActiveTab] = useState("tournament")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overallStats, setOverallStats] = useState({
    totalTournaments: 0,
    totalMatches: 0,
    totalWins: 0,
    winRate: 0,
    bestRank: "N/A",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      navigate("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser({
        user_id: parsedUser.user_id || "",
        Name: parsedUser.Name || "",
        GamerTag: parsedUser.GamerTag || "gamer",
        email: parsedUser.email || "",
        profile_pic_url: parsedUser.profile_pic_url || null,
      })

      // Fetch tournament stats
      const fetchStatistics = async () => {
        try {
          const token = localStorage.getItem("token")
          const user = localStorage.getItem("user")
          const parsedUser = JSON.parse(user)


          // Use the new comprehensive stats API endpoint
          const statsResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/game-stats/user/${parsedUser.user_id}/comprehensive-stats`,
            { headers: { Authorization: `Bearer ${token}` } },
          )


          if (statsResponse.data && statsResponse.data.data) {
            const { tournaments, overallStats } = statsResponse.data.data
            

            // Transform the data to match the existing UI structure
            const transformedTournamentStats = tournaments.map((tournamentData, index) => {
              const tournament = tournamentData.tournament
              const stats = tournamentData.stats
              const gameStats = tournamentData.gameStats
              const teamInfo = tournamentData.teamInfo

            

              const transformedData = {
                tournament: tournament,
                aggregatedStats: {
                  totalGames: stats.totalMatches,
                  wins: stats.wins,
                  losses: stats.losses,
                  winRate: stats.winRate,
                  rank: stats.rank || stats.position || "N/A",
                  position: stats.position,
                  // Include game-specific stats
                  ...gameStats
                },
                individualStats: [], // We don't need individual stats for the UI
                teamInfo: teamInfo
              }

              return transformedData
            })

            setTournamentStats(transformedTournamentStats)

            // Set overall stats
            setOverallStats({
              totalTournaments: overallStats.totalTournaments,
              totalMatches: overallStats.totalMatches,
              totalWins: overallStats.totalWins,
              winRate: overallStats.winRate,
              bestRank: overallStats.bestRank || "N/A",
            })
          } else {
            setTournamentStats([])
            setOverallStats({
              totalTournaments: 0,
              totalMatches: 0,
              totalWins: 0,
              winRate: 0,
              bestRank: "N/A",
            })
          }
        } catch (error) {
          console.error("Error fetching comprehensive statistics:", error)
          setError("Error loading statistics")
        } finally {
          setLoading(false)
        }
      }

      fetchStatistics()
    } catch (error) {
      console.error("Error parsing user data:", error)
      setError("Error loading user data")
      setUser(null)
    }
  }, [navigate])

  // Function to get appropriate color based on win rate
  const getWinRateColor = (winRate) => {
    if (winRate >= 75) return isLight ? "text-green-600" : "text-green-400"
    if (winRate >= 50) return isLight ? "text-blue-600" : "text-blue-400"
    if (winRate >= 25) return isLight ? "text-yellow-600" : "text-yellow-400"
    return isLight ? "text-red-600" : "text-red-400"
  }

  // Function to get appropriate icon based on win rate
  const getWinRateIcon = (winRate) => {
    if (winRate >= 75) return faRocket
    if (winRate >= 50) return faCheckCircle
    if (winRate >= 25) return faShieldAlt
    return faTimesCircle
  }

  // Function to get game icon
  const getGameIcon = (gameName) => {
    const gameIcons = {
      CallOfDuty: "🎯",
      PUBG: "🔫",
      BGMI: "🏆",
      FIFA: "⚽",
      Valorant: "💥",
      OverWatch: "🎮",
    }

    return gameIcons[gameName] || "🎮"
  }

  // Function to get game color (reduced vibrance)
  const getGameColor = (gameName) => {
    const gameColors = {
      CallOfDuty: isLight ? "from-green-400 to-green-500" : "from-green-700 to-green-800",
      PUBG: isLight ? "from-orange-400 to-red-400" : "from-orange-700 to-red-700",
      BGMI: isLight ? "from-blue-400 to-purple-400" : "from-blue-700 to-purple-700",
      FIFA: isLight ? "from-green-400 to-blue-400" : "from-green-700 to-blue-700",
      Valorant: isLight ? "from-red-400 to-pink-400" : "from-red-700 to-pink-700",
      OverWatch: isLight ? "from-orange-400 to-yellow-400" : "from-orange-700 to-yellow-700",
    }

    return gameColors[gameName] || (isLight ? "from-gray-400 to-gray-500" : "from-gray-700 to-gray-800")
  }

  if (loading) {
    return (
      <div
        className={`min-h-screen ${
          isLight
            ? "bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800"
            : "bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white"
        } relative overflow-hidden`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute top-20 left-10 w-32 h-32 ${
              isLight
                ? "bg-gradient-to-r from-purple-200 to-pink-200"
                : "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
            } rounded-full blur-xl animate-pulse`}
          ></div>
          <div
            className={`absolute top-40 right-20 w-48 h-48 ${
              isLight
                ? "bg-gradient-to-r from-blue-200 to-cyan-200"
                : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10"
            } rounded-full blur-xl animate-pulse delay-1000`}
          ></div>
        </div>

        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div
              className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
                isLight ? "border-purple-600" : "border-purple-500"
              }`}
            ></div>
            <div
              className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
                isLight ? "border-pink-600" : "border-pink-500"
              } absolute top-0 left-0 animate-reverse`}
            ></div>
          </div>
          <p className={`mt-6 ${isLight ? "text-gray-600" : "text-gray-400"} animate-pulse text-lg`}>
            Loading your epic battle statistics...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`min-h-screen ${
          isLight
            ? "bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800"
            : "bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white"
        } relative overflow-hidden`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute top-20 left-10 w-32 h-32 ${
              isLight
                ? "bg-gradient-to-r from-purple-200 to-pink-200"
                : "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
            } rounded-full blur-xl animate-pulse`}
          ></div>
          <div
            className={`absolute top-40 right-20 w-48 h-48 ${
              isLight
                ? "bg-gradient-to-r from-blue-200 to-cyan-200"
                : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10"
            } rounded-full blur-xl animate-pulse delay-1000`}
          ></div>
        </div>

        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${
              isLight
                ? "bg-white/80 backdrop-blur-xl border border-gray-300/50"
                : "bg-black/60 backdrop-blur-xl border border-gray-700/50"
            } rounded-2xl p-8 shadow-2xl max-w-md w-full text-center`}
          >
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className={`text-5xl mb-6 ${isLight ? "text-red-600" : "text-red-400"}`}
            />
            <p className="text-xl mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className={`px-6 py-3 bg-gradient-to-r ${
                isLight
                  ? "from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                  : "from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              } text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
            >
              Return to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${
        isLight
          ? "bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800"
          : "bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white"
      } relative overflow-hidden`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-20 left-10 w-32 h-32 ${
            isLight
              ? "bg-gradient-to-r from-purple-200 to-pink-200"
              : "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
          } rounded-full blur-xl animate-pulse`}
        ></div>
        <div
          className={`absolute top-40 right-20 w-48 h-48 ${
            isLight ? "bg-gradient-to-r from-blue-200 to-cyan-200" : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10"
          } rounded-full blur-xl animate-pulse delay-1000`}
        ></div>
        <div
          className={`absolute bottom-20 left-1/3 w-40 h-40 ${
            isLight
              ? "bg-gradient-to-r from-orange-200 to-red-200"
              : "bg-gradient-to-r from-orange-500/10 to-red-500/10"
          } rounded-full blur-xl animate-pulse delay-2000`}
        ></div>
      </div>

      <Navbar />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Header with User Profile */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1
              className={`text-4xl font-bold bg-gradient-to-r ${
                isLight ? "from-purple-500 via-pink-500 to-red-500" : "from-purple-500 via-pink-500 to-red-500"
              } bg-clip-text text-transparent`}
            >
              My Battle Statistics
            </h1>
            <p className={`text-lg mt-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              Track your tournament performance and domination
            </p>
          </div>
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
              isLight
                ? "bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-purple-300"
                : "bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:bg-gray-700/80 hover:border-purple-500/50"
            }`}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
            <span>Back to Dashboard</span>
          </Link>
        </motion.div>

        {/* Overall Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Tournament Count */}
          <div
            className={`${
              isLight
                ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
                : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
            } rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isLight
                    ? "bg-gradient-to-r from-purple-400 to-pink-400"
                    : "bg-gradient-to-r from-purple-700 to-pink-700"
                } text-white`}
              >
                <FontAwesomeIcon icon={faTrophy} className="text-xl" />
              </div>
              <div>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Tournaments</p>
                <p className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {overallStats.totalTournaments}
                </p>
              </div>
            </div>
          </div>

          {/* Total Matches */}
          <div
            className={`${
              isLight
                ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
                : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
            } rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isLight ? "bg-gradient-to-r from-blue-400 to-cyan-400" : "bg-gradient-to-r from-blue-700 to-cyan-700"
                } text-white`}
              >
                <FontAwesomeIcon icon={faGamepad} className="text-xl" />
              </div>
              <div>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Total Matches</p>
                <p className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {overallStats.totalMatches}
                </p>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div
            className={`${
              isLight
                ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
                : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
            } rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isLight
                    ? "bg-gradient-to-r from-green-400 to-emerald-400"
                    : "bg-gradient-to-r from-green-700 to-emerald-700"
                } text-white`}
              >
                <FontAwesomeIcon icon={getWinRateIcon(overallStats.winRate)} className="text-xl" />
              </div>
              <div>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Win Rate</p>
                <p className={`text-2xl font-bold ${getWinRateColor(overallStats.winRate)}`}>{overallStats.winRate}%</p>
              </div>
            </div>
          </div>

          {/* Best Rank */}
          <div
            className={`${
              isLight
                ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
                : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
            } rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isLight
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                    : "bg-gradient-to-r from-yellow-700 to-orange-700"
                } text-white`}
              >
                <FontAwesomeIcon icon={faMedal} className="text-xl" />
              </div>
              <div>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Best Rank</p>
                <p className={`text-2xl font-bold ${isLight ? "text-amber-600" : "text-amber-400"}`}>
                  {overallStats.bestRank === "1"
                    ? "🥇 1st"
                    : overallStats.bestRank === "2"
                      ? "🥈 2nd"
                      : overallStats.bestRank === "3"
                        ? "🥉 3rd"
                        : overallStats.bestRank !== "N/A"
                          ? `${overallStats.bestRank}th`
                          : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${
            isLight
              ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
              : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
          } rounded-2xl p-4 mb-8`}
        >
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("tournament")}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-3 ${
                activeTab === "tournament"
                  ? `${
                      isLight
                        ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-md"
                        : "bg-gradient-to-r from-purple-700 to-pink-700 text-white shadow-lg"
                    }`
                  : `${
                      isLight
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                    }`
              }`}
            >
              <FontAwesomeIcon icon={faTrophy} className="text-lg" />
              <span>Tournament Stats</span>
            </button>
            <button
              onClick={() => setActiveTab("game")}
              className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-3 ${
                activeTab === "game"
                  ? `${
                      isLight
                        ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-md"
                        : "bg-gradient-to-r from-purple-700 to-pink-700 text-white shadow-lg"
                    }`
                  : `${
                      isLight
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                    }`
              }`}
            >
              <FontAwesomeIcon icon={faGamepad} className="text-lg" />
              <span>Game Stats</span>
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`${
            isLight
              ? "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md"
              : "bg-black/60 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
          } rounded-2xl p-6`}
        >
          {tournamentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                  isLight ? "bg-gray-100" : "bg-gray-800/50"
                }`}
              >
                <FontAwesomeIcon icon={faSkull} className={`text-4xl ${isLight ? "text-gray-400" : "text-gray-500"}`} />
              </motion.div>
              <h3 className={`text-2xl font-bold mb-4 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                No Battle History Found
              </h3>
              <p className={`max-w-md ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                You haven't participated in any tournaments yet. Join a tournament to start tracking your epic gaming
                journey!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/upcoming-tournaments")}
                className={`mt-8 px-8 py-4 bg-gradient-to-r ${
                  isLight
                    ? "from-purple-400 to-pink-400 hover:from-purple-300 hover:to-pink-300"
                    : "from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600"
                } text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-3`}
              >
                <FontAwesomeIcon icon={faRocket} />
                <span>Find Tournaments</span>
              </motion.button>
            </div>
          ) : activeTab === "tournament" ? (
            // Tournament-wise Stats with enhanced UI
            <div className="space-y-6">
              {tournamentStats.map((tournamentData, index) => (
                <motion.div
                  key={tournamentData.tournament.tournament_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`${
                    isLight ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-800/50 border border-gray-700/30"
                  } rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg`}
                >
                  <div
                    className={`p-6 cursor-pointer bg-gradient-to-r ${getGameColor(tournamentData.tournament.GameName)}`}
                    onClick={() => setExpandedTournament(expandedTournament === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                          {getGameIcon(tournamentData.tournament.GameName)}
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white mb-1">
                            {tournamentData.tournament.tournament_Name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-white/80">
                              {new Date(tournamentData.tournament.Event_Start_Time).toLocaleDateString()}
                            </span>
                            <span className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white">
                              {tournamentData.tournament.GameName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/80">Rank:</span>
                            <span className="font-bold text-white">
                              {tournamentData.aggregatedStats.rank === "1"
                                ? "🥇 1st"
                                : tournamentData.aggregatedStats.rank === "2"
                                  ? "🥈 2nd"
                                  : tournamentData.aggregatedStats.rank === "3"
                                    ? "🥉 3rd"
                                    : tournamentData.aggregatedStats.rank !== "N/A"
                                      ? `${tournamentData.aggregatedStats.rank}th`
                                      : "N/A"}
                            </span>
                          </div>
                        </div>
                        <FontAwesomeIcon
                          icon={expandedTournament === index ? faChevronUp : faChevronDown}
                          className="text-white/80 text-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedTournament === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                          {/* Tournament Stats Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <div
                              className={`${
                                isLight
                                  ? "bg-gray-50 border border-gray-200"
                                  : "bg-gray-800/70 border border-gray-700/50"
                              } rounded-xl p-4`}
                            >
                              <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Matches</div>
                              <div className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                                {tournamentData.aggregatedStats.totalGames || 0}
                              </div>
                            </div>
                            <div
                              className={`${
                                isLight
                                  ? "bg-gray-50 border border-gray-200"
                                  : "bg-gray-800/70 border border-gray-700/50"
                              } rounded-xl p-4`}
                            >
                              <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Rank</div>
                              <div className={`text-xl font-bold ${isLight ? "text-amber-600" : "text-amber-400"}`}>
                                {tournamentData.aggregatedStats.rank === "1"
                                  ? "🥇 1st"
                                  : tournamentData.aggregatedStats.rank === "2"
                                    ? "🥈 2nd"
                                    : tournamentData.aggregatedStats.rank === "3"
                                      ? "🥉 3rd"
                                      : tournamentData.aggregatedStats.rank !== "N/A"
                                        ? `${tournamentData.aggregatedStats.rank}th`
                                        : "N/A"}
                              </div>
                            </div>
                          </div>

                          {/* Overall Statistics */}
                          <div className="mb-8">
                            <h4
                              className={`text-lg font-bold mb-4 flex items-center gap-3 ${isLight ? "text-gray-800" : "text-white"}`}
                            >
                              <FontAwesomeIcon
                                icon={faChartBar}
                                className={isLight ? "text-purple-600" : "text-purple-400"}
                              />
                              Overall Performance
                            </h4>
                            {(() => {
                              const statsToShow = Object.entries(tournamentData.aggregatedStats || {}).filter(
                                ([key]) => !["totalGames", "wins", "winRate", "rank", "losses"].includes(key)
                              );
                              return statsToShow.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {statsToShow.map(([key, value]) => (
                                    <div
                                      key={key}
                                      className={`${
                                        isLight
                                          ? "bg-gray-50 border border-gray-200"
                                          : "bg-gray-800/70 border border-gray-700/50"
                                      } rounded-lg p-3`}
                                    >
                                      <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}</div>
                                      <div className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{typeof value === "number" ? value.toLocaleString() : String(value)}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={`text-center py-8 ${isLight ? "text-gray-600" : "text-gray-400"}`}>No matches played yet.</div>
                              );
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            // Game-wise Stats with enhanced UI - Updated to dropdown format
            (() => {
              const gameStats = Object.entries(
                tournamentStats.reduce((acc, tournamentData) => {
                  const gameName = tournamentData.tournament.GameName || "Unknown Game"
                  if (!acc[gameName]) {
                    acc[gameName] = {
                      totalGames: 0,
                      wins: 0,
                      losses: 0,
                      stats: {},
                    }
                  }
                  
                  // Add tournament stats to game totals
                  acc[gameName].totalGames += tournamentData.aggregatedStats.totalGames || 0
                  acc[gameName].wins += tournamentData.aggregatedStats.wins || 0
                  acc[gameName].losses += tournamentData.aggregatedStats.losses || 0
                  
                  // Aggregate game-specific statistics (kills, deaths, etc.)
                  Object.entries(tournamentData.aggregatedStats).forEach(([key, value]) => {
                    if (!['totalGames', 'wins', 'losses', 'winRate', 'rank', 'position'].includes(key)) {
                      if (typeof value === 'number') {
                        if (!acc[gameName].stats[key]) acc[gameName].stats[key] = 0
                        acc[gameName].stats[key] += value
                      }
                    }
                  })

                  // Calculate win rate for this game
                  acc[gameName].winRate = acc[gameName].totalGames > 0 ? 
                    Math.round((acc[gameName].wins / acc[gameName].totalGames) * 100) : 0

                  return acc
                }, {})
              )
              
              const hasAnyStats = gameStats.some(([, data]) => {
                return Object.entries(data.stats).filter(([key]) => 
                  !['losses', 'win', 'wins', 'victory'].includes(key)
                ).length > 0
              })
              
              return hasAnyStats || gameStats.length > 0 ? (
                <div className="space-y-6">
                  {gameStats.map(([gameName, data], index) => (
                    <motion.div
                      key={gameName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`${
                        isLight ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-800/50 border border-gray-700/30"
                      } rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg`}
                    >
                      <div
                        className={`p-6 cursor-pointer bg-gradient-to-r ${getGameColor(gameName)}`}
                        onClick={() => setExpandedTournament(expandedTournament === `game-${index}` ? null : `game-${index}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                              {getGameIcon(gameName)}
                            </div>
                            <div>
                              <h3 className="font-bold text-xl text-white mb-1">{gameName}</h3>
                              <div className="flex items-center gap-3">
                                <span className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white">
                                  {data.totalGames} Matches
                                </span>
                                <span className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white">
                                  {data.winRate}% Win Rate
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/80">Wins:</span>
                                <span className="font-bold text-white">{data.wins}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/80">Losses:</span>
                                <span className="font-bold text-white">{data.losses}</span>
                              </div>
                            </div>
                            <FontAwesomeIcon
                              icon={expandedTournament === `game-${index}` ? faChevronUp : faChevronDown}
                              className="text-white/80 text-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedTournament === `game-${index}` && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                              {/* Game Summary Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div
                                  className={`${
                                    isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/70 border border-gray-700/50"
                                  } rounded-xl p-4`}
                                >
                                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Total Matches</div>
                                  <div className={`text-xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                                    {data.totalGames}
                                  </div>
                                </div>
                                <div
                                  className={`${
                                    isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/70 border border-gray-700/50"
                                  } rounded-xl p-4`}
                                >
                                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Wins</div>
                                  <div className={`text-xl font-bold ${isLight ? "text-green-600" : "text-green-400"}`}>
                                    {data.wins}
                                  </div>
                                </div>
                                <div
                                  className={`${
                                    isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/70 border border-gray-700/50"
                                  } rounded-xl p-4`}
                                >
                                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Losses</div>
                                  <div className={`text-xl font-bold ${isLight ? "text-red-600" : "text-red-400"}`}>
                                    {data.losses}
                                  </div>
                                </div>
                                <div
                                  className={`${
                                    isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/70 border border-gray-700/50"
                                  } rounded-xl p-4`}
                                >
                                  <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>Win Rate</div>
                                  <div className={`text-xl font-bold ${getWinRateColor(data.winRate)}`}>
                                    {data.winRate}%
                                  </div>
                                </div>
                              </div>

                              {/* Detailed Game Stats */}
                              <div className="mb-8">
                                <h4
                                  className={`text-lg font-bold mb-4 flex items-center gap-3 ${isLight ? "text-gray-800" : "text-white"}`}
                                >
                                  <FontAwesomeIcon
                                    icon={faChartBar}
                                    className={isLight ? "text-purple-600" : "text-purple-400"}
                                  />
                                  Detailed Performance Stats
                                </h4>
                                {(() => {
                                  const statsToShow = Object.entries(data.stats).filter(
                                    ([key]) => !['losses', 'win', 'wins', 'victory'].includes(key)
                                  );
                                  return statsToShow.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                      {statsToShow.map(([key, value]) => (
                                        <div
                                          key={key}
                                          className={`${
                                            isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/70 border border-gray-700/50"
                                          } rounded-xl p-4`}
                                        >
                                          <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}
                                          </div>
                                          <div className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                                            {typeof value === "number" ? value.toLocaleString() : String(value)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className={`text-center py-8 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                                      No detailed stats available for this game.
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-16 ${isLight ? "text-gray-600" : "text-gray-400"}`}>No matches played yet.</div>
              )
            })()
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default MyStatistics