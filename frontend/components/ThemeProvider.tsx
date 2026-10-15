'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  mode: Theme;
  toggleTheme: () => void;
  handleModeChange: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  mode: 'dark',
  toggleTheme: () => {},
  handleModeChange: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored === 'light' || stored === 'dark' ? stored : 'dark';
    setTheme(initial);
    document.documentElement.classList.toggle('light', initial === 'light');
    document.body.classList.toggle('light-mode', initial === 'light');
    document.body.classList.toggle('dark-mode', initial === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('light', next === 'light');
      document.body.classList.toggle('light-mode', next === 'light');
      document.body.classList.toggle('dark-mode', next === 'dark');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode: theme, toggleTheme, handleModeChange: toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
