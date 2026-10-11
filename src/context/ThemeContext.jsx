import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Theme preference: 'system' | 'light' | 'dark'
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('foody_theme');
      if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (e) {}
    return 'system'; // Default to modern system theme preference
  });

  // Track real-time system color scheme
  const [systemScheme, setSystemScheme] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      setSystemScheme(e.matches ? 'dark' : 'light');
    };

    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  // Compute effective theme to apply ('light' or 'dark')
  const resolvedTheme = themeMode === 'system' ? systemScheme : themeMode;

  // Apply resolved theme to HTML root element, body, and storage
  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (resolvedTheme === 'light') {
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
      localStorage.setItem('foody_theme', themeMode);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foody_theme_changed', { 
          detail: { theme: resolvedTheme, themeMode } 
        }));
      }
    } catch (e) {
      console.warn('Could not persist theme:', e);
    }
  }, [resolvedTheme, themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeModeState(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  const setTheme = useCallback((newMode) => {
    if (newMode === 'system' || newMode === 'light' || newMode === 'dark') {
      setThemeModeState(newMode);
    }
  }, []);

  const value = useMemo(() => ({
    theme: resolvedTheme,
    themeMode,
    isLight: resolvedTheme === 'light',
    isDark: resolvedTheme === 'dark',
    isSystem: themeMode === 'system',
    toggleTheme,
    setTheme,
    setThemeMode: setTheme
  }), [resolvedTheme, themeMode, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
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
