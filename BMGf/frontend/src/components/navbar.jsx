// src/components/navbar.jsx
import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt,
  faUser,
  faNewspaper,
  faHome,
  faTrophy,
  faTachometerAlt,
  faMedal,
  faBars,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

const Navbar = () => {
  const { colors, theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('user');

    if (token && storedUserData) {
      setIsAuthenticated(true);
      try {
        setUserData(JSON.parse(storedUserData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      setIsAuthenticated(false);
      setUserData(null);
    }
  }, []);

  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserData(null);
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Use a hoverable link class that maintains vertical centering
  const navLinkClass = `${colors.navbar_text} hover:text-[#F05454] flex items-center gap-2 relative px-3`;
  // Active/hover indicator class for desktop
  const activeIndicatorClass = `after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-[#F05454] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200`;
  
  // Mobile menu nav link class
  const mobileNavLinkClass = `${colors.navbar_text} hover:text-[#F05454] flex items-center gap-3 py-4 px-4 text-lg border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`;

  // Check if current path matches link
  const isActive = (path) => {
    return location.pathname === path ? 'text-[#F05454] after:scale-x-100' : '';
  };

  return (
    <nav className={`${colors.navbar_background} border-b-2 border-slate-200 sticky top-0 z-50`}>
      <div className="container mx-auto flex justify-between items-center h-16 px-4">
        {/* Logo/Brand Name */}
        <div className="font-bold text-xl">
          <Link to="/" className={`${colors.navbar_text} hover:text-[#F05454]`}>
            BookMyGame
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMobileMenu}
            className={`${colors.navbar_text} focus:outline-none`}
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} size="lg" />
          </button>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center">
          {/* Navigation links */}
          <div className="font-bold h-16 flex items-center">
            <Link to="/" className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/')}`}>
              <FontAwesomeIcon icon={faHome} />
              <span>Home</span>
            </Link>
          </div>
          
          <div className="font-bold h-16 flex items-center">
            <Link to="/dashboard" className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/dashboard')}`}>
              <FontAwesomeIcon icon={faTachometerAlt} />
              <span>Dashboard</span>
            </Link>
          </div>
          
          <div className="font-bold h-16 flex items-center">
            <Link to="/upcoming-tournaments" className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/upcoming-tournaments')}`}>
              <FontAwesomeIcon icon={faTrophy} />
              <span>Tournaments</span>
            </Link>
          </div>
          
          <div className="font-bold h-16 flex items-center">
            <Link to="/all-posts" className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/all-posts')}`}>
              <FontAwesomeIcon icon={faNewspaper} />
              <span>Posts</span>
            </Link>
          </div>
          
          <div className="font-bold h-16 flex items-center">
            <Link to="/global-leaderboard" className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/global-leaderboard')}`}>
              <FontAwesomeIcon icon={faMedal} />
              <span>Leaderboard</span>
            </Link>
          </div>
        </div>

        {/* Right side of the navbar - desktop */}
        <div className="hidden md:flex items-center">
          {isAuthenticated ? (
            <div className="flex items-center">
              <Link
                to="/profile"
                className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/profile')}`}
              >
                <FontAwesomeIcon icon={faUser} />
                <span>
                  {userData?.Name ? userData.Name.split(' ')[0] : 'Profile'}
                </span>
              </Link>
              
              <button
                onClick={handleLogout}
                className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass}`}
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span>Logout</span>
              </button>
              
              <div className="px-3 flex items-center h-16">
                <ThemeToggle />
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <Link
                to="/login"
                className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/login')}`}
              >
                <span>Login</span>
              </Link>
              
              <Link
                to="/sign-up"
                className={`${navLinkClass} h-16 flex items-center ${activeIndicatorClass} ${isActive('/sign-up')}`}
              >
                <span>Sign Up</span>
              </Link>
              
              <div className="px-3 flex items-center h-16">
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 ${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`} onClick={toggleMobileMenu}></div>

      {/* Mobile Menu */}
      <div className={`fixed top-0 right-0 w-3/4 h-full ${colors.navbar_background} z-50 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out md:hidden`}>
        <div className="flex justify-end p-4">
          <button onClick={toggleMobileMenu} className={`${colors.navbar_text}`}>
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>

        <div className="flex flex-col mt-6">
          {/* Mobile Navigation Links */}
          <Link to="/" className={`${mobileNavLinkClass} ${location.pathname === '/' ? 'text-[#F05454]' : ''}`}>
            <FontAwesomeIcon icon={faHome} />
            <span>Home</span>
          </Link>
          
          <Link to="/dashboard" className={`${mobileNavLinkClass} ${location.pathname === '/dashboard' ? 'text-[#F05454]' : ''}`}>
            <FontAwesomeIcon icon={faTachometerAlt} />
            <span>Dashboard</span>
          </Link>
          
          <Link to="/upcoming-tournaments" className={`${mobileNavLinkClass} ${location.pathname === '/upcoming-tournaments' ? 'text-[#F05454]' : ''}`}>
            <FontAwesomeIcon icon={faTrophy} />
            <span>Tournaments</span>
          </Link>
          
          <Link to="/all-posts" className={`${mobileNavLinkClass} ${location.pathname === '/all-posts' ? 'text-[#F05454]' : ''}`}>
            <FontAwesomeIcon icon={faNewspaper} />
            <span>Posts</span>
          </Link>
          
          <Link to="/global-leaderboard" className={`${mobileNavLinkClass} ${location.pathname === '/global-leaderboard' ? 'text-[#F05454]' : ''}`}>
            <FontAwesomeIcon icon={faMedal} />
            <span>Leaderboard</span>
          </Link>
          
          {/* Mobile User Links */}
          <div className="mt-6 border-t border-gray-700 pt-4">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className={`${mobileNavLinkClass} ${location.pathname === '/profile' ? 'text-[#F05454]' : ''}`}>
                  <FontAwesomeIcon icon={faUser} />
                  <span>{userData?.Name ? userData.Name.split(' ')[0] : 'Profile'}</span>
                </Link>
                
                <button onClick={handleLogout} className={`${mobileNavLinkClass} text-left w-full`}>
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`${mobileNavLinkClass} ${location.pathname === '/login' ? 'text-[#F05454]' : ''}`}>
                  <span>Login</span>
                </Link>
                
                <Link to="/sign-up" className={`${mobileNavLinkClass} ${location.pathname === '/sign-up' ? 'text-[#F05454]' : ''}`}>
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>
          
          {/* Theme Toggle for Mobile */}
          <div className="flex items-center px-4 py-6">
            <span className={`${colors.navbar_text} mr-3`}>Theme:</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
