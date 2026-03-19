// src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { lightTheme, darkTheme } from '../styles/colors';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [colors, setColors] = useState(
    theme === 'dark' ? darkTheme : lightTheme
  );
  const isLight = theme === 'light';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    setColors(theme === 'dark' ? darkTheme : lightTheme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, isLight }}>
      {children}
    </ThemeContext.Provider>
  );
};
