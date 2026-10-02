/**
 * The free FormSubmit email relay that delivers the site's forms.
 *
 * The site is static (GitHub Pages) and cannot send mail itself. contact.html
 * names the same address in its form's action (that page derives its AJAX URL
 * from the action); everything JavaScript-only, such as the meeting RSVP,
 * reads it from here. scripts/check-site-build.js fails the build check if
 * the two ever name different recipients.
 */
export const FORM_RELAY_URL = 'https://formsubmit.co/arlenagreer@gmail.com';

/**
 * The relay's AJAX endpoint for a relay URL: https://formsubmit.co/ajax/<recipient>.
 * It answers JSON ({success: "true"|"false", message}) instead of a redirect.
 * @param {string} [relayUrl]
 * @returns {string}
 */
export function relayAjaxUrl(relayUrl = FORM_RELAY_URL) {
  const url = new URL(relayUrl);
  if (!url.pathname.startsWith('/ajax/')) {
    url.pathname = `/ajax${url.pathname}`;
  }
  return url.href;
}

// Milliseconds to wait for the relay before calling a send unconfirmed.
export const RELAY_TIMEOUT_MS = 30000;
