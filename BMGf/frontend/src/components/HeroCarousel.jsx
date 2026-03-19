// src/components/HeroCarousel.jsx
import React, { useContext } from 'react';

import Slider from 'react-slick';
import recent from '../Assets/recent_champions_footer.png'; // Ensure this path is correct
import { ThemeContext } from '../context/ThemeContext';
import carousel1 from '../Assets/carousel_1.png';
import carousel2 from '../Assets/carousel_2.png';
import carousel3 from '../Assets/carousel_3.png';
import carousel4 from '../Assets/carousel_4.png';
import { useNavigate } from 'react-router-dom';


const HeroCarousel = () => {
  const { colors } = useContext(ThemeContext);
  const navigate = useNavigate();


  const slides = [
    {
      img: carousel1,
      primaryTagline: 'DOMINATE THE BATTLEFIELD',
      secondaryText:
        'CHALLENGE THE BEST. COMPETE FOR GLORY. PROVE YOUR DOMINANCE IN EVERY TOURNAMENT',
    },
    {
      img: carousel2,
      primaryTagline: 'RISE AS A CHAMPION',
      secondaryText:
        'ONE MATCH CAN CHANGE EVERYTHING. PLAY, STRATEGIZE AND CLAIM YOUR VICTORY.',
    },
    {
      img: carousel3,
      primaryTagline: 'ENTER THE ARENA',
      secondaryText:
        'JOIN A FIERCE COMMUNITY OF GAMERS. PLAY, WIN AND MAKE YOUR MARK.',
    },
    {
      img: carousel4,
      primaryTagline: 'OUTPLAY. OUTLAST. OUTWIN',
      secondaryText:
        'EVERY MOVE COUNTS.EVERY SECOND MATTERS. THE ULTIMATE COMPETITION STARTS NOW',
    },
  ];

  const settings = {
    dots: false,
    infinite: true,
    speed: 1000,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2500,
  };

  return (
    <div className="relative h-full">
      <Slider {...settings}>
        {slides.map((slide, index) => (
          <div key={index} className="relative">
            <div className="relative transition duration-1000 ease-in-out">
              <img
                src={slide.img}
                alt={`carousel ${index}`}
                className="w-full h-[85vh] sm:h-[95vh] object-cover transition duration-1000 ease-in-out"
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black opacity-30 sm:opacity-20"></div>
            </div>
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-20 transition-opacity duration-1000 ease-in-out opacity-100 px-4 sm:px-0">
              <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-full sm:max-w-3xl text-center mb-12 sm:mb-0">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2 sm:px-0">
                  {slide.primaryTagline}
                </span>
                <span className={`${colors.secondary_text} font-bold text-sm sm:text-base md:text-lg px-4 sm:px-0 max-w-xs sm:max-w-lg md:max-w-2xl`}>
                  {slide.secondaryText}
                </span>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center py-6 sm:py-10 w-full">
                  <button 
                    className="bg-[#F05454] py-3 sm:p-4 w-full sm:w-52 rounded-lg font-barlow font-bold text-sm sm:text-base shadow-lg hover:bg-opacity-90 transition-all"
                    onClick={() => navigate('/upcoming-tournaments')}
                  >
                    JOIN TOURNAMENT
                  </button>
                  <button 
                    className="bg-white text-[#F05454] py-3 sm:p-4 w-full sm:w-52 rounded-lg font-barlow font-bold text-sm sm:text-base shadow-lg hover:bg-opacity-90 transition-all"
                    onClick={() => navigate('/create-tournament')}
                  >
                    HOST TOURNAMENT
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default HeroCarousel;
