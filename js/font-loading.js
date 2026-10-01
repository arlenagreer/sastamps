/**
 * Font loading: switch the page from the system-font fallback to the web fonts.
 *
 * css/font-loading.css shows system-ui until <html> has `fonts-loaded`, then
 * Open Sans / Merriweather. This script sets that class:
 * - at once on a repeat visit (remembered in localStorage), before first
 *   paint, so a returning visitor never sees the fallback; it is loaded as a
 *   plain synchronous <script> in <head> for that reason;
 * - after the web fonts load on a first visit.
 *
 * Every storage access is guarded. Where storage is blocked (site data
 * blocked in Safari or Chrome), merely reading `localStorage` throws; an
 * unguarded call killed the script, the class was never set, and the page
 * stayed on system-ui for good. Storage only speeds up repeat visits; it must
 * never decide whether the web fonts are shown.
 *
 * Self-contained on purpose (no imports): it runs in <head> before any other
 * script, and pulling in the shared logger would add ~5 KB to every page.
 */
(() => {
  const root = document.documentElement;
  const KEY = 'fonts-loaded';
  const FONTS = [
    ['400', 'Open Sans'],
    ['600', 'Open Sans'],
    ['700', 'Open Sans'],
    ['400', 'Merriweather'],
    ['700', 'Merriweather']
  ];

  const remembered = () => {
    try {
      return window.localStorage.getItem(KEY) === 'true';
    } catch (_e) {
      return false;
    }
  };

  const remember = () => {
    try {
      window.localStorage.setItem(KEY, 'true');
    } catch (_e) {
      // Storage blocked: the next visit loads the fonts again. Nothing else.
    }
  };

  const showWebFonts = () => {
    root.classList.remove('fonts-loading');
    root.classList.add('fonts-loaded');
  };

  if (remembered()) {
    showWebFonts();
    return;
  }

  if (!document.fonts || typeof document.fonts.load !== 'function') {
    // No Font Loading API: the font-family stacks fall back by themselves.
    showWebFonts();
    return;
  }

  root.classList.add('fonts-loading');
  const loads = FONTS.map(([weight, family]) =>
    document.fonts.load(`${weight} 1em "${family}"`, 'BESbswy').catch(() => null)
  );
  Promise.all(loads).then(() => {
    // Shown even if a font failed to load: each stack has system fallbacks.
    showWebFonts();
    remember();
  });
})();
