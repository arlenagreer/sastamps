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
  API_ENDPOINTS,
  CSS_CLASSES
} from '../constants/index.js';

const logger = createLogger('ContactPage');

// Contact-specific functionality
function initializeContactPage() {
  // Contact form
  const contactForm = safeQuerySelector('#contact-form');
  if (contactForm) {
    initializeContactForm(contactForm);
  }

  // Contact information
  initializeContactInfo();

  // Back from a no-JavaScript submit: the relay redirects to ?sent=1.
  if (contactForm && new URLSearchParams(window.location.search).get('sent') === '1') {
    showFormMessage(SUCCESS_MESSAGES.FORM_SUBMITTED, CSS_CLASSES.SUCCESS);
  }
}

function initializeContactForm(form) {
  // Add real-time validation
  const inputs = form.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    addEventListenerWithCleanup(input, 'blur', validateField);
    addEventListenerWithCleanup(input, 'input', debounce(validateField, 500));
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

  // Show loading state
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  try {
    // Collect form data (includes the relay's hidden _subject/_template/_honey
    // fields; _next only matters for the no-JavaScript submit).
    const data = Object.fromEntries(new FormData(form).entries());
    delete data._next;
    data._subject = `SAPA website: ${data.subject || 'Contact form'} (from ${data.name})`;

    // Deliver through the email relay (see API_ENDPOINTS.CONTACT_FORM).
    const response = await fetch(API_ENDPOINTS.CONTACT_FORM, {
      method: 'POST',
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
    showFormMessage(ERROR_MESSAGES.SUBMISSION_FAILED, CSS_CLASSES.ERROR);

  } finally {
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
