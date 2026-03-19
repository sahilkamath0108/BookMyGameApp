import React, { useState } from 'react';
import useImageUrl from '../hooks/useImageUrl';

/**
 * ImageWithFallback Component
 * 
 * A React component that handles S3 presigned URL images with automatic refresh
 * and fallback mechanism when URLs expire.
 * 
 * Features:
 * - Handles image loading errors gracefully
 * - Automatically attempts to refresh expired S3 URLs
 * - Shows placeholders during loading or on error
 */
const ImageWithFallback = ({
  src,
  alt,
  imageKey,
  refreshEndpoint = '/api/users/profile/image/refresh',
  fallbackSrc = '/placeholder-avatar.png',
  className = '',
  style = {},
  onLoad,
  onError,
  ...rest
}) => {
  const { url, loading, error, refreshUrl } = useImageUrl(src, imageKey, refreshEndpoint);
  const [loadError, setLoadError] = useState(false);

  // Handle image load success
  const handleLoad = (e) => {
    if (onLoad) onLoad(e);
  };

  // Handle image load error
  const handleError = async (e) => {
    e.preventDefault();
    
    // Try to refresh the URL
    const freshUrl = await refreshUrl();
    
    // If refresh failed or there's no fresh URL, show fallback
    if (!freshUrl) {
      setLoadError(true);
      if (onError) onError(e);
    }
  };

  // Render loading placeholder
  if (loading) {
    return (
      <div 
        className={`image-placeholder ${className}`}
        style={{
          backgroundColor: '#f0f0f0',
          borderRadius: '50%',
          ...style
        }}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  // Render error fallback
  if (error || loadError) {
    return (
      <img
        src={fallbackSrc}
        alt={`${alt} (fallback)`}
        className={className}
        style={style}
        {...rest}
      />
    );
  }

  // Render image
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
};

export default ImageWithFallback; 