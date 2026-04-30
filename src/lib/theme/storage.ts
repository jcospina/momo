import { DEFAULT_THEME, isThemeName, type ThemeName } from './themes';

export const THEME_STORAGE_KEY = 'momo:theme';

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setStoredTheme(name: ThemeName): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
