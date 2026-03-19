import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import forgotPasswordBg from '../Assets/login_bg.png';

const ForgotPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP verification, 3: New Password
  const [resetToken, setResetToken] = useState(''); // Store the reset token
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();
  const { colors } = useContext(ThemeContext);
  
  // Use the email passed from the login page
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/users/forgot-password`,
        { email }
      );
      
      if (response && response.data) {
        setMessage('OTP sent to your email. Please check your inbox.');
        setStep(2);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    if (!otp) {
      setError('Please enter the OTP sent to your email');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/users/verify-otp`,
        { email, otp }
      );
      
      if (response.data.status === 'success' && response.data.data.token) {
        setResetToken(response.data.data.token); // Store the token
        setMessage('OTP verified successfully');
        setStep(3);
      } else {
        setError('Failed to verify OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!resetToken) {
      setError('Reset token is missing. Please verify OTP again.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}api/users/profile`,
        { 
          password: newPassword 
        },
        {
          headers: {
            'Authorization': `Bearer ${resetToken}`
          }
        }
      );
      
      if (response.data.status === 'success' || response.data.success) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Reset token has expired. Please request a new OTP.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid password format');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col md:flex-row justify-between min-h-screen ${colors.background} ${colors.text}`}>
      {/* Form side */}
      <div className="w-full md:w-1/2 flex flex-col p-6 md:p-12 lg:p-24 items-start gap-6 md:gap-8">
        <button
          onClick={() => navigate('/login')}
          className="bg-[#F05454] py-[6px] px-[10px] rounded-full"
          disabled={loading}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xl md:text-2xl" />
        </button>
        
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-barlow mt-4">
          Reset Your Password
        </h1>
        
        <div className="w-full">
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-100 p-3 rounded-lg mb-4">
              {message}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="flex flex-col gap-4 md:gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm md:text-base">Email address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  className="w-full p-2 md:p-3 border-2 border-white rounded-xl bg-transparent focus:border-[#F05454] focus:outline-none disabled:opacity-50"
                  // If email was passed from login, make it readonly
                  readOnly={location.state?.email ? true : false}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#F05454] rounded-xl p-3 font-barlow font-semibold w-full hover:bg-opacity-90 transition-all mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4 md:gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label htmlFor="otp" className="text-sm md:text-base">Enter OTP</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter the OTP sent to your email"
                  required
                  disabled={loading}
                  className="w-full p-2 md:p-3 border-2 border-white rounded-xl bg-transparent focus:border-[#F05454] focus:outline-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#F05454] rounded-xl p-3 font-barlow font-semibold w-full hover:bg-opacity-90 transition-all mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="flex justify-center py-4">
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="text-[#6757D6] hover:underline text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 md:gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label htmlFor="newPassword" className="text-sm md:text-base">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  className="w-full p-2 md:p-3 border-2 border-white rounded-xl bg-transparent focus:border-[#F05454] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirmPassword" className="text-sm md:text-base">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  className="w-full p-2 md:p-3 border-2 border-white rounded-xl bg-transparent focus:border-[#F05454] focus:outline-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#F05454] rounded-xl p-3 font-barlow font-semibold w-full hover:bg-opacity-90 transition-all mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="flex justify-center gap-2 py-6 font-montserrat text-sm md:text-base mt-4">
            <span>Remember your password?</span>
            <button
              className="text-[#6757D6] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Login
            </button>
          </div>
        </div>
      </div>
      
      {/* Image side - hidden on mobile */}
      <div className="hidden md:block md:w-1/2 h-screen overflow-hidden">
        <img 
          src={forgotPasswordBg} 
          alt="Forgot Password background" 
          className="h-full w-full object-cover" 
        />
      </div>
    </div>
  );
};

export default ForgotPassword;