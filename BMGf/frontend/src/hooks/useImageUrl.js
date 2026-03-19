import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook for handling S3 presigned URLs
 * 
 * Features:
 * - Automatically refreshes expired URLs
 * - Handles loading and error states
 * - Returns necessary data for rendering images
 * 
 * @param {string} url - The original presigned URL
 * @param {string} key - The S3 key for the image
 * @param {string} refreshEndpoint - API endpoint for refreshing the URL
 * @returns {Object} - Object with url, loading, error, and refresh function
 */
const useImageUrl = (
  url, 
  key, 
  refreshEndpoint = '/api/users/profile/image/refresh'
) => {
  const [imageUrl, setImageUrl] = useState(url);
  const [loading, setLoading] = useState(!url);
  const [error, setError] = useState(false);
  const [retries, setRetries] = useState(0);

  // Update imageUrl when url prop changes
  useEffect(() => {
    if (url !== imageUrl) {
      setImageUrl(url);
      setLoading(!url);
      setError(false);
      setRetries(0);
    }
  }, [url]);

  // Function to refresh the URL
  const refreshUrl = async () => {
    if (!key || retries >= 2) {
      setError(true);
      return null;
    }

    try {
      setRetries(prev => prev + 1);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}${refreshEndpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success' && response.data.data.profileImageUrl) {
        const freshUrl = response.data.data.profileImageUrl;
        setImageUrl(freshUrl);
        setError(false);
        return freshUrl;
      }
      
      setError(true);
      return null;
    } catch (error) {
      console.error('Failed to refresh image URL:', error);
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    url: imageUrl,
    loading,
    error,
    refreshUrl
  };
};

export default useImageUrl; 