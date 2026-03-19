import React, { useState, useEffect, useCallback, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const Advertisement = ({ 
  type = 'banner', // 'banner', 'normal', or 'sidebar'
  images = [], // Array of image objects with url and optional sponsor info
  className = '',
  placeholder = 'Advertisement Space',
  autoSlideInterval = 2000 // 2 seconds default interval
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { isLight } = useContext(ThemeContext);

  const nextImage = useCallback(() => {
    if (images.length > 0) {
      setCurrentIndex((prev) => 
        prev === images.length - 1 ? 0 : prev + 1
      );
    }
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length > 0) {
      setCurrentIndex((prev) => 
        prev === 0 ? images.length - 1 : prev - 1
      );
    }
  }, [images.length]);

  // Combined auto-slide functionality with pause on hover
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        nextImage();
      }
    }, autoSlideInterval);

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [images.length, nextImage, autoSlideInterval, isPaused]);

  // Handle click to open sponsor website
  const handleAdClick = () => {
    const currentImage = images[currentIndex];
    if (currentImage && currentImage.website) {
      // Ensure the URL has a protocol
      let url = currentImage.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Different styles for different ad types
  const getAdStyles = () => {
    switch (type) {
      case 'banner':
        return 'w-full h-[120px] md:h-[160px]';
      case 'normal':
        return 'w-full h-[100px] md:h-[140px]';
      case 'sidebar':
        return 'w-full h-[200px] md:h-[280px]';
      case 'compact':
        return 'w-full h-[80px] md:h-[100px]';
      default:
        return 'w-full h-[120px]';
    }
  };

  if (images.length === 0) {
    return (
      <div 
        className={`${getAdStyles()} ${isLight ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300' : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600'} border-2 rounded-lg flex items-center justify-center ${className} relative overflow-hidden`}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r ${isLight ? 'from-purple-400 to-pink-400' : 'from-purple-500 to-pink-500'} transform rotate-12 scale-150`}></div>
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r ${isLight ? 'from-blue-400 to-cyan-400' : 'from-blue-500 to-cyan-500'} transform -rotate-12 scale-150 opacity-50`}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="mb-3">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${isLight ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'} text-white mb-2`}>
              <span className="text-xl">🎮</span>
            </div>
          </div>
          <p className={`text-lg font-bold ${isLight ? 'text-gray-800' : 'text-white'} mb-1`}>
            {placeholder}
          </p>
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'} opacity-80`}>
            Sponsor Space Available
          </p>
          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/50 text-purple-300'}`}>
            Advertise Here
          </div>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const isClickable = currentImage && currentImage.website;

  return (
    <div 
      className={`${getAdStyles()} relative overflow-hidden rounded-lg ${className} ${
        isClickable ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={isClickable ? handleAdClick : undefined}
    >
      {/* Image Container */}
      <div className="w-full h-full">
        <img
          src={currentImage.url}
          alt={currentImage.sponsor_name || 'Advertisement'}
          className={`w-full h-full object-cover ${
            type === 'banner' ? 'object-center' : 'object-contain'
          } transition-opacity duration-500 ${
            isClickable ? 'hover:opacity-90' : ''
          }`}
          style={{
            objectPosition: type === 'banner' ? 'center' : 'center',
            objectFit: type === 'banner' ? 'cover' : 'contain'
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/800x400?text=Advertisement';
          }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-black/80 via-black/60 to-transparent' : 'from-black/60 via-black/30 to-transparent'}`} />

      {/* Click indicator for clickable ads */}
      {isClickable && (
        <div className="absolute top-2 right-2 z-20">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isLight ? 'bg-white/90 text-gray-800' : 'bg-black/70 text-white'
          } backdrop-blur-sm`}>
            Click to visit
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the ad click
              prevImage();
            }}
            className={`absolute left-2 top-1/2 -translate-y-1/2 ${type === 'compact' ? 'p-1' : 'p-2'} rounded-full ${isLight ? 'bg-black/70 hover:bg-black/80' : 'bg-black/30 hover:bg-black/50'} text-white transition-colors z-10`}
          >
            <svg className={`${type === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the ad click
              nextImage();
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${type === 'compact' ? 'p-1' : 'p-2'} rounded-full ${isLight ? 'bg-black/70 hover:bg-black/80' : 'bg-black/30 hover:bg-black/50'} text-white transition-colors z-10`}
          >
            <svg className={`${type === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Sponsor Info */}
      {currentImage.sponsor_name && (
        <div className={`absolute bottom-0 left-0 right-0 ${type === 'compact' ? 'p-2' : 'p-4'} z-10`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`${type === 'compact' ? 'text-xs' : 'text-sm'} font-semibold ${isLight ? 'text-white drop-shadow-lg' : 'text-white'}`}>
                {currentImage.sponsor_name}
              </h3>
              {currentImage.sponsorship_level && (
                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full ${type === 'compact' ? 'text-xs' : 'text-xs'} ${
                  currentImage.sponsorship_level.toLowerCase() === 'platinum' 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    : currentImage.sponsorship_level.toLowerCase() === 'gold'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                    : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                }`}>
                  {currentImage.sponsorship_level}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex items-center space-x-1">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`${type === 'compact' ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full transition-colors ${
                      index === currentIndex 
                        ? 'bg-white' 
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Advertisement; 