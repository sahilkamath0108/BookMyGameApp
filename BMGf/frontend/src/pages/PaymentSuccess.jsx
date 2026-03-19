import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ThemeContext } from '../context/ThemeContext';
import {
  faCheckCircle,
  faArrowLeft,
  faExclamationCircle,
  faTrophy,
  faGamepad,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import Navbar from '../components/navbar';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tournamentName, setTournamentName] = useState('');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // Get URL params
        const queryParams = new URLSearchParams(location.search);
        const sessionId = queryParams.get('session_id');

        // Try to get tournamentId from URL or localStorage
        let tournamentId = queryParams.get('tournamentId');
        if (!tournamentId) {
          tournamentId = localStorage.getItem('currentTournamentId');
        }

        const storedTeamPassword = localStorage.getItem('teamPassword');
        const reservationType = localStorage.getItem('reservationType');

        if (!sessionId) {
          setError('Missing session ID. Please try again.');
          setLoading(false);
          return;
        }

        if (!tournamentId) {
          setError('Missing tournament information. Please try again.');
          setLoading(false);
          return;
        }

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You must be logged in to complete this process.');
          setLoading(false);
          return;
        }

        

        let response;
        
        // Determine which API endpoint to call based on reservation type
        if (reservationType === 'player') {
          // Single player confirmation
          response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/player2`,
            {
              sessionId,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } else {
          // Team confirmation (default)
          response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team2`,
            {
              sessionId,
              teamPassword: storedTeamPassword,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }

        

        if (response.data && response.data.status === 'success') {
          setSuccess(true);
          setTournamentName(response.data.data.tournamentDetails?.tournament_Name || 
                           response.data.data.tournament_name || 'tournament');

          // Clear stored data after successful confirmation
          localStorage.removeItem('teamPassword');
          localStorage.removeItem('currentTournamentId');
          localStorage.removeItem('reservationType');
        } else {
          setError('Unable to confirm payment. Please contact support.');
        }
      } catch (error) {
        console.error('Error confirming payment:', error);
        setError(
          error.response?.data?.message ||
            'Error confirming payment. Please contact support.'
        );
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [location.search]);

  const handleBackToTournaments = () => {
    navigate('/upcoming-tournaments');
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
        <div className="container mx-auto py-8 sm:py-16 px-4 flex flex-col items-center justify-center relative z-10">
          <div className={`animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 ${isLight 
            ? 'border-purple-600' 
            : 'border-[#F05454]'}`}></div>
          <p className={`mt-4 text-base sm:text-lg ${isLight ? 'text-gray-600' : ''}`}>
            Processing your payment...
          </p>
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
      <div className="container mx-auto py-8 sm:py-16 px-4 relative z-10">
        <div className={`max-w-2xl mx-auto ${isLight 
          ? 'bg-white/80 border-gray-200' 
          : 'bg-opacity-10 bg-white border-gray-300 border-opacity-25'} backdrop-filter backdrop-blur-lg rounded-xl p-4 sm:p-8 border shadow-lg`}>
          {success ? (
            <div className="flex flex-col items-center text-center">
              {/* Success animation */}
              <div className="relative mb-6 sm:mb-10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`animate-ping opacity-75 ${isLight ? 'text-green-500' : 'text-green-400'} text-6xl sm:text-8xl`}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                </div>
                <div className={`relative ${isLight ? 'text-green-600' : 'text-green-400'} text-5xl sm:text-7xl`}>
                  <FontAwesomeIcon icon={faCheckCircle} className="animate-bounce" />
                </div>
              </div>
              
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Registration Complete!</h1>
              <p className="text-base sm:text-xl mb-4 sm:mb-6">
                You've successfully joined the {tournamentName}!
              </p>
              
              {/* Success animation with game icons */}
              <div className="flex justify-center gap-6 sm:gap-8 my-4 sm:my-8">
                <div className="animate-bounce text-3xl sm:text-4xl text-[#F05454]">
                  <FontAwesomeIcon icon={faTrophy} />
                </div>
                <div className="animate-bounce text-3xl sm:text-4xl text-[#F05454] animation-delay-200">
                  <FontAwesomeIcon icon={faGamepad} />
                </div>
                <div className="animate-bounce text-3xl sm:text-4xl text-[#F05454] animation-delay-400">
                  <FontAwesomeIcon icon={faTrophy} />
                </div>
              </div>
              
              <p className={`text-sm sm:text-lg mb-6 sm:mb-8 ${isLight ? 'text-gray-600' : ''}`}>
                Your team has been created and you're ready to compete!
              </p>
              
              <button
                onClick={handleBackToTournaments}
                className={`${isLight 
                  ? 'bg-gradient-to-r from-[#F05454] to-pink-500 hover:from-[#e03e3e] hover:to-pink-400' 
                  : 'bg-[#F05454] hover:bg-[#e03e3e]'} text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition duration-200 font-semibold flex items-center gap-2 text-sm sm:text-base shadow-lg`}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Tournaments</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className={`${isLight ? 'text-red-600' : 'text-[#F05454]'} text-4xl sm:text-6xl mb-4 sm:mb-6`}>
                <FontAwesomeIcon icon={faExclamationCircle} />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">
                Payment Confirmation Failed
              </h1>
              <p className="text-base sm:text-xl mb-4 sm:mb-6">{error}</p>
              <button
                onClick={handleBackToTournaments}
                className={`${isLight 
                  ? 'bg-gradient-to-r from-[#F05454] to-pink-500 hover:from-[#e03e3e] hover:to-pink-400' 
                  : 'bg-[#F05454] hover:bg-[#e03e3e]'} text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition duration-200 font-semibold flex items-center gap-2 text-sm sm:text-base shadow-lg`}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Tournaments</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
