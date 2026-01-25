import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (isDark) => {
      const newTheme = isDark ? 'dark' : 'light';
      setTheme(newTheme);
      
      const root = document.documentElement;
      
      // Apply Tailwind/Custom CSS class
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Apply Bootstrap 5.3 theme attribute
      root.setAttribute('data-bs-theme', newTheme);
    };

    // Initial check
    applyTheme(mediaQuery.matches);

    // Listener for system changes
    const handleChange = (e) => applyTheme(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = {
    theme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
