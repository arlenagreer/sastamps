/**
 * Scroll so an element's top sits just below everything pinned to the top of
 * the viewport: the sticky site header, plus any other sticky or fixed bar
 * that is (or will be, once scrolled) stuck at the top.
 *
 * Heights differ by viewport and page (wrapped title, phone menu, extra
 * bars), so they are measured at scroll time instead of relying on a fixed
 * scroll-margin.
 */

/**
 * The bottom edge, in viewport px, of the region covered by top-pinned
 * sticky/fixed elements while `target` is in view.
 * @param {Element} target - Element about to be scrolled to
 * @returns {number} Covered height from the top of the viewport
 */
export function pinnedTopInset(target) {
  let inset = 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  document.querySelectorAll('body *').forEach(el => {
    if (el === target || el.contains(target) || el.closest('dialog')) {return;}
    const style = window.getComputedStyle(el);
    if (style.position !== 'sticky' && style.position !== 'fixed') {return;}
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {return;}
    const top = parseFloat(style.top);
    if (Number.isNaN(top)) {return;} // top:auto is not pinned to the top
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.height > vh / 2) {return;} // menus, overlays
    if (rect.right <= 0 || rect.left >= vw) {return;} // off-canvas
    if (style.position === 'fixed') {
      if (rect.top <= top + 1 && rect.top < vh / 3) {
        inset = Math.max(inset, rect.bottom);
      }
      return;
    }
    // sticky: it pins at `top` while its containing block (the parent) is in
    // view, so it covers the target only when the target shares that parent.
    if (el.parentElement && el.parentElement.contains(target)) {
      inset = Math.max(inset, top + rect.height);
    }
  });
  return inset;
}

/**
 * @param {Element|null} element - Element to bring into view
 * @param {{gap?: number, behavior?: ScrollBehavior}} [options] - Space below
 *   the pinned region in px (default 12) and scroll behaviour
 */
export function scrollBelowHeader(element, { gap = 12, behavior = 'smooth' } = {}) {
  if (!element) {return;}
  const inset = pinnedTopInset(element);
  const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - inset - gap);
  try {
    window.scrollTo({ top, behavior });
  } catch {
    window.scrollTo(0, top); // browsers without the 'instant' keyword
  }
}

/**
 * For a deep link followed on page load: scroll now, then once more after
 * web fonts and late layout settle (they can move the target or change the
 * header's height), unless the visitor has scrolled in the meantime.
 * @param {Element|null} element - Element to bring into view
 */
export function scrollBelowHeaderOnLoad(element) {
  if (!element) {return;}
  scrollBelowHeader(element, { behavior: 'instant' });
  let userScrolled = false;
  const markUser = () => { userScrolled = true; };
  ['wheel', 'touchstart', 'keydown'].forEach(type => window.addEventListener(type, markUser, { once: true, passive: true }));
  const settle = () => {
    if (!userScrolled && element.isConnected) {
      scrollBelowHeader(element, { behavior: 'instant' });
    }
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(settle, settle);
  if (document.readyState === 'complete') {
    setTimeout(settle, 0);
  } else {
    window.addEventListener('load', settle, { once: true });
  }
}
