import { useState, useContext, useEffect } from 'react';
import login from '../Assets/login_bg.png';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { colors, theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  // Check for remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/users/login`,
        { email, password }
      );
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      // Store email in local storage if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Check if Google auth is already in progress
      const authInProgress = localStorage.getItem('google_auth_in_progress');
      if (authInProgress) {
        const startTime = parseInt(authInProgress);
        const timeDiff = Date.now() - startTime;
        if (timeDiff < 30000) { // 30 seconds
          
          setError('Google login is already in progress. Please wait...');
          return;
        } else {
          // Remove old lock
          localStorage.removeItem('google_auth_in_progress');
        }
      }

      // Set lock
      localStorage.setItem('google_auth_in_progress', Date.now().toString());

      // Clear any existing auth state to prevent conflicts
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}api/users/google`
      );
      
      // Add a small delay to ensure state is cleared
      setTimeout(() => {
        window.location.href = response.data.data.url;
      }, 100);
    } catch (err) {
      console.error('Google login initialization error:', err);
      // Remove lock on error
      localStorage.removeItem('google_auth_in_progress');
      setError('Failed to initialize Google login. Please try again.');
    }
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
          <ThemeToggle />
        </div>
        
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r ${isLight 
          ? 'from-purple-600 via-pink-600 to-red-600' 
          : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mt-4`}>
          Welcome Back, Ready to Win?
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
            onSubmit={handleLogin}
            className="flex flex-col gap-4 md:gap-6 w-full"
          >
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
              <div className="flex justify-between items-center">
                <label htmlFor="password" className={`text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Password</label>
                <button
                  type="button"
                  className={`text-xs md:text-sm ${isLight 
                    ? 'text-purple-600 hover:text-purple-700' 
                    : 'text-purple-400 hover:text-purple-300'} transition-colors`}
                  onClick={() => navigate('/forgot-password', { state: { email } })}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className={`w-full p-2 md:p-3 rounded-xl ${isLight 
                  ? 'bg-white/60 backdrop-blur-sm border border-gray-300/50 focus:border-purple-500/50 text-gray-800 placeholder-gray-500' 
                  : 'bg-black/60 backdrop-blur-sm border border-gray-700/50 focus:border-purple-500/50 text-white placeholder-gray-400'} focus:outline-none transition-all duration-300`}
              />
            </div>

            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`mr-2 h-4 w-4 ${isLight 
                  ? 'accent-purple-600' 
                  : 'accent-purple-500'} rounded focus:ring-purple-500`}
              />
              <label htmlFor="rememberMe" className={`text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              className={`bg-gradient-to-r ${isLight 
                ? 'from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400' 
                : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} rounded-xl p-3 font-semibold text-white mt-4 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.01]`}
            >
              Login
            </button>
          </form>

          <div className="flex items-center justify-center my-6">
            <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} flex-grow`}></div>
            <span className={`px-4 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>OR</span>
            <div className={`border-t ${isLight ? 'border-gray-300' : 'border-gray-700'} flex-grow`}></div>
          </div>
          
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`font-semibold flex justify-center items-center gap-2 p-3 rounded-xl ${isLight 
                ? 'border border-gray-300/50 bg-white/60 text-gray-800 hover:bg-purple-500/10 hover:border-purple-500/30' 
                : 'border border-gray-700/50 bg-black/60 text-white hover:bg-purple-500/10 hover:border-purple-500/30'} w-full md:max-w-md transition-all duration-300`}
            >
              <FontAwesomeIcon icon={faGoogle} />
              <span>Sign in with Google</span>
            </button>
          </div>
          
          <div className="flex justify-center gap-2 py-6 text-sm md:text-base">
            <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Don't have an account?</span>
            <button
              type="button"
              className={`${isLight 
                ? 'text-purple-600 hover:text-purple-700' 
                : 'text-purple-400 hover:text-purple-300'} hover:underline`}
              onClick={() => navigate('/sign-up')}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
      
      {/* Image side - hidden on mobile */}
      <div className="hidden md:block md:w-1/2 h-screen overflow-hidden">
        <img 
          src={login} 
          alt="Login background" 
          className="h-full w-full object-cover" 
        />
      </div>
    </div>
  );
};

export default Login;
