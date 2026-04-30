import { THEME_STORAGE_KEY } from './storage';
import { DEFAULT_THEME, THEMES } from './themes';

const allowedNames = THEMES.map(theme => theme.name);

/**
 * Synchronous string injected into <head> via dangerouslySetInnerHTML.
 * Reads the stored theme and applies `data-schema` before paint to
 * prevent a flash of the default theme on hydration.
 */
export const themeAntiFlashScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var allowed=${JSON.stringify(allowedNames)};if(allowed.indexOf(t)===-1){t=${JSON.stringify(DEFAULT_THEME)}}document.documentElement.dataset.schema=t;}catch(e){document.documentElement.dataset.schema=${JSON.stringify(DEFAULT_THEME)}}})();`;
