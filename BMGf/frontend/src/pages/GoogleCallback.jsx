import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Global processing lock to prevent multiple instances
let globalProcessingLock = false;

function GoogleCallback() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        

        // Simple check to prevent double execution
        if (hasProcessed.current) {
          
          return;
        }

        // Get the authorization code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          
          setError('No authorization code received from Google');
          setLoading(false);
          return;
        }

        

        // Mark as processed immediately to prevent double execution
        hasProcessed.current = true;

        // Clear the URL parameters to prevent reprocessing on refresh
        window.history.replaceState({}, document.title, window.location.pathname);

        // Check for recent processing of this specific code
        const sessionKey = `google_auth_${code}`;
        const recentProcessing = sessionStorage.getItem(sessionKey);
        
        if (recentProcessing) {
          const processTime = parseInt(recentProcessing);
          const timeDiff = Date.now() - processTime;
          
          if (timeDiff < 30000) { // 30 seconds
            
            
            // Check if we have valid tokens
            const existingToken = localStorage.getItem('token');
            const existingUser = localStorage.getItem('user');
            
            if (existingToken && existingUser) {
              
              setLoading(false);
              navigate('/dashboard');
              return;
            }
          } else {
            // Remove old session data
            sessionStorage.removeItem(sessionKey);
          }
        }

        // Mark this code as being processed
        sessionStorage.setItem(sessionKey, Date.now().toString());

        

        // Send the authorization code to your backend
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}api/users/google/callback`,
          { code: code },
          { timeout: 15000 } // 15 second timeout
        );

        

        // Check if the response contains the expected data
        if (
          !response.data ||
          !response.data.data ||
          !response.data.data.token ||
          !response.data.data.user
        ) {
          console.error('Invalid response format:', response.data);
          setError('Invalid response from server');
          setLoading(false);
          return;
        }

        

        // Store token and user info
        localStorage.setItem('token', response.data.data.token);

        // Ensure user data is valid before storing
        const userData = response.data.data.user;
        if (typeof userData !== 'object') {
          console.error('Invalid user data:', userData);
          setError('Invalid user data received');
          setLoading(false);
          return;
        }

        // Store user data as JSON
        localStorage.setItem('user', JSON.stringify(userData));

        // Clean up session storage and auth lock
        sessionStorage.removeItem(sessionKey);
        localStorage.removeItem('google_auth_in_progress');

        

        // Navigate to dashboard
        setLoading(false);
        navigate('/dashboard');
        
      } catch (err) {
        console.error('Google callback error:', err);

        // Reset processing flag on error
        hasProcessed.current = false;

        // Clean up session storage and auth lock
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          sessionStorage.removeItem(`google_auth_${code}`);
        }
        localStorage.removeItem('google_auth_in_progress');

        // Extract error message from response if available
        let errorMessage = 'Authentication failed';

        if (err.response) {
          if (err.response.data && err.response.data.message) {
            errorMessage = err.response.data.message;
            
            // Handle different types of duplicate errors
            if (errorMessage.includes('already been used') || 
                errorMessage.includes('DUPLICATE_AUTH_CODE') || 
                errorMessage.includes('DUPLICATE_REQUEST')) {
              
              
              
              // Check if we have valid tokens in localStorage
              const existingToken = localStorage.getItem('token');
              const existingUser = localStorage.getItem('user');
              
              if (existingToken && existingUser) {
                
                setLoading(false);
                navigate('/dashboard');
                return;
              }
              
              // For duplicate requests, redirect to login after a short delay
              
              setTimeout(() => {
                setLoading(false);
                navigate('/login');
              }, 1500);
              
              setError('Authentication completed. Redirecting...');
              return;
            }
          } else {
            errorMessage = `Server error: ${err.response.status}`;
          }
        } else if (err.request) {
          errorMessage = 'No response from server. Please check your connection.';
        } else {
          errorMessage = err.message || 'Error during authentication';
        }

        console.error('Error details:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    };

    // Start processing
    processGoogleCallback();

    // Cleanup function
    return () => {
      // Don't reset hasProcessed here to prevent double execution
    };
  }, []); // Empty dependency array to run only once

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-600"></div>
          <p className="mt-4 text-lg font-semibold text-gray-800">
            Completing Google Sign-In...
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we authenticate your account
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-red-600 mb-4">
              Authentication Error
            </h3>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default GoogleCallback;
