"use client"

import { useContext, useEffect, useState, useRef } from "react"
import { ThemeContext } from "../context/ThemeContext"
import Navbar from "../components/navbar"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faXTwitter, faInstagram, faYoutube, faDiscord, faTwitch } from "@fortawesome/free-brands-svg-icons"
import {
  faRocket,
  faTrophy,
  faUsers,
  faShield,
  faBolt,
  faVideo,
  faHeadset,
  faCrown,
  faFire,
  faChevronRight,
  faPlay,
  faBullseye,
  faGem,
  faSkull
} from "@fortawesome/free-solid-svg-icons"
import HeroCarousel from "../components/HeroCarousel"
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import axios from "axios"

const Home = () => {
  const { theme, colors } = useContext(ThemeContext)
  const isLight = theme === "light"
  const navigate = useNavigate()
  const [trendingTournaments, setTrendingTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [activeCard, setActiveCard] = useState(null)
  const [userStats, setUserStats] = useState({ players: 10247, tournaments: 1523, prizes: 847293 })
  const heroRef = useRef(null)

  // Scroll-based animations
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Mouse tracking for 3D effects
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]))
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]))

  // Animated counters
  const [counters, setCounters] = useState({ players: 0, tournaments: 0, prizes: 0 })

  useEffect(() => {
    // Animate counters
    const animateCounter = (key, target) => {
      let current = 0
      const increment = target / 100
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          current = target
          clearInterval(timer)
        }
        setCounters((prev) => ({ ...prev, [key]: Math.floor(current) }))
      }, 20)
    }

    animateCounter("players", userStats.players)
    animateCounter("tournaments", userStats.tournaments)
    animateCounter("prizes", userStats.prizes)
  }, [])

  useEffect(() => {
    // Mouse tracking for 3D effects
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      setMousePosition({ x: clientX, y: clientY })
      mouseX.set(clientX / innerWidth - 0.5)
      mouseY.set(clientY / innerHeight - 0.5)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  useEffect(() => {
    // Fetch tournaments with enhanced error handling
    const fetchTournaments = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/tournaments/upcoming`)
        if (response.data && response.data.data) {
          setTrendingTournaments(response.data.data)
        } else {
          setTrendingTournaments([])
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error)
        setError("Failed to load tournaments")
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const handleTournamentClick = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`)
  }

  const getGameStyle = (gameName) => {
    const gameStyles = isLight
      ? {
          CallOfDuty: {
            color: "from-green-500 to-green-700",
            icon: "🎯",
            bg: "from-green-100 to-green-200",
            shadow: "shadow-green-200",
          },
          PUBG: {
            color: "from-orange-500 to-red-600",
            icon: "🔫",
            bg: "from-orange-100 to-red-200",
            shadow: "shadow-orange-200",
          },
          BGMI: {
            color: "from-blue-500 to-purple-600",
            icon: "🏆",
            bg: "from-blue-100 to-purple-200",
            shadow: "shadow-blue-200",
          },
          FIFA: {
            color: "from-green-400 to-blue-500",
            icon: "⚽",
            bg: "from-green-100 to-blue-200",
            shadow: "shadow-blue-200",
          },
          Valorant: {
            color: "from-red-400 to-pink-500",
            icon: "💥",
            bg: "from-red-100 to-pink-200",
            shadow: "shadow-pink-200",
          },
          OverWatch: {
            color: "from-orange-400 to-yellow-500",
            icon: "🎮",
            bg: "from-orange-100 to-yellow-200",
            shadow: "shadow-yellow-200",
          },
        }
      : {
          CallOfDuty: {
            color: "from-green-600 to-green-800",
            icon: "🎯",
            bg: "from-green-500/10 to-green-600/10",
            shadow: "shadow-green-500/20",
          },
          PUBG: {
            color: "from-orange-600 to-red-700",
            icon: "🔫",
            bg: "from-orange-500/10 to-red-600/10",
            shadow: "shadow-orange-500/20",
          },
          BGMI: {
            color: "from-blue-600 to-purple-700",
            icon: "🏆",
            bg: "from-blue-500/10 to-purple-600/10",
            shadow: "shadow-purple-500/20",
          },
          FIFA: {
            color: "from-green-500 to-blue-600",
            icon: "⚽",
            bg: "from-green-500/10 to-blue-600/10",
            shadow: "shadow-blue-500/20",
          },
          Valorant: {
            color: "from-red-500 to-pink-600",
            icon: "💥",
            bg: "from-red-500/10 to-pink-600/10",
            shadow: "shadow-pink-500/20",
          },
          OverWatch: {
            color: "from-orange-500 to-yellow-600",
            icon: "🎮",
            bg: "from-orange-500/10 to-yellow-600/10",
            shadow: "shadow-yellow-500/20",
          },
        }

    return (
      gameStyles[gameName] ||
      (isLight
        ? { color: "from-gray-400 to-gray-600", icon: "🎮", bg: "from-gray-100 to-gray-200", shadow: "shadow-gray-200" }
        : {
            color: "from-gray-600 to-gray-800",
            icon: "🎮",
            bg: "from-gray-500/10 to-gray-600/10",
            shadow: "shadow-gray-500/20",
          })
    )
  }

  // Theme-based styles
  const bgColor = isLight
    ? "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    : "bg-gradient-to-br from-gray-900 via-black to-gray-900"

  const textColor = isLight ? "text-gray-800" : "text-white"
  const textMutedColor = isLight ? "text-gray-600" : "text-gray-300"
  const borderColor = isLight ? "border-gray-200" : "border-gray-700/50"
  const cardBg = isLight ? "bg-white/80 backdrop-blur-sm" : "bg-black/60 backdrop-blur-xl"
  const cardBorder = isLight ? "border-gray-200/50" : "border-gray-700/50"

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${bgColor} relative`}>
      {/* Enhanced 3D Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${isLight ? "bg-purple-300/30" : "bg-purple-500/20"}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Large background orbs with 3D effect */}
        <motion.div
          className={`absolute top-20 left-10 w-64 h-64 rounded-full blur-3xl ${
            isLight
              ? "bg-gradient-to-r from-purple-200 to-pink-200"
              : "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
          }`}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            transform: `translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px, 0)`,
          }}
        />

        <motion.div
          className={`absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl ${
            isLight ? "bg-gradient-to-r from-blue-200 to-cyan-200" : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10"
          }`}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            transform: `translate3d(${mousePosition.x * -0.03}px, ${mousePosition.y * -0.03}px, 0)`,
          }}
        />

        <motion.div
          className={`absolute bottom-20 left-1/3 w-56 h-56 rounded-full blur-3xl ${
            isLight
              ? "bg-gradient-to-r from-orange-200 to-red-200"
              : "bg-gradient-to-r from-orange-500/10 to-red-500/10"
          }`}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 18,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            transform: `translate3d(${mousePosition.x * 0.025}px, ${mousePosition.y * 0.025}px, 0)`,
          }}
        />
      </div>

      {/* Interactive cursor follower */}
      <motion.div
        className={`fixed w-8 h-8 rounded-full pointer-events-none z-50 mix-blend-difference ${
          isLight ? "bg-black" : "bg-white"
        }`}
        style={{
          left: mousePosition.x - 16,
          top: mousePosition.y - 16,
        }}
        animate={{
          scale: isHovering ? 2 : 1,
          opacity: isHovering ? 0.8 : 0.5,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 28,
        }}
      />

      {/* Enhanced Hero Section with 3D Effects */}
      <motion.div ref={heroRef} className="min-h-screen relative z-10" style={{ y, opacity }}>
        <Navbar />

        <div className="container mx-auto px-4 pt-32 flex flex-col items-center">
          {/* 3D Hero Content */}
          <motion.div
            className="text-center mb-16 perspective-1000"
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full mb-8 ${
                isLight
                  ? "bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200"
                  : "bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30"
              }`}
            >
              <FontAwesomeIcon icon={faBolt} className="text-yellow-500 animate-pulse" />
              <span className={`font-bold ${isLight ? "text-purple-800" : "text-purple-300"}`}>
                🚀 EPIC GAMING AWAITS
              </span>
              <FontAwesomeIcon icon={faBolt} className="text-yellow-500 animate-pulse" />
            </motion.div>

            {/* Main title with 3D effect */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`text-5xl md:text-7xl lg:text-8xl font-bold mb-6 ${textColor}`}
              style={{ transform: "translateZ(50px)" }}
            >
              Welcome to{" "}
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
                BookMyGame
              </span>
            </motion.h1>

            {/* Subtitle with typewriter effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mb-8"
              style={{ transform: "translateZ(30px)" }}
            >
              <p className={`text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed ${textMutedColor}`}>
                🎮 Join the ultimate gaming tournaments and{" "}
                <span className={`font-bold ${isLight ? "text-purple-600" : "text-yellow-400"}`}>
                  claim your place among legends
                </span>
                . Epic battles, massive prizes, infinite glory!
              </p>
            </motion.div>

            {/* Enhanced CTA buttons with 3D hover effects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
              style={{ transform: "translateZ(40px)" }}
            >
              <motion.button
                onClick={() => navigate("/upcoming-tournaments")}
                className="group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-4 shadow-2xl overflow-hidden"
                whileHover={{
                  scale: 1.05,
                  rotateX: "5deg",
                  rotateY: "5deg",
                  boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "0%" }}
                  transition={{ duration: 0.3 }}
                />
                <FontAwesomeIcon icon={faRocket} className="text-2xl group-hover:animate-bounce relative z-10" />
                <span className="relative z-10">JOIN THE BATTLE</span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="group-hover:translate-x-2 transition-transform relative z-10"
                />
              </motion.button>

              <motion.button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    navigate('/upcoming-tournaments');
                  } else {
                    navigate('/login');
                  }
                }}
                className={`group relative px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-4 border-2 ${
                  isLight
                    ? "border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white"
                    : "border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                } backdrop-blur-sm overflow-hidden`}
                whileHover={{
                  scale: 1.05,
                  rotateX: "-5deg",
                  rotateY: "-5deg",
                  boxShadow: isLight
                    ? "0 25px 50px -12px rgba(147, 51, 234, 0.3)"
                    : "0 25px 50px -12px rgba(147, 51, 234, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "0%" }}
                  transition={{ duration: 0.3 }}
                />
                <FontAwesomeIcon icon={faPlay} className="text-xl relative z-10" />
                <span className="relative z-10">GET STARTED</span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* 3D Floating Stats with real-time counters */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
          >
            {[
              { label: "Active Warriors", value: counters.players, icon: faUsers, color: "yellow" },
              { label: "Epic Tournaments", value: counters.tournaments, icon: faTrophy, color: "purple" },
              { label: "Prizes Won", value: `$${counters.prizes.toLocaleString()}`, icon: faGem, color: "green" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className={`${cardBg} ${cardBorder} border rounded-2xl p-8 text-center shadow-2xl`}
                whileHover={{
                  scale: 1.05,
                  rotateY: "10deg",
                  rotateX: "5deg",
                }}
                style={{ transformStyle: "preserve-3d" }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <motion.div
                  className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    stat.color === "yellow"
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                      : stat.color === "purple"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                  }`}
                  whileHover={{ rotateY: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <FontAwesomeIcon icon={stat.icon} className="text-2xl text-white" />
                </motion.div>
                <motion.div
                  className={`text-3xl font-bold mb-2 ${textColor}`}
                  style={{ transform: "translateZ(20px)" }}
                >
                  {typeof stat.value === "string" ? stat.value : stat.value.toLocaleString()}
                </motion.div>
                <div className={`text-sm ${textMutedColor}`} style={{ transform: "translateZ(10px)" }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced Hero Carousel with 3D perspective */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="w-full max-w-6xl mx-auto mt-16 rounded-3xl overflow-hidden shadow-2xl"
            whileHover={{
              scale: 1.02,
              rotateX: "2deg",
              rotateY: "2deg",
            }}
            style={{ transformStyle: "preserve-3d" }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <HeroCarousel />
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Trending Tournaments with 3D cards */}
      <div className="py-20 px-4 relative z-10">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full mb-6 ${
                isLight
                  ? "bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200"
                  : "bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30"
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <FontAwesomeIcon icon={faFire} className="text-orange-500 animate-pulse" />
              <span className={`font-bold ${isLight ? "text-orange-800" : "text-orange-300"}`}>🔥 HOTTEST BATTLES</span>
              <FontAwesomeIcon icon={faFire} className="text-orange-500 animate-pulse" />
            </motion.div>

            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${textColor}`}>
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                Trending Tournaments
              </span>
            </h2>
            <p className={`text-xl max-w-3xl mx-auto ${textMutedColor}`}>
              Join the most epic battles happening right now and claim your victory! 🏆
            </p>
          </motion.div>

          {/* 3D Tournament Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {loading ? (
              // Enhanced 3D loading skeletons
              [...Array(6)].map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`${cardBg} ${cardBorder} border rounded-2xl p-6 shadow-2xl h-96`}
                  whileHover={{
                    scale: 1.02,
                    rotateY: "5deg",
                    rotateX: "5deg",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="animate-pulse">
                    <div className={`h-32 rounded-xl mb-4 ${isLight ? "bg-gray-200" : "bg-gray-700"}`}></div>
                    <div className={`h-6 rounded mb-2 ${isLight ? "bg-gray-200" : "bg-gray-700"}`}></div>
                    <div className={`h-4 rounded mb-4 ${isLight ? "bg-gray-200" : "bg-gray-700"}`}></div>
                    <div className={`h-12 rounded ${isLight ? "bg-gray-200" : "bg-gray-700"}`}></div>
                  </div>
                </motion.div>
              ))
            ) : error ? (
              // Enhanced 3D error state
              <div className="col-span-full text-center py-20">
                <motion.div
                  className={`max-w-md mx-auto p-8 rounded-2xl ${
                    isLight ? "bg-red-50 border border-red-200" : "bg-red-900/20 border border-red-800/30"
                  } shadow-2xl`}
                  whileHover={{
                    scale: 1.05,
                    rotateY: "5deg",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <FontAwesomeIcon
                    icon={faSkull}
                    className={`text-6xl mb-4 ${isLight ? "text-red-500" : "text-red-400"}`}
                  />
                  <p className={`text-2xl font-bold mb-2 ${isLight ? "text-red-600" : "text-red-400"}`}>
                    🚫 Battle Loading Failed
                  </p>
                  <p className={`mb-6 ${textMutedColor}`}>The tournament arena is temporarily unavailable</p>
                  <motion.button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-500 hover:to-red-600 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Retry Connection
                  </motion.button>
                </motion.div>
              </div>
            ) : trendingTournaments.length > 0 ? (
              // Enhanced 3D tournament cards
              trendingTournaments
                .slice(0, 6)
                .map((tournament, index) => {
                  const gameStyle = getGameStyle(tournament.GameName)

                  return (
                    <motion.div
                      key={tournament.tournament_id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      onClick={() => handleTournamentClick(tournament.tournament_id)}
                      className={`group cursor-pointer transition-all duration-500 rounded-2xl overflow-hidden ${cardBg} ${cardBorder} border shadow-2xl ${gameStyle.shadow}`}
                      whileHover={{
                        scale: 1.05,
                        rotateY: "10deg",
                        rotateX: "5deg",
                        boxShadow: isLight
                          ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                          : "0 25px 50px -12px rgba(147, 51, 234, 0.5)",
                      }}
                      style={{ transformStyle: "preserve-3d" }}
                      onMouseEnter={() => {
                        setIsHovering(true)
                        setActiveCard(tournament.tournament_id)
                      }}
                      onMouseLeave={() => {
                        setIsHovering(false)
                        setActiveCard(null)
                      }}
                    >
                      {/* 3D Tournament Header */}
                      <div
                        className={`p-6 bg-gradient-to-r ${gameStyle.color} relative overflow-hidden`}
                        style={{ transform: "translateZ(20px)" }}
                      >
                        {/* Animated particles for active card */}
                        {activeCard === tournament.tournament_id && (
                          <>
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white/60 rounded-full"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                  y: [0, -20, 0],
                                  opacity: [0, 1, 0],
                                  scale: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  delay: i * 0.2,
                                }}
                              />
                            ))}
                          </>
                        )}

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <motion.span
                                className="text-3xl"
                                whileHover={{ scale: 1.2, rotate: 360 }}
                                transition={{ duration: 0.3 }}
                              >
                                {gameStyle.icon}
                              </motion.span>
                              <span className="font-bold text-white text-lg">{tournament.GameName}</span>
                            </div>
                            <motion.div
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                tournament.Status === "Accepting Registrations"
                                  ? "bg-green-500 text-white animate-pulse"
                                  : "bg-yellow-500 text-black"
                              }`}
                              whileHover={{ scale: 1.1 }}
                            >
                              {tournament.Status === "Accepting Registrations" ? "🟢 LIVE" : "🟡 SOON"}
                            </motion.div>
                          </div>

                          <h3 className="font-bold text-xl text-white mb-2 group-hover:text-yellow-300 transition-colors">
                            {tournament.tournament_Name}
                          </h3>
                        </div>
                      </div>

                      {/* 3D Tournament Details */}
                      <div className="p-6 space-y-4" style={{ transform: "translateZ(10px)" }}>
                        {/* Prize Pool with 3D effect */}
                        <motion.div
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            isLight
                              ? "bg-green-50 border border-green-100"
                              : "bg-green-900/10 border border-green-700/20"
                          }`}
                          whileHover={{ scale: 1.02, rotateX: "5deg" }}
                        >
                          <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 text-xl" />
                            <span className={textMutedColor}>Prize Pool</span>
                          </div>
                          <motion.span
                            className={`text-2xl font-bold ${isLight ? "text-green-600" : "text-green-400"}`}
                            whileHover={{ scale: 1.1 }}
                          >
                            ${Number.parseFloat(tournament.Prize_Amount).toLocaleString()}
                          </motion.span>
                        </motion.div>

                        {/* Event Date */}
                        <motion.div
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isLight ? "bg-gray-50 border border-gray-100" : "bg-gray-800/40"
                          }`}
                          whileHover={{ scale: 1.02, rotateX: "3deg" }}
                        >
                          <FontAwesomeIcon icon={faBullseye} className={isLight ? "text-blue-600" : "text-blue-400"} />
                          <div>
                            <span className={`text-sm ${textMutedColor}`}>Battle Date</span>
                            <div className={`font-semibold ${textColor}`}>
                              {formatDate(tournament.Event_Start_Time)}
                            </div>
                          </div>
                        </motion.div>

                        {/* Team Size */}
                        <motion.div
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isLight ? "bg-gray-50 border border-gray-100" : "bg-gray-800/40"
                          }`}
                          whileHover={{ scale: 1.02, rotateX: "3deg" }}
                        >
                          <FontAwesomeIcon icon={faUsers} className={isLight ? "text-purple-600" : "text-purple-400"} />
                          <div>
                            <span className={`text-sm ${textMutedColor}`}>Format</span>
                            <div className={`font-semibold ${textColor}`}>
                              {tournament.Team_Size_Limit === 1
                                ? "👤 Solo Battle"
                                : `👥 Teams of ${tournament.Team_Size_Limit}`}
                            </div>
                          </div>
                        </motion.div>

                        {/* Enhanced 3D Join Button */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTournamentClick(tournament.tournament_id)
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg overflow-hidden relative"
                          whileHover={{
                            scale: 1.05,
                            rotateX: "5deg",
                            boxShadow: "0 10px 25px -5px rgba(147, 51, 234, 0.5)",
                          }}
                          whileTap={{ scale: 0.95 }}
                          style={{ transform: "translateZ(15px)" }}
                        >
                          {/* Animated background */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500"
                            initial={{ x: "-100%" }}
                            whileHover={{ x: "0%" }}
                            transition={{ duration: 0.3 }}
                          />
                          <FontAwesomeIcon icon={faShield} className="animate-pulse relative z-10" />
                          <span className="relative z-10">VIEW BATTLE</span>
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            className="group-hover:translate-x-1 transition-transform relative z-10"
                          />
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })
            ) : (
              // Enhanced 3D no tournaments state
              <div className="col-span-full text-center py-20">
                <motion.div
                  className={`max-w-md mx-auto p-8 rounded-2xl ${
                    isLight ? "bg-gray-50 border border-gray-200" : "bg-gray-800/30 border border-gray-700/30"
                  } shadow-2xl`}
                  whileHover={{
                    scale: 1.05,
                    rotateY: "5deg",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <FontAwesomeIcon
                    icon={faTrophy}
                    className={`text-6xl mb-6 ${isLight ? "text-gray-400" : "text-gray-500"} animate-pulse`}
                  />
                  <h3 className={`text-2xl font-bold mb-4 ${textColor}`}>🏆 No Epic Battles Found</h3>
                  <p className={`mb-6 ${textMutedColor}`}>New tournaments are being forged in the arena...</p>
                  <motion.button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Check Again
                  </motion.button>
                </motion.div>
              </div>
            )}
          </div>

          {/* Enhanced 3D View All Button */}
          {trendingTournaments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <motion.button
                onClick={() => navigate("/upcoming-tournaments")}
                className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-12 py-4 rounded-2xl font-bold text-xl transition-all duration-300 flex items-center gap-4 mx-auto shadow-2xl overflow-hidden relative"
                whileHover={{
                  scale: 1.05,
                  rotateX: "5deg",
                  rotateY: "5deg",
                  boxShadow: "0 25px 50px -12px rgba(147, 51, 234, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "0%" }}
                  transition={{ duration: 0.3 }}
                />
                <FontAwesomeIcon icon={faRocket} className="group-hover:animate-bounce relative z-10" />
                <span className="relative z-10">VIEW ALL BATTLES</span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="group-hover:translate-x-2 transition-transform relative z-10"
                />
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Enhanced 3D Features Section */}
      <div className={`py-20 px-4 relative z-10 ${isLight ? "bg-gray-50/50" : "bg-gray-900/50"}`}>
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full mb-6 ${
                isLight
                  ? "bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200"
                  : "bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30"
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <FontAwesomeIcon icon={faCrown} className="text-purple-500 animate-pulse" />
              <span className={`font-bold ${isLight ? "text-purple-800" : "text-purple-300"}`}>
                👑 LEGENDARY FEATURES
              </span>
              <FontAwesomeIcon icon={faCrown} className="text-purple-500 animate-pulse" />
            </motion.div>

            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${textColor}`}>
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
                Why Choose Us
              </span>
            </h2>
            <p className={`text-xl max-w-3xl mx-auto ${textMutedColor}`}>
              🚀 Experience the ultimate gaming platform built for champions!
            </p>
          </motion.div>

          {/* Enhanced 3D Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: faHeadset,
                title: "24/7 Support",
                desc: "Round-the-clock warrior assistance",
                color: isLight ? "from-purple-500 to-pink-500" : "from-purple-600 to-pink-600",
                bgColor: isLight ? "bg-purple-100" : "bg-purple-900/20",
                emoji: "🛡️",
              },
              {
                icon: faShield,
                title: "Secure Payments",
                desc: "Military-grade transaction security",
                color: isLight ? "from-blue-500 to-cyan-500" : "from-blue-600 to-cyan-600",
                bgColor: isLight ? "bg-blue-100" : "bg-blue-900/20",
                emoji: "🔒",
              },
              {
                icon: faBolt,
                title: "Instant Matchmaking",
                desc: "Lightning-fast opponent matching",
                color: isLight ? "from-yellow-500 to-orange-500" : "from-yellow-600 to-orange-600",
                bgColor: isLight ? "bg-yellow-100" : "bg-yellow-900/20",
                emoji: "⚡",
              },
              {
                icon: faVideo,
                title: "Live Streaming",
                desc: "Broadcast your epic victories",
                color: isLight ? "from-red-500 to-pink-500" : "from-red-600 to-pink-600",
                bgColor: isLight ? "bg-red-100" : "bg-red-900/20",
                emoji: "📺",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group ${cardBg} ${cardBorder} border rounded-2xl p-8 text-center shadow-2xl`}
                whileHover={{
                  scale: 1.05,
                  rotateY: "10deg",
                  rotateX: "5deg",
                  boxShadow: isLight
                    ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                    : "0 25px 50px -12px rgba(147, 51, 234, 0.5)",
                }}
                style={{ transformStyle: "preserve-3d" }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* 3D Icon */}
                <motion.div
                  className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg`}
                  whileHover={{
                    rotateY: "360deg",
                    scale: 1.1,
                  }}
                  transition={{ duration: 0.6 }}
                  style={{ transform: "translateZ(30px)" }}
                >
                  <FontAwesomeIcon icon={feature.icon} className="text-3xl text-white" />
                </motion.div>

                {/* Content */}
                <div style={{ transform: "translateZ(20px)" }}>
                  <h3 className={`text-xl font-bold mb-4 flex items-center justify-center gap-2 ${textColor}`}>
                    <span>{feature.emoji}</span>
                    <span>{feature.title}</span>
                  </h3>
                  <p className={`${textMutedColor} leading-relaxed`}>{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced 3D Footer */}
      <footer
        className={`py-16 px-4 relative z-10 ${isLight ? "bg-white border-t border-gray-200" : "bg-gray-900 border-t border-gray-800"}`}
      >
        <div className="container mx-auto">
          {/* Animated divider */}
          <motion.div
            className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-16"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand section with 3D effect */}
            <motion.div
              className="md:col-span-2"
              whileHover={{ scale: 1.02 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <h3 className={`text-3xl font-bold mb-4 ${textColor}`} style={{ transform: "translateZ(20px)" }}>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  BookMyGame
                </span>
              </h3>
              <p className={`mb-6 max-w-md ${textMutedColor}`} style={{ transform: "translateZ(10px)" }}>
                🚀 The ultimate gaming tournament platform where legends are born and champions rise!
              </p>

              {/* 3D Social Links */}
              <div className="flex space-x-4" style={{ transform: "translateZ(15px)" }}>
                {[
                  { icon: faXTwitter, color: "hover:text-blue-400" },
                  { icon: faDiscord, color: "hover:text-purple-400" },
                  { icon: faTwitch, color: "hover:text-purple-500" },
                  { icon: faInstagram, color: "hover:text-pink-400" },
                  { icon: faYoutube, color: "hover:text-red-400" },
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isLight
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                        : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
                    } ${cardBorder} border backdrop-blur-sm ${social.color}`}
                    whileHover={{
                      scale: 1.1,
                      rotateY: "15deg",
                      rotateX: "15deg",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <FontAwesomeIcon icon={social.icon} className="text-xl" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Navigation sections with 3D hover effects */}
            {[
              { title: "🏢 Company", items: ["About Us", "Careers", "News", "Partners"] },
              { title: "📚 Resources", items: ["Support", "Community", "Blog", "API"] },
              { title: "⚖️ Legal", items: ["Privacy Policy", "Terms of Service", "Code of Conduct", "Refund Policy"] },
            ].map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                className="text-center lg:text-left"
                whileHover={{ scale: 1.02 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <h4 className={`text-xl font-bold mb-6 ${textColor}`} style={{ transform: "translateZ(15px)" }}>
                  {section.title}
                </h4>
                <div className="space-y-3" style={{ transform: "translateZ(10px)" }}>
                  {section.items.map((item, itemIndex) => (
                    <motion.a
                      key={itemIndex}
                      href="#"
                      className={`block transition-colors cursor-pointer ${
                        isLight ? "text-gray-600 hover:text-purple-600" : "text-gray-300 hover:text-purple-400"
                      }`}
                      whileHover={{
                        scale: 1.05,
                        x: 5,
                      }}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      {item}
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom footer with 3D effect */}
          <motion.div
            className={`mt-16 pt-8 border-t ${isLight ? "border-gray-200" : "border-gray-800"} text-center`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <p className={`${isLight ? "text-gray-500" : "text-gray-400"}`}>
              © {new Date().getFullYear()} BookMyGame. All rights reserved. 🎮 Built for champions, by champions.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}

export default Home
