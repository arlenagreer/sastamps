/**
 * Contact Page Bundle
 * Only includes functionality needed for the contact page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { validateEmail, isPlausiblePhone } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';
import { sendToRelay, CLUB_EMAIL } from '../config/form-relay.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CSS_CLASSES
} from '../constants/index.js';

const logger = createLogger('ContactPage');

const PHONE_INVALID = 'Please enter a phone number using digits, spaces, dashes or a leading +, for example (210) 555-0123 or +44 20 7946 0958.';

const RELAY_UNCONFIRMED = `We couldn't confirm your message was sent (the connection timed out). It may still arrive, so please wait a few minutes before sending it again, or email us at ${CLUB_EMAIL}.`;

// Contact-specific functionality
function initializeContactPage() {
  // Contact form
  const contactForm = safeQuerySelector('#contact-form');
  if (contactForm) {
    initializeContactForm(contactForm);
  }

  // Contact information
  initializeContactInfo();

  // Back from the relay's redirect (#sent): the static notice is showing;
  // drop the fragment so a reload or a shared link doesn't claim a send.
  // (The class keeps it shown whether or not the browser re-evaluates :target.)
  const sentNotice = document.getElementById('sent');
  if (sentNotice && window.location.hash === '#sent' && window.history.replaceState) {
    sentNotice.classList.add('is-shown');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // Dropping the fragment cancels the browser's own scroll to it, so
    // scroll here (html's scroll-padding-top keeps it below the header).
    if (typeof sentNotice.scrollIntoView === 'function') {
      sentNotice.scrollIntoView({ block: 'start' });
    }
  }
}

function initializeContactForm(form) {
  // This script validates; the browser's own checks stay on for visitors
  // without JavaScript (the attribute is not in the HTML for that reason).
  form.noValidate = true;

  // Add real-time validation
  const inputs = form.querySelectorAll('input:not([type="hidden"]):not([name="_honey"]), select, textarea');
  inputs.forEach(input => {
    addEventListenerWithCleanup(input, 'blur', validateField);
    addEventListenerWithCleanup(input, input.tagName === 'SELECT' ? 'change' : 'input', debounce(validateField, 500));
  });

  // Handle form submission
  addEventListenerWithCleanup(form, 'submit', handleFormSubmission);

  // Initialize character counters
  const messageField = form.querySelector('#message');
  if (messageField) {
    initializeCharacterCounter(messageField);
  }
}

function validateField(event) {
  const field = event.target;
  const value = field.value.trim();
  const fieldName = field.name || field.id;

  // Clear previous validation
  clearFieldValidation(field);

  // Skip validation if field is empty (unless required)
  if (!value && !field.required) {
    clearFormErrorWhenFixed(field.form);
    return true;
  }

  let isValid = true;
  let errorMessage = '';

  // Field-specific validation
  switch (fieldName) {
  case 'name':
  case 'firstName':
  case 'lastName':
    if (value.length < 2) {
      isValid = false;
      errorMessage = 'Name must be at least 2 characters long';
    }
    break;

  case 'email':
    if (!validateEmail(value)) {
      isValid = false;
      errorMessage = 'Please enter a valid email address';
    }
    break;

  case 'phone':
    if (value && !isPlausiblePhone(value)) {
      isValid = false;
      errorMessage = PHONE_INVALID;
    }
    break;

  case 'message':
    if (value.length < 10) {
      isValid = false;
      errorMessage = 'Message must be at least 10 characters long';
    } else if (value.length > 1000) {
      isValid = false;
      errorMessage = 'Message must be less than 1000 characters';
    }
    break;

  case 'subject':
    if (value.length < 5) {
      isValid = false;
      errorMessage = 'Subject must be at least 5 characters long';
    }
    break;
  }

  // Required field validation
  if (field.required && !value) {
    isValid = false;
    errorMessage = 'This field is required';
  }

  // Show validation result
  if (!isValid) {
    showFieldError(field, errorMessage);
  } else {
    showFieldSuccess(field);
  }

  clearFormErrorWhenFixed(field.form);
  return isValid;
}

// The form-level "Please correct the errors above" goes away as soon as no
// field shows an error, instead of lingering until the next submit.
function clearFormErrorWhenFixed(form) {
  if (!form || form.querySelector('.form-control.error')) {return;}
  const stale = form.querySelector('.form-message.validation-summary');
  if (stale) {stale.remove();}
}

function clearFieldValidation(field) {
  field.classList.remove('error', 'success');
  const errorElement = field.parentNode.querySelector('.field-error');
  if (errorElement) {
    errorElement.remove();
  }
}

function showFieldError(field, message) {
  field.classList.add('error');
  field.classList.remove('success');

  const errorElement = document.createElement('div');
  errorElement.className = 'field-error';
  errorElement.textContent = message;
  errorElement.setAttribute('role', 'alert');

  field.parentNode.appendChild(errorElement);
}

function showFieldSuccess(field) {
  field.classList.add('success');
  field.classList.remove('error');
}

function initializeCharacterCounter(textarea) {
  const maxLength = 1000;
  const counter = document.createElement('div');
  counter.className = 'character-counter';

  const updateCounter = () => {
    const remaining = maxLength - textarea.value.length;
    counter.textContent = `${remaining} characters remaining`;
    counter.className = `character-counter ${remaining < 50 ? 'warning' : ''}`;
  };

  textarea.parentNode.appendChild(counter);
  addEventListenerWithCleanup(textarea, 'input', updateCounter);
  updateCounter();
}

async function handleFormSubmission(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  // The button holds an icon as well as its label: keep the markup, not just
  // the text, so the icon comes back after a send.
  const originalButtonHTML = submitButton.innerHTML;

  // Validate all fields: the required ones, plus the optional phone when
  // filled in, so a number the page calls invalid is never sent anyway.
  const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
  const phoneField = form.querySelector('#phone');
  const toValidate = [...fields];
  if (phoneField && phoneField.value.trim()) {toValidate.push(phoneField);}
  let allValid = true;

  toValidate.forEach(field => {
    if (!validateField({ target: field })) {
      allValid = false;
    }
  });

  // A fresh attempt replaces any earlier "sent" notice (inline style so it
  // also wins over a :target the browser may still be matching).
  const sentNotice = document.getElementById('sent');
  if (sentNotice) {
    sentNotice.classList.remove('is-shown');
    sentNotice.style.display = 'none';
  }

  if (!allValid) {
    // Take the visitor to the first field to fix (its own error is right
    // under it); the summary stays beside the button.
    const firstInvalid = form.querySelector('.form-control.error');
    showFormMessage(ERROR_MESSAGES.VALIDATION_FAILED, `${CSS_CLASSES.ERROR} validation-summary`, { scroll: !firstInvalid });
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      if (typeof firstInvalid.scrollIntoView === 'function') {
        firstInvalid.scrollIntoView({ block: 'center' });
      }
    }
    return;
  }

  // Show loading state
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  try {
    // Collect form data (includes the relay's hidden _subject/_template/_honey
    // fields; _next only matters for the no-JavaScript submit).
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    delete data._next;
    data._subject = `SAPA website: ${data.subject || 'Contact form'} (from ${data.name})`;

    // Deliver through the email relay (js/config/form-relay.js), to the
    // recipient named in the form's own action.
    const { outcome, message, error } = await sendToRelay(data, { relayUrl: form.action });

    if (outcome === 'sent') {
      showFormMessage(SUCCESS_MESSAGES.FORM_SUBMITTED, CSS_CLASSES.SUCCESS);
      form.reset();

      // Clear validation states
      toValidate.forEach(field => clearFieldValidation(field));
    } else {
      // 'unconfirmed' (timed out after sending): it may still arrive.
      // 'failed' (relay said no, offline, refused, unreadable): it did not.
      logger.error('Form submission failed:', outcome, message, error || '');
      showFormMessage(outcome === 'unconfirmed' ? RELAY_UNCONFIRMED : ERROR_MESSAGES.SUBMISSION_FAILED, CSS_CLASSES.ERROR);
    }

  } catch (error) {
    logger.error('Form submission failed:', error);
    showFormMessage(ERROR_MESSAGES.SUBMISSION_FAILED, CSS_CLASSES.ERROR);

  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonHTML;
  }
}

function showFormMessage(message, type, { scroll = true } = {}) {
  // Remove existing message
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageElement = document.createElement('div');
  messageElement.className = `form-message ${type}`;
  messageElement.textContent = message;
  messageElement.setAttribute('role', 'alert');

  // Show it beside the Send button, where the visitor is looking, and bring
  // it into view: at the top of the form it was off-screen on phones, so a
  // send looked like nothing happened. It stays until the next attempt.
  const form = document.querySelector('#contact-form');
  const submitGroup = form.querySelector('#submit-btn')?.closest('.form-group');
  if (submitGroup) {
    submitGroup.insertAdjacentElement('afterend', messageElement);
  } else {
    form.appendChild(messageElement);
  }
  if (scroll && typeof messageElement.scrollIntoView === 'function') {
    messageElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function initializeContactInfo() {
  // Add click-to-copy functionality for contact details
  const contactDetails = document.querySelectorAll('[data-copy]');
  contactDetails.forEach(element => {
    addEventListenerWithCleanup(element, 'click', (e) => {
      const textToCopy = e.target.dataset.copy || e.target.textContent;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showCopyFeedback(e.target);
        }).catch(err => {
          logger.error('Failed to copy:', err);
        });
      }
    });
  });
}

function showCopyFeedback(element) {
  const originalText = element.textContent;
  element.textContent = 'Copied!';
  element.style.backgroundColor = '#e8f5e8';

  setTimeout(() => {
    element.textContent = originalText;
    element.style.backgroundColor = '';
  }, 1500);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContactPage);
} else {
  initializeContactPage();
}
