/**
 * Meeting RSVP: a small form in a modal <dialog> that emails the RSVP to the
 * club through the same free FormSubmit relay as the contact form.
 *
 * Nothing is stored: an RSVP counts as sent only when the relay confirms it,
 * and the "RSVP sent" state lasts for this page view only.
 *
 * The request is the contact form's (js/pages/contact.js): a form-encoded POST
 * with only an Accept header, which is a CORS "simple" request, so the browser
 * sends it directly with no OPTIONS preflight (a preflight once timed out live
 * and lost the message). A timeout or dropped connection is reported as
 * unconfirmed, never as sent and never as failed.
 */

import { escapeHTML } from '../utils/safe-dom.js';
import { validateEmail } from '../utils/helpers.js';
import { formatLongDate } from '../utils/meeting-calendar.js';
import { createLogger } from '../utils/logger.js';
import { relayAjaxUrl, RELAY_TIMEOUT_MS } from '../config/form-relay.js';

const logger = createLogger('RSVP');

const CLUB_EMAIL = 'loz33@hotmail.com';
const MAX_GUESTS = 9;
const NOTE_MAX = 500;

export const RSVP_MESSAGES = {
  invalid: 'Please correct the errors above before sending.',
  failed: `Sorry, your RSVP could not be sent. Please try again, or email ${CLUB_EMAIL}.`,
  unconfirmed: `We couldn't confirm your RSVP was sent (the connection timed out). It may still arrive, so please wait a few minutes before sending it again, or email ${CLUB_EMAIL}.`
};

// Meeting ids whose RSVP the relay confirmed during this page view.
const sentThisView = new Set();

export function isRsvpSent(meetingId) {
  return sentThisView.has(meetingId);
}

let dialog = null;
let current = null; // { meeting, opener, onSent }
let sending = false;

/**
 * The relay's _subject line.
 * @param {Object} meeting
 * @param {string} name
 * @param {number} guests
 * @returns {string}
 */
export function rsvpSubject(meeting, name, guests) {
  return `SAPA RSVP: ${meeting.title}, ${formatLongDate(meeting.date)} — ${name} (+${guests} ${guests === 1 ? 'guest' : 'guests'})`;
}

function buildDialog() {
  const el = document.createElement('dialog');
  el.id = 'rsvp-dialog';
  el.className = 'rsvp-dialog';
  el.setAttribute('aria-labelledby', 'rsvp-title');
  el.setAttribute('aria-describedby', 'rsvp-meeting');
  const guestOptions = Array.from({ length: MAX_GUESTS + 1 }, (_, n) =>
    `<option value="${n}">${n === 0 ? 'Just me' : `Me + ${n}`}</option>`).join('');
  el.innerHTML = `
    <form class="rsvp-form" novalidate>
      <div class="rsvp-header">
        <h2 id="rsvp-title" class="rsvp-title">RSVP</h2>
        <button type="button" class="rsvp-close" aria-label="Close RSVP form"><span aria-hidden="true">&times;</span></button>
      </div>
      <p id="rsvp-meeting" class="rsvp-meeting"></p>
      <p class="rsvp-help">Your RSVP is emailed to the club. Fields marked <span aria-hidden="true">*</span><span class="sr-only">required</span> are required.</p>
      <p class="rsvp-already" hidden>You already sent an RSVP for this meeting. Send another only to change it.</p>
      <input type="text" name="_honey" class="rsvp-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" hidden>
      <div class="rsvp-field">
        <label for="rsvp-name">Your name <span aria-hidden="true">*</span></label>
        <input type="text" id="rsvp-name" name="name" autocomplete="name" required maxlength="100" aria-describedby="rsvp-name-error">
        <p id="rsvp-name-error" class="rsvp-error" hidden></p>
      </div>
      <div class="rsvp-field">
        <label for="rsvp-email">Email <span aria-hidden="true">*</span></label>
        <input type="email" id="rsvp-email" name="email" autocomplete="email" required maxlength="200" aria-describedby="rsvp-email-error">
        <p id="rsvp-email-error" class="rsvp-error" hidden></p>
      </div>
      <div class="rsvp-field">
        <label for="rsvp-guests">Guests coming with you</label>
        <select id="rsvp-guests" name="guests">${guestOptions}</select>
      </div>
      <div class="rsvp-field">
        <label for="rsvp-note">Note (optional)</label>
        <textarea id="rsvp-note" name="note" rows="3" maxlength="${NOTE_MAX}"></textarea>
      </div>
      <div class="rsvp-actions">
        <button type="submit" class="btn btn-primary rsvp-submit">Send RSVP</button>
        <button type="button" class="btn btn-secondary rsvp-cancel">Cancel</button>
      </div>
      <p class="rsvp-result" role="alert" hidden></p>
    </form>`;
  document.body.appendChild(el);

  const form = el.querySelector('form');
  form.addEventListener('submit', handleSubmit);
  el.querySelector('.rsvp-close').addEventListener('click', closeRsvpDialog);
  el.querySelector('.rsvp-cancel').addEventListener('click', closeRsvpDialog);
  // Escape is handled here, not left to the browser, so it closes only this
  // dialog (the meeting details dialog underneath listens on document) and
  // focus goes back to the RSVP button.
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeRsvpDialog();
    }
  });
  el.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeRsvpDialog();
  });
  // A click on the backdrop (outside the form box) closes, as for the details dialog.
  el.addEventListener('click', (event) => {
    if (event.target === el) {
      closeRsvpDialog();
    }
  });
  for (const id of ['rsvp-name', 'rsvp-email']) {
    const input = el.querySelector(`#${id}`);
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        validateField(input);
        clearSummaryWhenFixed();
      }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        validateField(input);
        clearSummaryWhenFixed();
      }
    });
  }
  return el;
}

