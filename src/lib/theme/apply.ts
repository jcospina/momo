import type { ThemeName } from './themes';

export function applyTheme(name: ThemeName): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.schema = name;
}
