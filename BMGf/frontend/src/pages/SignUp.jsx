// src/pages/SignUp.jsx
import { useState, useContext } from 'react';
import signup from '../Assets/signUp_bg.png';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faEyeSlash, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import ThemeToggle from '../components/ThemeToggle';

const SignUp = () => {
  const [Name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Register the user
      const registerResponse = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/users/register`,
        { Name, email, password }
      );

      // If registration is successful, log in automatically
      const loginResponse = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/users/login`,
        { email, password }
      );

      // Store user data and token
      localStorage.setItem('token', loginResponse.data.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify(loginResponse.data.data.user)
      );

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/users/google`
      );
      window.location.href = response.data.data.url;
    } catch (err) {
      setError('Failed to initialize Google login');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const openTermsModal = (e) => {
    e.preventDefault();
    setShowTermsModal(true);
  };

  const closeTermsModal = () => {
    setShowTermsModal(false);
  };

  return (
    <div className={`flex flex-col md:flex-row justify-between min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
      
      {/* Animated background elements (visible on form side) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none md:w-1/2">
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
      
      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className={`${isLight 
            ? 'bg-white/90 backdrop-blur-xl text-gray-800' 
            : 'bg-gray-900/90 backdrop-blur-xl text-white'} max-w-2xl w-full rounded-xl shadow-2xl p-4 sm:p-6 max-h-[80vh] overflow-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Terms and Conditions</h2>
              <button 
                onClick={closeTermsModal}
                className={`${isLight 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400' 
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'} text-white p-2 rounded-full shadow-lg transition-all duration-300`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={`prose ${isLight ? 'prose-slate' : 'prose-invert'} prose-sm max-w-none`}>
              <h3>1. Introduction</h3>
              <p>Welcome to BookMyGame. These terms and conditions outline the rules and regulations for the use of our platform.</p>
              
              <h3>2. Terms of Service</h3>
              <p>By accessing this website, we assume you accept these terms and conditions in full. Do not continue to use BookMyGame if you do not accept all of the terms and conditions stated on this page.</p>
              
              <h3>3. Privacy Policy</h3>
              <p>We respect your privacy and are committed to protecting it. Your personal information will be handled as described in our Privacy Policy.</p>
              
              <h3>4. User Accounts</h3>
              <p>When you create an account with us, you guarantee that the information you provide is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on our platform.</p>
              
              <h3>5. Tournaments and Competitions</h3>
              <p>By participating in tournaments and competitions on our platform, you agree to follow the specific rules of each event and maintain sportsmanship at all times.</p>
              
              <h3>6. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. We will notify users of any changes by updating the date at the top of these terms and conditions.</p>
            </div>
            <div className="mt-4 text-center">
              <button 
                onClick={closeTermsModal} 
                className={`bg-gradient-to-r ${isLight 
                  ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                  : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white py-2 px-4 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 font-semibold`}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Form side */}
      <div className="w-full md:w-1/2 flex flex-col p-6 md:p-12 lg:p-24 items-start gap-6 md:gap-8 relative z-10">
        <div className="w-full flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className={`${isLight 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} p-2 rounded-full text-white shadow-lg transition-all duration-300`}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
          </button>
          <ThemeToggle/>
        </div>
        
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
          ? 'from-purple-600 via-pink-600 to-red-600' 
          : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mt-4`}>
          Are You Ready to Enter the Battlefield?
        </h1>
        
        <div className="w-full">
          {error && (
            <div className={`${isLight 
              ? 'bg-red-500/10 border border-red-500/30 text-red-700' 
              : 'bg-red-500/20 border border-red-500/30 text-red-300'} p-3 rounded-xl mb-4`}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSignUp}
            className="flex flex-col gap-4 md:gap-6 w-full"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={`text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Name</label>
              <input
                type="text"
                id="name"
                value={Name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className={`w-full p-2 md:p-3 rounded-xl ${isLight 
                  ? 'bg-white/60 backdrop-blur-sm border border-gray-300/50 focus:border-purple-500/50 text-gray-800 placeholder-gray-500' 
                  : 'bg-black/60 backdrop-blur-sm border border-gray-700/50 focus:border-purple-500/50 text-white placeholder-gray-400'} focus:outline-none transition-all duration-300`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={`text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className={`w-full p-2 md:p-3 rounded-xl ${isLight 
                  ? 'bg-white/60 backdrop-blur-sm border border-gray-300/50 focus:border-purple-500/50 text-gray-800 placeholder-gray-500' 
                  : 'bg-black/60 backdrop-blur-sm border border-gray-700/50 focus:border-purple-500/50 text-white placeholder-gray-400'} focus:outline-none transition-all duration-300`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className={`text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className={`w-full p-2 md:p-3 rounded-xl pr-10 ${isLight 
                    ? 'bg-white/60 backdrop-blur-sm border border-gray-300/50 focus:border-purple-500/50 text-gray-800 placeholder-gray-500' 
                    : 'bg-black/60 backdrop-blur-sm border border-gray-700/50 focus:border-purple-500/50 text-white placeholder-gray-400'} focus:outline-none transition-all duration-300`}
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <FontAwesomeIcon 
                    icon={showPassword ? faEyeSlash : faEye} 
                    className={`${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} transition-colors`} 
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center mt-1">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className={`w-4 h-4 ${isLight 
                  ? 'accent-purple-600' 
                  : 'accent-purple-500'} rounded focus:ring-purple-500 mr-2`}
              />
              <label htmlFor="agreeToTerms" className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                I agree to the <button onClick={openTermsModal} className={`${isLight 
                  ? 'text-purple-600 hover:text-purple-700' 
                  : 'text-purple-400 hover:text-purple-300'} hover:underline`}>terms and conditions</button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`bg-gradient-to-r ${isLight 
                ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} rounded-xl p-3 font-semibold text-white mt-4 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.01] flex justify-center items-center`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                'Sign Up'
              )}
            </button>

            <div className="flex items-center justify-center my-6">
              <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} flex-grow`}></div>
              <span className={`px-4 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>OR</span>
              <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} flex-grow`}></div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className={`font-semibold flex justify-center items-center gap-2 p-3 rounded-xl ${isLight 
                  ? 'border border-gray-300/50 bg-white/60 text-gray-800 hover:bg-purple-500/10 hover:border-purple-500/30' 
                  : 'border border-gray-700/50 bg-black/60 text-white hover:bg-purple-500/10 hover:border-purple-500/30'} w-full md:max-w-md transition-all duration-300`}
              >
                <FontAwesomeIcon icon={faGoogle} />
                <span>Sign up with Google</span>
              </button>
            </div>
            
            <div className="flex justify-center gap-2 py-6 text-sm md:text-base">
              <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Already have an account?</span>
              <button
                type="button"
                className={`${isLight 
                  ? 'text-purple-600 hover:text-purple-700' 
                  : 'text-purple-400 hover:text-purple-300'} hover:underline`}
                onClick={() => navigate('/login')}
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Image side - hidden on mobile */}
      <div className="hidden md:block md:w-1/2 h-screen overflow-hidden">
        <img 
          src={signup} 
          alt="Sign Up background" 
          className="h-full w-full object-cover" 
        />
      </div>
    </div>
  );
};

export default SignUp;