/**
 * Open the RSVP form for an upcoming meeting.
 * @param {Object} meeting - meetings.json entry
 * @param {HTMLElement} opener - the RSVP button; focus returns to it
 * @param {{onSent?: Function}} [options] - onSent(meetingId) after a confirmed send
 */
export function openRsvpDialog(meeting, opener, { onSent } = {}) {
  if (!meeting || meeting.cancelled) {
    return;
  }
  if (!dialog) {
    dialog = buildDialog();
  }
  if (dialog.open) {
    return;
  }
  current = { meeting, opener, onSent };
  dialog.querySelector('#rsvp-meeting').textContent = `${meeting.title}, ${formatLongDate(meeting.date)}`;
  dialog.querySelector('.rsvp-already').hidden = !isRsvpSent(meeting.id);
  setResult('', '');
  for (const input of dialog.querySelectorAll('#rsvp-name, #rsvp-email')) {
    clearFieldError(input);
  }
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  dialog.querySelector('#rsvp-name').focus();
}

export function closeRsvpDialog() {
  if (!dialog || !dialog.open || sending) {
    return;
  }
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
  const opener = current && current.opener;
  current = null;
  if (opener && opener.isConnected && typeof opener.focus === 'function') {
    opener.focus();
  }
}

function setFieldError(input, message) {
  const error = dialog.querySelector(`#${input.id}-error`);
  input.setAttribute('aria-invalid', 'true');
  input.classList.add('rsvp-invalid');
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

function clearFieldError(input) {
  const error = dialog.querySelector(`#${input.id}-error`);
  input.removeAttribute('aria-invalid');
  input.classList.remove('rsvp-invalid');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}

function validateField(input) {
  const value = input.value.trim();
  let message = '';
  if (input.name === 'name') {
    if (!value) {
      message = 'Please enter your name.';
    } else if (value.length < 2) {
      message = 'Your name must be at least 2 characters.';
    }
  } else if (input.name === 'email') {
    if (!value) {
      message = 'Please enter your email address.';
    } else if (!validateEmail(value)) {
      message = 'Please enter a valid email address, for example name@example.com.';
    }
  }
  if (message) {
    setFieldError(input, message);
    return false;
  }
  clearFieldError(input);
  return true;
}

function clearSummaryWhenFixed() {
  const result = dialog.querySelector('.rsvp-result');
  if (result.dataset.kind === 'invalid' && !dialog.querySelector('[aria-invalid="true"]')) {
    setResult('', '');
  }
}

/**
 * Show the outcome beside the Send button and bring it into view.
 * @param {string} message - '' hides it
 * @param {'success'|'error'|'invalid'|''} kind
 */
function setResult(message, kind) {
  const result = dialog.querySelector('.rsvp-result');
  result.textContent = message;
  result.hidden = !message;
  result.className = `rsvp-result${kind ? ` rsvp-result-${kind === 'success' ? 'success' : 'error'}` : ''}`;
  result.dataset.kind = kind;
  if (message && typeof result.scrollIntoView === 'function') {
    result.scrollIntoView({ block: 'nearest' });
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (sending || !current) {
    return;
  }
  const form = event.currentTarget;
  const { meeting, onSent } = current;
  const nameInput = form.querySelector('#rsvp-name');
  const emailInput = form.querySelector('#rsvp-email');

  const fields = [nameInput, emailInput];
  const valid = fields.map(validateField);
  if (valid.includes(false)) {
    setResult(RSVP_MESSAGES.invalid, 'invalid');
    const first = fields.find((input) => input.getAttribute('aria-invalid') === 'true');
    if (first) {
      first.focus();
    }
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const guests = Math.min(MAX_GUESTS, Math.max(0, parseInt(form.querySelector('#rsvp-guests').value, 10) || 0));
  const note = form.querySelector('#rsvp-note').value.trim().slice(0, NOTE_MAX);
  const longDate = formatLongDate(meeting.date);

  const data = {
    _subject: rsvpSubject(meeting, name, guests),
    _template: 'table',
    _captcha: 'false',
    _honey: form.querySelector('[name="_honey"]').value,
    name,
    email,
    guests: String(guests),
    meeting: `${meeting.title}, ${longDate}`,
    note
  };

  const submit = form.querySelector('.rsvp-submit');
  const cancel = form.querySelector('.rsvp-cancel');
  const close = dialog.querySelector('.rsvp-close');
  sending = true;
  submit.disabled = true;
  cancel.disabled = true;
  close.disabled = true;
  submit.textContent = 'Sending...';
  setResult('', '');

  let timer;
  try {
    // Manual timer, not AbortSignal.timeout (missing before Safari 16).
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
    const response = await fetch(relayAjaxUrl(), {
      method: 'POST',
      signal: controller.signal,
      // Only an Accept header and a URLSearchParams body: a CORS simple
      // request, so there is no preflight to time out.
      headers: { Accept: 'application/json' },
      body: new URLSearchParams(data)
    });
    clearTimeout(timer); // the relay answered; don't abort while reading the body
    const result = await response.json();

    // {success: "true"|"false", message}; "false" includes the relay's
    // one-time "needs activation" reply, which is not a delivered RSVP.
    if (response.ok && String(result.success) === 'true') {
      sentThisView.add(meeting.id);
      form.reset();
      dialog.querySelector('.rsvp-already').hidden = true;
      setResult(`Thank you, ${name}! Your RSVP for ${meeting.title} on ${longDate} has been sent to the club.`, 'success');
      if (typeof onSent === 'function') {
        onSent(meeting.id);
      }
    } else {
      throw new Error(result && result.message ? result.message : 'The relay did not accept the RSVP');
    }
  } catch (error) {
    logger.error('RSVP send failed:', error);
    const unconfirmed = error && (error.name === 'AbortError' || error.name === 'TypeError');
    setResult(unconfirmed ? RSVP_MESSAGES.unconfirmed : RSVP_MESSAGES.failed, 'error');
  } finally {
    clearTimeout(timer);
    sending = false;
    submit.disabled = false;
    cancel.disabled = false;
    close.disabled = false;
    submit.textContent = 'Send RSVP';
  }
}

/**
 * The label and look of an RSVP button for a meeting.
 * @param {HTMLElement} button
 * @param {Object} meeting - needs id, title, date
 */
export function renderRsvpButton(button, meeting) {
  const sent = isRsvpSent(meeting.id);
  const what = `${meeting.title}, ${formatLongDate(meeting.date)}`;
  button.classList.toggle('rsvp-sent', sent);
  button.innerHTML = sent
    ? '<i class="fas fa-check" aria-hidden="true"></i> RSVP sent'
    : 'RSVP';
  button.setAttribute('aria-label', sent ? `RSVP sent for ${what}. Send another RSVP` : `RSVP for ${what}`);
}

/** Card markup for an RSVP button (rendered as a string with the card). */
export function rsvpButtonHTML(meeting) {
  const what = `${meeting.title}, ${formatLongDate(meeting.date)}`;
  const sent = isRsvpSent(meeting.id);
  const label = sent ? `RSVP sent for ${what}. Send another RSVP` : `RSVP for ${what}`;
  return `<button type="button" class="btn-rsvp${sent ? ' rsvp-sent' : ''}" data-meeting-id="${escapeHTML(meeting.id)}" aria-haspopup="dialog" aria-label="${escapeHTML(label)}">${sent ? '<i class="fas fa-check" aria-hidden="true"></i> RSVP sent' : 'RSVP'}</button>`;
}
