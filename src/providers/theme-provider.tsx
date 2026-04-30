'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { applyTheme } from '@/lib/theme/apply';
import { getStoredTheme, setStoredTheme } from '@/lib/theme/storage';
import {
  DEFAULT_THEME,
  THEMES,
  type ThemeDefinition,
  type ThemeName,
} from '@/lib/theme/themes';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  themes: ThemeDefinition[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    setStoredTheme(name);
    applyTheme(name);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themes: THEMES,
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
