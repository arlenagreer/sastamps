/**
 * Theme Management Utilities
 * Tree-shakable theme switching functionality
 */

import { safeLocalStorageGet, safeLocalStorageSet } from './safe-dom.js';

/**
 * Initialize theme system
 */
export function initializeTheme() {
  const savedTheme = safeLocalStorageGet('theme', 'light');
  applyTheme(savedTheme);

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  }
}

/**
 * Toggle between light and dark themes
 * @returns {string} The new theme name
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  applyTheme(newTheme);
  safeLocalStorageSet('theme', newTheme);

  return newTheme;
}

/**
 * Get current theme
 * @returns {string} Current theme name
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Apply theme to document
 * @param {string} theme - Theme name to apply
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
  }

  // Dispatch theme change event
  window.dispatchEvent(new CustomEvent('themechange', {
    detail: { theme }
  }));
}

/**
 * Handle system theme preference changes
 * @param {MediaQueryList} mediaQuery - The media query that changed
 */
function handleSystemThemeChange(mediaQuery) {
  const savedTheme = safeLocalStorageGet('theme');

  // Only auto-switch if user hasn't manually set a preference
  if (!savedTheme) {
    const preferredTheme = mediaQuery.matches ? 'dark' : 'light';
    applyTheme(preferredTheme);
  }
}
