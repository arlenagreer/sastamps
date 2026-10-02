/**
 * The free FormSubmit email relay that delivers the site's forms, and the one
 * routine that sends to it (used by the contact form and the meeting RSVP).
 *
 * The site is static (GitHub Pages) and cannot send mail itself. contact.html
 * names the same address in its form's action (the no-JavaScript fallback);
 * everything JavaScript-only reads it from here. scripts/check-site-build.js
 * fails the build check if the two ever name different recipients.
 */
export const FORM_RELAY_URL = 'https://formsubmit.co/arlenagreer@gmail.com';

// Where visitors are told to write when a send fails.
export const CLUB_EMAIL = 'loz33@hotmail.com';

// Milliseconds to wait for the relay (answer and body) before giving up.
export const RELAY_TIMEOUT_MS = 30000;

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

/**
 * Send form fields through the relay.
 *
 * The request is form-encoded with only an Accept header: a CORS "simple"
 * request, so the browser posts directly with no OPTIONS preflight (a
 * preflight to the relay once timed out live, 2026-10-02, and the message was
 * lost before it was ever sent).
 *
 * Outcomes:
 * - 'sent': the relay read the fields and said success "true".
 * - 'failed': a definite no. The relay said "false" (this includes its
 *   one-time "form needs activation" reply), the browser is offline, the
 *   request was refused before or while it went out (a TypeError: network
 *   error, blocked by an extension or policy), or the reply was unreadable.
 * - 'unconfirmed': the request went out and we timed out waiting (for the
 *   answer or its body). The relay may have delivered it.
 *
 * The timer covers reading the body too, so a stalled reply cannot leave a
 * form stuck in "Sending...".
 *
 * @param {Object<string,string>} data - fields to send
 * @param {{relayUrl?: string, timeoutMs?: number}} [options]
 * @returns {Promise<{outcome: 'sent'|'failed'|'unconfirmed', message: string, error?: Error}>}
 */
export async function sendToRelay(data, { relayUrl = FORM_RELAY_URL, timeoutMs = RELAY_TIMEOUT_MS } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { outcome: 'failed', message: 'offline' };
  }
  // Manual timer, not AbortSignal.timeout (missing before Safari 16).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(relayAjaxUrl(relayUrl), {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      body: new URLSearchParams(data)
    });
    const text = await response.text(); // still under the timer
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      return { outcome: 'failed', message: `unreadable reply (HTTP ${response.status})`, error };
    }
    if (response.ok && result && String(result.success) === 'true') {
      return { outcome: 'sent', message: String(result.message || '') };
    }
    return { outcome: 'failed', message: String((result && result.message) || `HTTP ${response.status}`) };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return { outcome: 'unconfirmed', message: 'timed out', error };
    }
    return { outcome: 'failed', message: (error && error.message) || 'send failed', error };
  } finally {
    clearTimeout(timer);
  }
}
