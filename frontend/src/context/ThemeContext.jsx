import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const isDarkMode = false;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('soulh_theme', 'light');
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
