/**
 * Contact Page Bundle
 * Only includes functionality needed for the contact page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { validateEmail, validatePhone } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CSS_CLASSES
} from '../constants/index.js';

const logger = createLogger('ContactPage');

const RELAY_TIMEOUT_MS = 30000;
const RELAY_UNCONFIRMED = "We couldn't confirm your message was sent (the connection timed out). It may still arrive, so please wait a few minutes before sending it again, or email us at loz33@hotmail.com.";

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
    if (value && !validatePhone(value)) {
      isValid = false;
      errorMessage = 'Please enter a valid phone number (XXX) XXX-XXXX';
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

  return isValid;
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
  const originalButtonText = submitButton.textContent;

  // Validate all fields
  const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
  let allValid = true;

  fields.forEach(field => {
    if (!validateField({ target: field })) {
      allValid = false;
    }
  });

  if (!allValid) {
    showFormMessage(ERROR_MESSAGES.VALIDATION_FAILED, CSS_CLASSES.ERROR);
    return;
  }

  // A fresh attempt replaces any earlier "sent" notice.
  const sentNotice = document.getElementById('sent');
  if (sentNotice) {
    sentNotice.classList.remove('is-shown');
  }
  let timer;

  // Show loading state
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  try {
    // Collect form data (includes the relay's hidden _subject/_template/_honey
    // fields; _next only matters for the no-JavaScript submit).
    const data = Object.fromEntries(new FormData(form).entries());
    delete data._next;
    data._subject = `SAPA website: ${data.subject || 'Contact form'} (from ${data.name})`;

    // Deliver through the email relay: the AJAX form of the form's own
    // action URL, so the recipient is set in one place (contact.html).
    const relay = new URL(form.action);
    if (!relay.pathname.startsWith('/ajax/')) {
      relay.pathname = `/ajax${relay.pathname}`;
    }
    // Manual timer, not AbortSignal.timeout (missing before Safari 16).
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
    const response = await fetch(relay.href, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    // FormSubmit answers {success: "true"|"false", message}; "false" includes
    // the one-time "form needs activation" reply, which must not read as sent.
    if (response.ok && String(result.success) === 'true') {
      showFormMessage(SUCCESS_MESSAGES.FORM_SUBMITTED, CSS_CLASSES.SUCCESS);
      form.reset();

      // Clear validation states
      fields.forEach(field => clearFieldValidation(field));

    } else {
      throw new Error(result.message || ERROR_MESSAGES.SUBMISSION_FAILED);
    }

  } catch (error) {
    logger.error('Form submission failed:', error);
    // A timeout means we don't know: the relay may still deliver it.
    showFormMessage(error && error.name === 'AbortError' ? RELAY_UNCONFIRMED : ERROR_MESSAGES.SUBMISSION_FAILED, CSS_CLASSES.ERROR);

  } finally {
    clearTimeout(timer);
    // Restore button state
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}

function showFormMessage(message, type) {
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

  // Insert at top of form
  const form = document.querySelector('#contact-form');
  form.insertBefore(messageElement, form.firstChild);

  // Auto-remove success messages
  if (type === 'success') {
    setTimeout(() => {
      messageElement.remove();
    }, 10000);
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
