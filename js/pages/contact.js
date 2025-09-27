/**
 * Contact Page Bundle
 * Only includes functionality needed for the contact page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { validateEmail, validatePhone } from '../utils/helpers.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_ENDPOINTS,
  ANALYTICS_EVENTS,
  CSS_CLASSES
} from '../constants/index.js';

// Contact-specific functionality
function initializeContactPage() {
  // Contact form
  const contactForm = safeQuerySelector('#contact-form');
  if (contactForm) {
    initializeContactForm(contactForm);
  }

  // Meeting location map
  const mapContainer = safeQuerySelector('#meeting-location-map');
  if (mapContainer) {
    initializeLocationMap(mapContainer);
  }

  // Contact information
  initializeContactInfo();
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
  const fields = form.querySelectorAll('input[required], textarea[required]');
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
    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add CSRF token if available
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      data.csrf_token = csrfToken;
    }

    // Import API client dynamically
    const { apiClient } = await import('../utils/api-client.js');

    // Submit to server
    const response = await fetch(API_ENDPOINTS.CONTACT_FORM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showFormMessage(SUCCESS_MESSAGES.FORM_SUBMITTED, CSS_CLASSES.SUCCESS);
      form.reset();

      // Clear validation states
      fields.forEach(field => clearFieldValidation(field));

      // Track successful submission
      if (typeof gtag === 'function') {
        gtag('event', ANALYTICS_EVENTS.CONTACT_FORM_SUBMIT, {
          success: true
        });
      }

    } else {
      throw new Error(result.message || ERROR_MESSAGES.SUBMISSION_FAILED);
    }

  } catch (error) {
    console.error('Form submission failed:', error);
    showFormMessage(ERROR_MESSAGES.SUBMISSION_FAILED, CSS_CLASSES.ERROR);

    // Track failed submission
    if (typeof gtag === 'function') {
      gtag('event', ANALYTICS_EVENTS.CONTACT_FORM_SUBMIT, {
        success: false,
        error: error.message
      });
    }

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

async function getCSRFToken() {
  try {
    const response = await fetch('csrf-token.php');
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
    return null;
  }
}

function initializeLocationMap(container) {
  // Static map implementation
  container.innerHTML = `
        <div class="map-container">
            <div class="map-placeholder">
                <h4>Meeting Location</h4>
                <address>
                    <strong>San Antonio Public Library</strong><br>
                    Central Branch - Conference Room B<br>
                    600 Soledad Street<br>
                    San Antonio, TX 78205
                </address>
                <div class="map-actions">
                    <a href="https://www.google.com/maps/search/?api=1&query=San+Antonio+Public+Library+Central+Branch" 
                       target="_blank" class="btn-secondary">
                        📍 Open in Google Maps
                    </a>
                    <button class="btn-secondary" onclick="copyAddress()">
                        📋 Copy Address
                    </button>
                </div>
            </div>
        </div>
    `;

  // Add copy address functionality
  window.copyAddress = function() {
    const address = 'San Antonio Public Library, Central Branch - Conference Room B, 600 Soledad Street, San Antonio, TX 78205';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        showCopyConfirmation();
      }).catch(err => {
        console.error('Failed to copy address:', err);
        fallbackCopyAddress(address);
      });
    } else {
      fallbackCopyAddress(address);
    }
  };

  function showCopyConfirmation() {
    const button = container.querySelector('button[onclick="copyAddress()"]');
    const originalText = button.textContent;
    button.textContent = '✅ Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }

  function fallbackCopyAddress(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      showCopyConfirmation();
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Please manually copy the address from above.');
    }

    document.body.removeChild(textArea);
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
          console.error('Failed to copy:', err);
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
