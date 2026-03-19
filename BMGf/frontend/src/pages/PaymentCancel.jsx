import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import {
  faExclamationTriangle,
  faArrowLeft,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/navbar';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    // Get tournamentId and cancellation info from localStorage
    const tournamentId = localStorage.getItem('currentTournamentId');
    const reservationType = localStorage.getItem('reservationType');
    const token = localStorage.getItem('token');

    // If we have a tournament ID, first cancel the reservation directly
    if (tournamentId && reservationType && token) {
      const cancelReservation = async () => {
        setIsCanceling(true);
        try {
          let endpoint;
          if (reservationType === 'team') {
            endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/team/cancel`;
          } else if (reservationType === 'player') {
            endpoint = `${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}/player/cancel`;
          } else {
            return;
          }

          

          const response = await axios.delete(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });

          

          // After cancellation is complete, redirect to tournament details
          setTimeout(() => {
            navigate(`/tournaments/${tournamentId}?payment_canceled=true`, {
              replace: true,
            });
          }, 2000); // Short delay to allow user to see the cancellation message

          // Clean up reservation type after cancellation
          localStorage.removeItem('reservationType');
          localStorage.removeItem('teamPassword');
          setIsCanceling(false);
        } catch (error) {
          console.error('Error canceling reservation:', error);
          setCancelError(error.message);

          // If we haven't tried too many times, retry after a delay
          if (retries < 2) {
            
            setTimeout(() => {
              setRetries((prev) => prev + 1);
            }, 2000);
          } else {
            // After 3 attempts, just redirect and let the tournament page handle it
            navigate(`/tournaments/${tournamentId}?payment_canceled=true`, {
              replace: true,
            });
          }
        }
      };

      cancelReservation();
    } else if (tournamentId) {
      // If we have tournamentId but no reservation info, just redirect
      setTimeout(() => {
        navigate(`/tournaments/${tournamentId}?payment_canceled=true`, {
          replace: true,
        });
      }, 2000);
    } else {
      // If we have no tournament ID at all, redirect to home
      setTimeout(() => {
        navigate('/upcoming-tournaments');
      }, 2000);
    }
  }, [navigate, retries]);

  const handleBackToTournaments = () => {
    // Clean up stored data
    localStorage.removeItem('currentTournamentId');
    localStorage.removeItem('teamPassword');
    localStorage.removeItem('reservationType');
    navigate('/upcoming-tournaments');
  };

  const handleTryAgain = () => {
    // Get tournamentId from localStorage
    const tournamentId = localStorage.getItem('currentTournamentId');

    if (tournamentId) {
      // Clean up stored data except tournamentId
      localStorage.removeItem('teamPassword');
      localStorage.removeItem('reservationType');
      navigate(`/tournaments/${tournamentId}`);
    } else {
      navigate('/upcoming-tournaments');
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
      <div className="container mx-auto py-8 sm:py-16 px-4 relative z-10">
        <div className={`max-w-2xl mx-auto ${isLight 
          ? 'bg-white/80 border-gray-200' 
          : 'bg-opacity-10 bg-white border-gray-300 border-opacity-25'} backdrop-filter backdrop-blur-lg rounded-xl p-4 sm:p-8 border shadow-lg`}>
          <div className="flex flex-col items-center text-center">
            <div className={`${isLight ? 'text-yellow-600' : 'text-yellow-500'} text-4xl sm:text-6xl mb-4 sm:mb-6`}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Payment Cancelled</h1>
            <p className="text-base sm:text-xl mb-4 sm:mb-6">
              Your tournament registration was not completed because the payment
              was cancelled.
            </p>

            {isCanceling ? (
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className={`${isLight ? 'text-yellow-600' : 'text-yellow-500'} animate-spin`}
                />
                <p className="text-sm sm:text-md">Canceling your reservation...</p>
              </div>
            ) : cancelError ? (
              <p className={`text-sm sm:text-md mb-4 sm:mb-6 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                There was an issue canceling your reservation. You will be
                redirected shortly...
              </p>
            ) : (
              <p className={`text-sm sm:text-md mb-4 sm:mb-6 ${isLight ? 'text-gray-600' : ''}`}>
                Your slot reservation will be automatically cancelled. You will
                be redirected shortly...
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto">
              <button
                onClick={handleTryAgain}
                className={`${isLight 
                  ? 'bg-gradient-to-r from-[#F05454] to-pink-500 hover:from-[#e03e3e] hover:to-pink-400' 
                  : 'bg-[#F05454] hover:bg-[#e03e3e]'} text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition duration-200 font-semibold text-sm sm:text-base w-full sm:w-auto shadow-lg`}
                disabled={isCanceling}
              >
                Try Again
              </button>
              <button
                onClick={handleBackToTournaments}
                className={`border-2 border-[#F05454] text-[#F05454] hover:bg-[#F05454] hover:text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition duration-200 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto ${isLight ? 'shadow-md' : ''}`}
                disabled={isCanceling}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Tournaments</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
