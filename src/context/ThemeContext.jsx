import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('foody_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      // Check system preference if no saved theme
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) {}
    return 'light'; // Default to pristine Divine Light theme to address dark-theme complaints
  });

  // Apply theme to HTML root element, body, and localStorage
  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
        if (body) {
          body.classList.remove('dark');
          body.classList.add('light');
          body.setAttribute('data-theme', 'light');
          body.style.backgroundColor = '#FAF7F2';
          body.style.color = '#1C1917';
        }
        // Update browser theme color bar
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#FAF7F2');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
        if (body) {
          body.classList.remove('light');
          body.classList.add('dark');
          body.setAttribute('data-theme', 'dark');
          body.style.backgroundColor = '#1E1B1C';
          body.style.color = '#FFFFFF';
        }
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#1E1B1C');
      }
      localStorage.setItem('foody_theme', theme);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foody_theme_changed', { detail: { theme } }));
      }
    } catch (e) {
      console.warn('Could not persist theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      isLight: theme === 'light',
      isDark: theme === 'dark',
      toggleTheme,
      setTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isLight: true,
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {}
    };
  }
  return context;
}
