// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import GoogleCallBack from './pages/GoogleCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UpcomingTournaments from './pages/UpcomingTournaments';
import TournamentDetails from './pages/TournamentDetails';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Profile from './pages/Profile';
import MyTournaments from './pages/MyTournaments';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CreateTournament from './pages/CreateTournament.jsx';
import EditTournament from './pages/EditTournament.jsx';
import TournamentPosts from './pages/TournamentPosts.jsx';
import AllPosts from './pages/AllPosts.jsx';
import MyPosts from './pages/MyPosts.jsx';
import PostView from './pages/PostView.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import TournamentStats from './pages/TournamentStats.jsx';
import AdminConsole from './pages/AdminConsole';
import TournamentLeaderboard from './pages/TournamentLeaderboard.jsx';
import GlobalLeaderboard from './pages/GlobalLeaderboard.jsx';
import Sponsors from './pages/Sponsors.jsx';
import MyStatistics from './pages/MyStatistics';

const App = () => {
  const [theme, setTheme] = useState('dark');
  const colors = {
    background: theme === 'dark' ? 'bg-[#30475E]' : 'bg-[#DDDDDD]',
    text: theme === 'dark' ? 'text-[#DDDDDD]' : 'text-[#121212]',
    card_background: theme === 'dark' ? 'bg-[#222831]' : 'bg-[#F5F5F5]',
  };

  return (
    <ThemeProvider>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/tournament" element={<Tournament />} /> */}
          <Route
            path="/upcoming-tournaments"
            element={<UpcomingTournaments />}
          />
          <Route path="/create-tournament" element={<CreateTournament />} />
          <Route
            path="/tournaments/:tournamentId"
            element={<TournamentDetails />}
          />
          <Route
            path="/edit-tournament/:tournamentId"
            element={<EditTournament />}
          />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-tournaments" element={<MyTournaments />} />
          <Route path="/auth/google/callback" element={<GoogleCallBack />} />
          <Route path="/all-posts" element={<AllPosts />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/tournament-posts/:tournamentId" element={<TournamentPosts />}/>
          <Route path="/post/:postId" element={<PostView />} />
          <Route path="/tournament-stats/:tournamentId" element={<TournamentStats />} />
          <Route path="/admin-console/:tournamentId" element={<AdminConsole />} />
          <Route path="/tournament-leaderboard/:tournamentId" element={<TournamentLeaderboard />} />
          <Route path="/global-leaderboard" element={<GlobalLeaderboard />} />
          <Route path="/tournament-sponsors/:tournamentId" element={<Sponsors />} />
          <Route path="/my-statistics" element={<MyStatistics />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
