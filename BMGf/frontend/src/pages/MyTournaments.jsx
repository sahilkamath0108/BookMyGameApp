import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faUsers,
  faExclamationTriangle,
  faCrown,
  faUser,
  faGamepad,
  faCalendarAlt,
  faMoneyBillWave,
  faArrowLeft,
  faChartLine,
  faComments,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
// Currency formatting function
const formatCurrency = (amount, currency = '') => {
  const numericAmount = Number.parseFloat(amount || 0);
  const formatted = numericAmount.toFixed(2);
  return currency ? `${formatted} ${currency}` : formatted;
};

const MyTournaments = () => {
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [participatedTournaments, setParticipatedTournaments] = useState([]);
  const [hostedTournaments, setHostedTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('participated'); // New state

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchTournaments = async () => {
      try {
        const [participatedRes, hostedRes] = await Promise.all([
          axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/tournaments/user/my-tournaments`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          axios.get(
            `${process.env.REACT_APP_BACKEND_URL}api/tournaments/user/hosted-tournaments`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

        if (participatedRes.data && participatedRes.data.data) {
          setParticipatedTournaments(participatedRes.data.data);
        } else {
          setParticipatedTournaments([]);
        }

        if (
          hostedRes.data &&
          hostedRes.data.data &&
          hostedRes.data.data.tournaments
        ) {
          setHostedTournaments(hostedRes.data.data.tournaments);
        } else {
          setHostedTournaments([]);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setError('Error loading tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [navigate]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'leader':
        return (
          <FontAwesomeIcon
            icon={faCrown}
            className="text-yellow-500"
            title="Team Leader"
          />
        );
      case 'member':
        return (
          <FontAwesomeIcon
            icon={faUsers}
            className="text-blue-500"
            title="Team Member"
          />
        );
      case 'participant':
        return (
          <FontAwesomeIcon
            icon={faUser}
            className="text-green-500"
            title="Single Player"
          />
        );
      case 'super_admin':
        return (
          <FontAwesomeIcon
            icon={faCrown}
            className="text-purple-500"
            title="Tournament Owner"
          />
        );
      case 'temp_admin':
        return (
          <FontAwesomeIcon
            icon={faCrown}
            className="text-blue-500"
            title="Tournament Admin"
          />
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepting Registrations':
        return (
          <span className={`${isLight 
            ? "bg-gradient-to-r from-green-500 to-emerald-600" 
            : "bg-gradient-to-r from-green-500 to-emerald-600"} text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md`}>
            {status}
          </span>
        );
      case 'Registrations Closed':
        return (
          <span className={`${isLight 
            ? "bg-gradient-to-r from-yellow-500 to-orange-600" 
            : "bg-gradient-to-r from-yellow-500 to-orange-600"} text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md`}>
            {status}
          </span>
        );
      case 'In Progress':
        return (
          <span className={`${isLight 
            ? "bg-gradient-to-r from-blue-500 to-cyan-600" 
            : "bg-gradient-to-r from-blue-500 to-cyan-600"} text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md`}>
            {status}
          </span>
        );
      case 'Ended':
      default:
        return (
          <span className={`${isLight 
            ? "bg-gradient-to-r from-gray-500 to-gray-700" 
            : "bg-gradient-to-r from-gray-500 to-gray-700"} text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md`}>
            {status}
          </span>
        );
    }
  };

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
          <p className={`mt-6 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading your tournaments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${isLight 
            ? 'from-purple-600 via-pink-600 to-red-600' 
            : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-8`}>
            My Tournaments
          </h1>
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center py-16`}>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className={`${isLight ? 'text-red-600' : 'text-red-400'} text-5xl mb-4`}
            />
            <p className="text-xl mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-6 py-3 bg-gradient-to-r ${isLight 
                ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare the tournaments to display based on active tab
  const renderTournaments = () => {
    if (activeTab === 'participated') {
      if (participatedTournaments.length === 0) {
        return (
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center py-16`}>
            <FontAwesomeIcon
              icon={faTrophy}
              className={`${isLight ? 'text-gray-400' : 'text-gray-500'} text-6xl mb-6`}
            />
            <p className={`text-xl ${isLight ? 'text-gray-700' : 'text-gray-300'} mb-6 font-semibold`}>
              You haven't joined any tournaments yet
            </p>
            <button
              onClick={() => navigate('/upcoming-tournaments')}
              className={`px-6 py-3 bg-gradient-to-r ${isLight 
                ? 'from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400' 
                : 'from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'} text-white rounded-xl font-bold shadow-lg hover:shadow-red-500/25 flex items-center gap-3 transition-all duration-300 transform hover:scale-105`}
            >
              <FontAwesomeIcon icon={faGamepad} />
              <span>Browse Tournaments</span>
            </button>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {participatedTournaments.map((item) => (
            <div
              key={item.tournament.tournament_id}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-purple-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-purple-500/50'} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
              onClick={() => navigate(`/tournaments/${item.tournament.tournament_id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-xl font-semibold mb-1 bg-gradient-to-r ${isLight 
                    ? 'from-purple-600 to-pink-600' 
                    : 'from-purple-400 to-pink-400'} bg-clip-text text-transparent`}>
                    {item.tournament.tournament_Name}
                  </h2>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {item.tournament.GameName}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.userRole === 'leader' 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black' 
                      : item.userRole === 'member' 
                        ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
                        : 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                  }`}>
                    {getRoleIcon(item.userRole)}
                  </div>
                  <span className={`text-xs mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {item.userRole === 'leader' 
                      ? 'Squad Leader' 
                      : item.userRole === 'member' 
                        ? 'Squad Member' 
                        : 'Solo Warrior'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                {getStatusBadge(item.tournament.Status)}
              </div>

              <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} pt-4 mt-2`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
                    Start:
                  </span>
                  <span className={`text-sm ${isLight ? 'text-gray-800 font-medium' : 'text-gray-200 font-medium'}`}>
                    {formatDate(item.tournament.Event_Start_Time)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
                    End:
                  </span>
                  <span className={`text-sm ${isLight ? 'text-gray-800 font-medium' : 'text-gray-200 font-medium'}`}>
                    {formatDate(item.tournament.Event_End_Time)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-xs" />
                    Prize:
                  </span>
                  <span className={`text-sm font-medium ${isLight 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                    : 'bg-gradient-to-r from-green-400 to-emerald-400'} bg-clip-text text-transparent`}>
                    ${item.tournament.Prize_Amount}
                  </span>
                </div>
              </div>

              <div className="flex justify-between mt-4 gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tournaments/${item.tournament.tournament_id}`);
                  }}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${isLight 
                    ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                    : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2 transition-all duration-300`}
                >
                  <FontAwesomeIcon icon={faTrophy} />
                  <span>Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tournament-stats/${item.tournament.tournament_id}`);
                  }}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${isLight 
                    ? 'from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' 
                    : 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2 transition-all duration-300`}
                >
                  <FontAwesomeIcon icon={faChartLine} />
                  <span>Stats</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      // hosted tab
      if (hostedTournaments.length === 0) {
        return (
          <div className={`${isLight 
            ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
            : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center py-16`}>
            <FontAwesomeIcon
              icon={faCrown}
              className={`${isLight ? 'text-yellow-500' : 'text-yellow-600'} text-6xl mb-6`}
            />
            <p className={`text-xl ${isLight ? 'text-gray-700' : 'text-gray-300'} mb-6 font-semibold`}>
              You haven't hosted any tournaments yet
            </p>
            <button
              onClick={() => navigate('/create-tournament')}
              className={`px-6 py-3 bg-gradient-to-r ${isLight 
                ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 flex items-center gap-3 transition-all duration-300 transform hover:scale-105`}
            >
              <FontAwesomeIcon icon={faUserShield} />
              <span>Create Tournament</span>
            </button>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostedTournaments.map((tournament) => (
            <div
              key={tournament.tournament_id}
              className={`${isLight 
                ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50 hover:border-blue-500/50' 
                : 'bg-black/60 backdrop-blur-xl border border-gray-700/50 hover:border-blue-500/50'} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}
              onClick={() => navigate(`/tournaments/${tournament.tournament_id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-xl font-semibold mb-1 bg-gradient-to-r ${isLight 
                    ? 'from-blue-600 to-cyan-600' 
                    : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent`}>
                    {tournament.tournament_Name}
                  </h2>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {tournament.GameName}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tournament.adminRole === 'super_admin' 
                      ? 'bg-gradient-to-r from-purple-400 to-indigo-400 text-white' 
                      : 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white'
                  } ${!tournament.isActiveAdmin ? 'opacity-50' : ''}`}>
                    {getRoleIcon(tournament.adminRole)}
                  </div>
                  <span className={`text-xs mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {tournament.adminRole === 'super_admin' ? 'Owner' : 'Admin'}
                    {!tournament.isActiveAdmin && ' (Expired)'}
                  </span>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                {getStatusBadge(tournament.Status)}
                {!tournament.is_approved && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold py-2 px-3 rounded-full ${isLight 
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600" 
                      : "bg-gradient-to-r from-yellow-500 to-orange-600"} text-white animate-pulse`}>
                      ⏳ Waiting for Approval
                    </span>
                  </div>
                )}
              </div>

              <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} pt-4 mt-2`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
                    Start:
                  </span>
                  <span className={`text-sm ${isLight ? 'text-gray-800 font-medium' : 'text-gray-200 font-medium'}`}>
                    {formatDate(tournament.Event_Start_Time)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
                    End:
                  </span>
                  <span className={`text-sm ${isLight ? 'text-gray-800 font-medium' : 'text-gray-200 font-medium'}`}>
                    {formatDate(tournament.Event_End_Time)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-xs" />
                    Prize:
                  </span>
                  <span className={`text-sm font-medium ${isLight 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                    : 'bg-gradient-to-r from-green-400 to-emerald-400'} bg-clip-text text-transparent`}>
                                                  {formatCurrency(tournament.Prize_Amount, tournament.Currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between mt-4 gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tournaments/${tournament.tournament_id}`);
                  }}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${isLight 
                    ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                    : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 transition-all duration-300 ${!tournament.isActiveAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!tournament.isActiveAdmin}
                >
                  <FontAwesomeIcon icon={faUserShield} />
                  <span>{tournament.isActiveAdmin ? 'Manage' : 'View'}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tournament-posts/${tournament.tournament_id}`);
                  }}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${isLight 
                    ? 'from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' 
                    : 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'} text-white rounded-xl font-semibold shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 transition-all duration-300`}
                >
                  <FontAwesomeIcon icon={faComments} />
                  <span>Posts</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

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
          onClick={() => navigate("/dashboard")}
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
            : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl mb-8 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Dashboard</span>
        </button>

        <h1 className={`text-4xl font-bold bg-gradient-to-r ${isLight 
          ? 'from-purple-600 via-pink-600 to-red-600' 
          : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-6`}>
          My Tournaments
        </h1>

        {/* Toggle Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('participated')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'participated' 
                ? isLight 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/25' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-purple-500/25'
                : isLight
                  ? 'bg-white/40 backdrop-blur-sm border border-gray-300/50 text-gray-700 hover:bg-white/60' 
                  : 'bg-black/40 backdrop-blur-sm border border-gray-700/50 text-gray-300 hover:bg-black/60'
            }`}
          >
            <FontAwesomeIcon icon={faGamepad} />
            <span>Participated</span>
          </button>
          <button
            onClick={() => setActiveTab('hosted')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'hosted' 
                ? isLight 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-blue-500/25' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-blue-500/25'
                : isLight
                  ? 'bg-white/40 backdrop-blur-sm border border-gray-300/50 text-gray-700 hover:bg-white/60' 
                  : 'bg-black/40 backdrop-blur-sm border border-gray-700/50 text-gray-300 hover:bg-black/60'
            }`}
          >
            <FontAwesomeIcon icon={faCrown} />
            <span>Hosted</span>
          </button>
        </div>

        {renderTournaments()}
      </div>
    </div>
  );
};

export default MyTournaments;
