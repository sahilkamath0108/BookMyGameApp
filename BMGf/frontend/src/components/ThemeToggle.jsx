// src/components/ThemeToggle.jsx
import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import SunIcon from '../Assets/light.png'; // Adjust the path as necessary
import MoonIcon from '../Assets/dark.png'; // Adjust the path as necessary
import DarkMoon from '../Assets/moon.png'
const ThemeToggle = () => {
  const { theme, toggleTheme, colors } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className={`${colors.primary} p-2 flex items-center`}
    >
      <img
        src={theme === 'dark' ? SunIcon : DarkMoon}
        alt={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-6 h-6   "
      />
    </button>
  );
};

export default ThemeToggle;
