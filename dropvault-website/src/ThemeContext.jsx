import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const applyTheme = () => {
      const newTheme = 'dark';
      setTheme(newTheme);
      
      const root = document.documentElement;
      
      // Force Dark Mode
      root.classList.add('dark');
      root.setAttribute('data-bs-theme', 'dark');
    };

    applyTheme();
  }, []);

  const value = {
    theme: 'dark',
    isDark: true,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
