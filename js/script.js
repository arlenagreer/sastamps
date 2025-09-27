/**
 * San Antonio Philatelic Association Website
 * Main JavaScript File
 */

import { ErrorBoundary } from './error-boundary.js';
import { calendarLazyLoader } from './lazy-loader.js';
import { safeLocalStorageGet, safeLocalStorageSet, safeQuerySelector } from './utils/safe-dom.js';

// Store references to event listeners for cleanup
const eventListeners = new Map();

/**
 * Debounce utility function to prevent excessive function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Add event listener with cleanup tracking
 * @param {EventTarget} element - The element to attach the listener to
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 * @param {Object} options - Additional options for addEventListener
 */
function addEventListenerWithCleanup(element, event, handler, options) {
  element.addEventListener(event, handler, options);

  if (!eventListeners.has(element)) {
    eventListeners.set(element, []);
  }

  eventListeners.get(element).push({ event, handler, options });
}

/**
 * Remove all event listeners for cleanup
 */
function cleanupEventListeners() {
  eventListeners.forEach((listeners, element) => {
    listeners.forEach(({ event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
  });
  eventListeners.clear();
}



/**
 * Safe date parser with validation
 * @param {string} dateString - Date string to parse
 * @param {Date} fallback - Fallback date if parsing fails
 * @returns {Date} - Parsed date or fallback
 */
function safeDateParse(dateString, fallback = new Date()) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  } catch (error) {
    console.error(`Failed to parse date "${dateString}":`, error);
    return fallback;
  }
}

/**
 * Fetch with retry logic and comprehensive error handling
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Response>} - Response object
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Fetch attempt ${i + 1} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize page components

  try {
    // Create error boundaries for each component
    const createComponentBoundary = (name, fn, container = null) => {
      return new ErrorBoundary({
        componentName: name,
        container: container,
        onError: (error, componentName) => {
          console.error(`[${componentName}] Component failed:`, error);
          // Track component failures
          if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
              description: `Component failure: ${componentName}`,
              fatal: false
            });
          }
        },
        retryCallback: () => {
          try {
            fn();
          } catch (retryError) {
            console.error(`[${name}] Retry failed:`, retryError);
          }
        },
        maxRetries: 1
      }).wrap(fn);
    };

    // Wrap setup functions with error boundaries
    const mobileViewportSetup = createComponentBoundary('Mobile Viewport', setupMobileViewportHeight);
    const mobileMenuSetup = createComponentBoundary('Mobile Menu', setupMobileMenu);
    const backToTopSetup = createComponentBoundary('Back to Top', setupBackToTopButton);
    const countdownSetup = createComponentBoundary('Event Countdown', setupEventCountdown);
    const formValidationSetup = createComponentBoundary('Form Validation', setupFormValidation);
    const accordionSetup = createComponentBoundary('Accordion', setupAccordion);
    const themeToggleSetup = createComponentBoundary('Theme Toggle', setupThemeToggle);
    const contactFormSetup = createComponentBoundary('Contact Form', setupContactForm);

    // Initialize components with error isolation
    mobileViewportSetup();
    mobileMenuSetup();
    backToTopSetup();
    countdownSetup();
    formValidationSetup();
    accordionSetup();
    themeToggleSetup();
    contactFormSetup();

    // Setup error boundaries for dynamic content containers
    setupDynamicContentBoundaries();

  } catch (error) {
    console.error('Error during page initialization:', error);
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #d32f2f;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
    errorDiv.textContent = 'Some features may not work properly. Please refresh the page.';
    document.body.insertBefore(errorDiv, document.body.firstChild);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
});

/**
 * Fix Mobile Viewport Height Issues
 */
function setupMobileViewportHeight() {
  // Set CSS custom property for real viewport height
  function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  setViewportHeight();

  // Update on resize and orientation change with debouncing
  const debouncedSetViewportHeight = debounce(setViewportHeight, 250);
  addEventListenerWithCleanup(window, 'resize', debouncedSetViewportHeight);
  addEventListenerWithCleanup(window, 'orientationchange', function() {
    setTimeout(setViewportHeight, 100); // Small delay for iOS
  });

  // For iOS Safari - handle viewport changes more aggressively
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    const debouncedScrollHandler = debounce(setViewportHeight, 150);
    addEventListenerWithCleanup(window, 'scroll', debouncedScrollHandler);
  }
}

/**
 * Mobile Menu Toggle Functionality
 * Using CSS-only solution for better reliability - JavaScript implementation removed
 */
function setupMobileMenu() {
  // Intentionally empty - mobile menu is handled via CSS
}

/**
 * Back to Top Button Functionality
 */
function setupBackToTopButton() {
  try {
    const backToTopButton = safeQuerySelector('#back-to-top');

    if (!backToTopButton) {
      console.info('Back to top button not found - feature not available on this page');
      return;
    }

    // Show/hide the button based on scroll position with debouncing
    const scrollHandler = debounce(function() {
      try {
        if (window.scrollY > 300) {
          backToTopButton.style.display = 'block';
        } else {
          backToTopButton.style.display = 'none';
        }
      } catch (error) {
        console.error('Error updating back to top button visibility:', error);
      }
    }, 100);

    addEventListenerWithCleanup(window, 'scroll', scrollHandler);

    // Smooth scroll to top when clicked
    addEventListenerWithCleanup(backToTopButton, 'click', function(e) {
      try {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } catch (error) {
        console.error('Error scrolling to top:', error);
        // Fallback to instant scroll
        try {
          window.scrollTo(0, 0);
        } catch (fallbackError) {
          console.error('Fallback scroll failed:', fallbackError);
        }
      }
    });

  } catch (error) {
    console.error('Error setting up back to top button:', error);
  }
}

/**
 * Event Countdown Timer Functionality
 */
function setupEventCountdown() {
  try {
    const countdownElement = safeQuerySelector('#event-countdown');

    if (!countdownElement) {
      console.info('Event countdown element not found - feature not available on this page');
      return;
    }

    const eventDateAttribute = countdownElement.getAttribute('data-event-date');

    if (!eventDateAttribute) {
      console.warn('Event countdown missing data-event-date attribute');
      return;
    }

    const eventDate = safeDateParse(eventDateAttribute);
    const eventDateTime = eventDate.getTime();

    if (isNaN(eventDateTime)) {
      console.error('Invalid event date:', eventDateAttribute);
      countdownElement.innerHTML = '';
      const errorSpan = createSafeElement('span', {
        className: 'countdown-error',
        textContent: 'Invalid event date'
      });
      countdownElement.appendChild(errorSpan);
      return;
    }

    // Update the countdown every second
    const countdownInterval = setInterval(function() {
      try {
        const now = new Date().getTime();
        const distance = eventDateTime - now;

        // If the countdown is over, stop the interval and show event is starting
        if (distance < 0) {
          clearInterval(countdownInterval);
          countdownElement.innerHTML = '';
          const completeSpan = createSafeElement('span', {
            className: 'countdown-complete',
            textContent: 'Event is happening now!'
          });
          countdownElement.appendChild(completeSpan);
          return;
        }

        // Calculate days, hours, minutes, seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the countdown safely
        countdownElement.innerHTML = '';

        // Create countdown units
        const createCountdownUnit = (value, label) => {
          const unit = createSafeElement('div', { className: 'countdown-unit' });
          const number = createSafeElement('span', {
            className: 'countdown-number',
            textContent: String(value)
          });
          const labelSpan = createSafeElement('span', {
            className: 'countdown-label',
            textContent: label + (value !== 1 ? 's' : '')
          });
          unit.appendChild(number);
          unit.appendChild(labelSpan);
          return unit;
        };

        countdownElement.appendChild(createCountdownUnit(days, 'Day'));
        countdownElement.appendChild(createCountdownUnit(hours, 'Hour'));
        countdownElement.appendChild(createCountdownUnit(minutes, 'Minute'));
        countdownElement.appendChild(createCountdownUnit(seconds, 'Second'));
      } catch (error) {
        console.error('Error updating countdown display:', error);
        clearInterval(countdownInterval);
        countdownElement.innerHTML = '';
        const errorSpan = createSafeElement('span', {
          className: 'countdown-error',
          textContent: 'Countdown error'
        });
        countdownElement.appendChild(errorSpan);
      }
    }, 1000);

  } catch (error) {
    console.error('Error setting up event countdown:', error);
  }
}

/**
 * Form Validation Functionality
 */
function setupFormValidation() {
  try {
    const contactForm = safeQuerySelector('#contact-form');

    if (!contactForm) {
      console.info('Contact form not found - feature not available on this page');
      return;
    }

    addEventListenerWithCleanup(contactForm, 'submit', function(e) {
      e.preventDefault();

      // Basic form validation
      let isValid = true;
      const requiredFields = contactForm.querySelectorAll('[required]');

      // Reset previous error messages
      const errorMessages = contactForm.querySelectorAll('.error-message');
      errorMessages.forEach(msg => msg.remove());

      // Check all required fields
      requiredFields.forEach(field => {
        field.classList.remove('error');

        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');

          // Add error message after the field
          const errorMessage = document.createElement('p');
          errorMessage.classList.add('error-message');
          errorMessage.textContent = 'This field is required';

          field.parentNode.appendChild(errorMessage);
        }
      });

      // Email validation
      const emailField = contactForm.querySelector('input[type="email"]');
      if (emailField && emailField.value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(emailField.value)) {
          isValid = false;
          emailField.classList.add('error');

          const errorMessage = document.createElement('p');
          errorMessage.classList.add('error-message');
          errorMessage.textContent = 'Please enter a valid email address';

          emailField.parentNode.appendChild(errorMessage);
        }
      }

      // If form is valid, submit to server
      if (isValid) {
        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        // Prepare form data
        const formData = {
          name: contactForm.querySelector('[name="name"]').value.trim(),
          email: contactForm.querySelector('[name="email"]').value.trim(),
          phone: contactForm.querySelector('[name="phone"]')?.value.trim() || '',
          subject: contactForm.querySelector('[name="subject"]').value.trim(),
          message: contactForm.querySelector('[name="message"]').value.trim()
        };

        // Determine endpoint based on environment
        let endpoint = '/contact-handler.php';
        if (window.location.hostname.includes('netlify')) {
          endpoint = '/.netlify/functions/contact-form';
        }

        // Submit to server with validation using safe fetch
        fetchWithRetry(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.success) {
              // Hide the form
              contactForm.style.display = 'none';

              // Create and show success message
              const successMessage = document.createElement('div');
              successMessage.classList.add('success-message');
              // Create success message elements safely
              const heading = createSafeElement('h3', {
                textContent: 'Thank you for your message!'
              });
              const message = createSafeElement('p', {
                textContent: sanitizeText(data.message || 'We\'ve received your inquiry and will respond as soon as possible.')
              });
              const button = createSafeElement('button', {
                className: 'btn btn-primary mt-3',
                textContent: 'Send Another Message'
              });
              button.id = 'send-another';

              successMessage.appendChild(heading);
              successMessage.appendChild(message);
              successMessage.appendChild(button);

              contactForm.parentNode.appendChild(successMessage);

              // Allow sending another message
              const sendAnotherBtn = document.getElementById('send-another');
              if (sendAnotherBtn) {
                addEventListenerWithCleanup(sendAnotherBtn, 'click', function() {
                  contactForm.reset();
                  successMessage.remove();
                  contactForm.style.display = 'block';
                });
              }
            } else {
              // Handle server-side validation errors
              if (data.errors) {
                Object.keys(data.errors).forEach(fieldName => {
                  const field = contactForm.querySelector(`[name="${fieldName}"]`);
                  if (field) {
                    field.classList.add('error');

                    // Remove existing error message if any
                    const existingError = field.parentNode.querySelector('.error-message');
                    if (existingError) {
                      existingError.remove();
                    }

                    // Add new error message
                    const errorMessage = document.createElement('p');
                    errorMessage.classList.add('error-message');
                    errorMessage.textContent = data.errors[fieldName];
                    field.parentNode.appendChild(errorMessage);
                  }
                });
              }

              // Reset button
              submitButton.disabled = false;
              submitButton.textContent = originalButtonText;
            }
          })
          .catch(error => {
            console.error('Form submission error:', error);

            // Show generic error message
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('error-message', 'form-error');
            errorDiv.textContent = 'An error occurred. Please try again later.';
            contactForm.insertBefore(errorDiv, contactForm.firstChild);

            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;

            // Remove error message after 5 seconds
            setTimeout(() => {
              errorDiv.remove();
            }, 5000);
          });
      }
    });
  } catch (error) {
    console.error('Error setting up form validation:', error);
  }
}

/**
 * Accordion Functionality
 */
function setupAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  if (!accordionHeaders.length) return;

  accordionHeaders.forEach(header => {
    addEventListenerWithCleanup(header, 'click', function() {
      // Toggle active class on the header
      this.classList.toggle('active');

      // Toggle the content visibility
      const content = this.nextElementSibling;

      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        // Change icon if present
        const icon = this.querySelector('i');
        if (icon) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        // Change icon if present
        const icon = this.querySelector('i');
        if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
      }
    });
  });
}

/**
 * Image Gallery Functionality
 * (if needed for a gallery page in the future)
 * @unused - Reserved for future implementation
 */

function setupImageGallery() {
  const galleryImages = document.querySelectorAll('.gallery-image');
  const lightbox = document.querySelector('.lightbox');

  if (!galleryImages.length || !lightbox) return;

  galleryImages.forEach(image => {
    addEventListenerWithCleanup(image, 'click', function() {
      const imgSrc = this.getAttribute('data-full-img') || this.src;
      const imgCaption = this.getAttribute('alt');

      const lightboxImg = lightbox.querySelector('.lightbox-img');
      const lightboxCaption = lightbox.querySelector('.lightbox-caption');

      lightboxImg.src = imgSrc;
      lightboxCaption.textContent = imgCaption;

      lightbox.classList.add('active');
      document.body.classList.add('no-scroll');
    });
  });

  // Close lightbox when clicking the close button
  const closeButton = lightbox.querySelector('.lightbox-close');
  if (closeButton) {
    addEventListenerWithCleanup(closeButton, 'click', function() {
      lightbox.classList.remove('active');
      document.body.classList.remove('no-scroll');
    });
  }

  // Close lightbox when clicking outside the image
  addEventListenerWithCleanup(lightbox, 'click', function(e) {
    if (e.target === lightbox) {
      lightbox.classList.remove('active');
      document.body.classList.remove('no-scroll');
    }
  });

  // Close lightbox when pressing ESC
  addEventListenerWithCleanup(document, 'keydown', function(e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      lightbox.classList.remove('active');
      document.body.classList.remove('no-scroll');
    }
  });
}

/**
 * Smooth Scrolling for Anchor Links
 */
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
  addEventListenerWithCleanup(anchor, 'click', function(e) {
    e.preventDefault();

    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth'
      });

      // Update URL but without scrolling
      history.pushState(null, null, targetId);
    }
  });
});

/**
 * Activate Current Page in Navigation
 */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop();

  const navLinks = document.querySelectorAll('nav a');

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');

    if (linkPage === currentPage ||
            (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

// Call this function to highlight the current page in navigation
setActiveNavLink();

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          // ServiceWorker registration successful
        })
        .catch(err => {
          console.warn('ServiceWorker registration failed:', err);
          // Service worker failure shouldn't break the app
        });
    } catch (error) {
      console.warn('ServiceWorker registration error:', error);
    }
  });
} else {
  console.info('ServiceWorker not supported in this browser');
}

/**
 * Theme Toggle Functionality
 */
function setupThemeToggle() {
  try {
    // Check for saved theme preference or default to light
    const currentTheme = safeLocalStorageGet('theme', 'light');

    // Apply saved theme on page load
    try {
      if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (error) {
      console.error('Error applying saved theme:', error);
    }

    // Theme toggle functionality for all toggle buttons
    const themeToggles = document.querySelectorAll('.theme-toggle');

    if (themeToggles.length === 0) {
      console.info('No theme toggle buttons found');
      return;
    }

    themeToggles.forEach(toggle => {
      addEventListenerWithCleanup(toggle, 'click', function() {
        try {
          // Get current theme
          const currentTheme = document.documentElement.getAttribute('data-theme');
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

          // Apply new theme
          if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }

          // Save preference
          const saveResult = safeLocalStorageSet('theme', newTheme);
          if (!saveResult) {
            console.warn('Failed to save theme preference');
          }

          // Update button aria-label for accessibility
          const label = newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
          themeToggles.forEach(t => t.setAttribute('aria-label', label));
        } catch (error) {
          console.error('Error toggling theme:', error);
        }
      });

      // Set initial aria-label
      try {
        const initialTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const initialLabel = initialTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        toggle.setAttribute('aria-label', initialLabel);
      } catch (error) {
        console.error('Error setting initial aria-label:', error);
      }
    });

  } catch (error) {
    console.error('Error setting up theme toggle:', error);
  }
}

/**
 * Contact Form Setup with CSRF Protection
 */
function setupContactForm() {
  try {
    const contactForm = safeQuerySelector('#contact-form');
    if (!contactForm) return;

    // Fetch CSRF token when page loads
    fetchCSRFToken();

    addEventListenerWithCleanup(contactForm, 'submit', async function(e) {
      e.preventDefault();

      const submitBtn = safeQuerySelector('#submit-btn');
      const loadingSpinner = safeQuerySelector('#loading-spinner');
      const formMessage = safeQuerySelector('#form-message');

      try {
        // Check client-side rate limiting
        if (!checkClientRateLimit('contact_form', 3, 3600000)) { // 3 per hour
          if (formMessage) {
            formMessage.innerHTML = '<div class="error-message" style="color: var(--danger); background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem;"><i class="fas fa-exclamation-triangle"></i> Too many submissions. Please wait before trying again.</div>';
          }
          return;
        }

        // Enhanced client-side validation
        const inputs = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          message: data.message
        };

        let validationErrors = {};

        // Validate each input
        Object.keys(inputs).forEach(key => {
          if (inputs[key]) {
            const validation = validateAndSanitizeInput(inputs[key], key);
            if (!validation.isValid) {
              validationErrors[key] = validation.errors.join(', ');
            }
          }
        });

        // Show validation errors if any
        if (Object.keys(validationErrors).length > 0) {
          displayFormErrors(validationErrors);
          return;
        }

        // Clear previous messages
        clearFormErrors();
        if (formMessage) formMessage.innerHTML = '';

        // Show loading state
        if (submitBtn) {
          submitBtn.style.display = 'none';
        }
        if (loadingSpinner) {
          loadingSpinner.style.display = 'inline-block';
        }

        // Collect form data
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        // Submit form - use Netlify function if available, fallback to PHP
        const endpoint = window.location.hostname.includes('netlify') || window.location.hostname.includes('vercel')
          ? '/.netlify/functions/contact-form'
          : 'contact-handler.php';

        const response = await fetchWithRetry(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        }, 2);

        const result = await response.json();

        if (result.success) {
          // Success
          if (formMessage) {
            formMessage.innerHTML = '';
            const successDiv = createSafeElement('div', {
              className: 'success-message',
              style: {
                color: 'var(--success)',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginTop: '1rem'
              }
            });

            const icon = createSafeElement('i', { className: 'fas fa-check-circle' });
            successDiv.appendChild(icon);
            successDiv.appendChild(document.createTextNode(' ' + sanitizeText(result.message)));
            formMessage.appendChild(successDiv);
          }
          contactForm.reset();
          fetchCSRFToken(); // Get new token for next submission
        } else {
          // Handle validation errors
          if (result.errors) {
            displayFormErrors(result.errors);
          }

          if (formMessage && !Object.keys(result.errors || {}).length) {
            formMessage.innerHTML = '';
            const errorDiv = createSafeElement('div', {
              className: 'error-message',
              style: {
                color: 'var(--danger)',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginTop: '1rem'
              }
            });

            const icon = createSafeElement('i', { className: 'fas fa-exclamation-triangle' });
            errorDiv.appendChild(icon);
            errorDiv.appendChild(document.createTextNode(' There was an error sending your message. Please try again.'));
            formMessage.appendChild(errorDiv);
          }
        }

      } catch (error) {
        console.error('Contact form submission error:', error);
        if (formMessage) {
          formMessage.innerHTML = '';
          const errorDiv = createSafeElement('div', {
            className: 'error-message',
            style: {
              color: 'var(--danger)',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginTop: '1rem'
            }
          });

          const icon = createSafeElement('i', { className: 'fas fa-exclamation-triangle' });
          errorDiv.appendChild(icon);
          errorDiv.appendChild(document.createTextNode(' Network error. Please check your connection and try again.'));
          formMessage.appendChild(errorDiv);
        }
      } finally {
        // Hide loading state
        if (submitBtn) {
          submitBtn.style.display = 'inline-block';
        }
        if (loadingSpinner) {
          loadingSpinner.style.display = 'none';
        }
      }
    });

  } catch (error) {
    console.error('Error setting up contact form:', error);
  }
}

/**
 * Client-side rate limiting for form submissions
 * @param {string} key - Unique key for rate limiting
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} timeWindow - Time window in milliseconds
 * @returns {boolean} - True if request is allowed
 */
function checkClientRateLimit(key, maxRequests = 3, timeWindow = 3600000) { // 1 hour default
  try {
    const storageKey = `rate_limit_${key}`;
    const now = Date.now();

    const stored = safeLocalStorageGet(storageKey, []);
    const requests = Array.isArray(stored) ? stored : [];

    // Remove old requests
    const validRequests = requests.filter(timestamp => (now - timestamp) < timeWindow);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);

    // Save updated requests
    safeLocalStorageSet(storageKey, validRequests);

    return true;
  } catch (error) {
    console.warn('Rate limiting check failed:', error);
    return true; // Allow request if rate limiting fails
  }
}

/**
 * Enhanced input validation and sanitization
 * @param {string} input - Input to validate
 * @param {string} type - Input type (text, email, phone)
 * @returns {object} - Validation result
 */
function validateAndSanitizeInput(input, type = 'text') {
  const result = {
    isValid: true,
    sanitized: input,
    errors: []
  };

  // Basic safety checks
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      result.isValid = false;
      result.errors.push('Invalid characters detected');
      break;
    }
  }

  // Type-specific validation
  switch (type) {
  case 'email':
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    }
    break;

  case 'phone':
    const phonePattern = /^[\d\s\-\(\)\+\.]{10,}$/;
    if (input && !phonePattern.test(input)) {
      result.isValid = false;
      result.errors.push('Invalid phone format');
    }
    break;

  case 'text':
  default:
    // Length validation
    if (input.length > 5000) {
      result.isValid = false;
      result.errors.push('Input too long');
    }
    break;
  }

  // Sanitize output
  result.sanitized = sanitizeText(input);

  return result;
}

/**
 * Fetch CSRF token from server
 */
async function fetchCSRFToken() {
  try {
    // Use appropriate endpoint based on hosting environment
    const endpoint = window.location.hostname.includes('netlify') || window.location.hostname.includes('vercel')
      ? '/.netlify/functions/contact-form'
      : 'csrf-token.php';

    const response = await fetch(endpoint);
    const data = await response.json();

    const csrfTokenField = safeQuerySelector('#csrf-token');
    if (csrfTokenField && data.csrf_token) {
      csrfTokenField.value = data.csrf_token;
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
}

/**
 * Display form validation errors
 */
function displayFormErrors(errors) {
  Object.keys(errors).forEach(field => {
    const errorElement = safeQuerySelector(`#${field}-error`);
    const inputElement = safeQuerySelector(`#${field}`);

    if (errorElement) {
      // Use textContent to prevent XSS, and sanitize the error message
      errorElement.textContent = sanitizeText(errors[field]);
      errorElement.style.color = 'var(--danger)';
      errorElement.style.fontSize = '0.875rem';
      errorElement.style.marginTop = '0.25rem';
    }

    if (inputElement) {
      inputElement.style.borderColor = 'var(--danger)';
    }
  });
}

/**
 * Clear form validation errors
 */
function clearFormErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  const inputs = document.querySelectorAll('#contact-form .form-control');

  errorElements.forEach(element => {
    element.textContent = '';
  });

  inputs.forEach(input => {
    input.style.borderColor = '';
  });
}

/**
 * Safely create HTML elements with text content to prevent XSS
 * @param {string} tagName - The HTML tag name
 * @param {Object} options - Configuration object
 * @param {string} options.textContent - Safe text content
 * @param {string} options.className - CSS class names
 * @param {Object} options.style - Style properties
 * @returns {HTMLElement} The created element
 */
function createSafeElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.textContent) {
    element.textContent = options.textContent;
  }

  if (options.className) {
    element.className = options.className;
  }

  if (options.style) {
    Object.assign(element.style, options.style);
  }

  return element;
}

/**
 * Safely sanitize text input for display
 * @param {string} input - Raw text input
 * @returns {string} Sanitized text
 */
function sanitizeText(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Setup error boundaries for dynamic content containers
 */
function setupDynamicContentBoundaries() {
  try {
    // Meeting schedule container boundary
    const meetingContainer = safeQuerySelector('#meeting-schedule-container');
    if (meetingContainer) {
      const meetingBoundary = new ErrorBoundary({
        componentName: 'Meeting Schedule',
        container: meetingContainer,
        onError: (error) => {
          console.error('[Meeting Schedule] Failed to load:', error);
        },
        maxRetries: 2
      });
    }

    // Calendar container with lazy loading
    const calendarContainers = document.querySelectorAll('.calendar-container, #calendar-container, [class*="calendar"], [id*="calendar"]');
    calendarContainers.forEach((calendarContainer, index) => {
      if (calendarContainer) {
        // Set up lazy loading for calendar
        calendarLazyLoader.observe(
          calendarContainer,
          async (element) => {
            // Dynamic import of calendar component
            const { CalendarComponent } = await import('./calendar-component.js');

            // Load calendar with error boundary protection
            const calendarBoundary = new ErrorBoundary({
              componentName: `Calendar ${index + 1}`,
              container: element,
              maxRetries: 2
            });

            const loadCalendar = calendarBoundary.wrapAsync(async () => {
              return await CalendarComponent.lazyLoad(element);
            });

            return await loadCalendar();
          },
          {
            maxRetries: 2,
            fallbackContent: (error) => `
                            <div class="calendar-error" style="
                                background-color: #fff3cd;
                                color: #856404;
                                border: 1px solid #ffc107;
                                border-radius: var(--radius-md);
                                padding: 1rem;
                                text-align: center;
                            ">
                                <h3><i class="fas fa-calendar-times"></i> Calendar Unavailable</h3>
                                <p>Unable to load the calendar. Please try refreshing the page or contact us for meeting dates.</p>
                                <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                                    Email: <a href="mailto:loz33@hotmail.com">loz33@hotmail.com</a>
                                </p>
                            </div>
                        `
          }
        );
      }
    });

    // Search container boundary
    const searchContainer = safeQuerySelector('.search-container, #search-container');
    if (searchContainer) {
      const searchBoundary = new ErrorBoundary({
        componentName: 'Search',
        container: searchContainer,
        fallbackUI: (error) => `
                    <div class="search-error" style="
                        background-color: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                        border-radius: var(--radius-md);
                        padding: 1rem;
                        text-align: center;
                    ">
                        <h3><i class="fas fa-search-minus"></i> Search Unavailable</h3>
                        <p>The search feature is temporarily unavailable. Please try browsing our sections instead.</p>
                        <div style="margin-top: 1rem;">
                            <a href="newsletter.html" class="btn btn-primary" style="margin-right: 0.5rem;">Newsletters</a>
                            <a href="meetings.html" class="btn btn-primary">Meetings</a>
                        </div>
                    </div>
                `,
        maxRetries: 1
      });
    }

    // Newsletter content with lazy loading
    const newsletterContainers = document.querySelectorAll('.newsletter-content, [class*="newsletter"], [id*="newsletter"]');
    newsletterContainers.forEach((container, index) => {
      // Only apply to containers that seem to load dynamic content
      if (container.dataset.lazy === 'true' ||
                container.classList.contains('dynamic-content') ||
                container.querySelector('.loading, .spinner')) {

        calendarLazyLoader.observe(
          container,
          async (element) => {
            // Dynamic import of newsletter loader
            const { default: NewsletterLoader } = await import('./modules/newsletter-loader.js');
            
            const loader = new NewsletterLoader();
            const data = await loader.loadData();
            const newsletters = data.newsletters;

            // Render newsletter content
            if (newsletters && newsletters.length > 0) {
              element.innerHTML = newsletters.map(newsletter => `
                                <div class="newsletter-item">
                                    <h4>${newsletter.title}</h4>
                                    <p>${newsletter.description}</p>
                                    <a href="${newsletter.url}" target="_blank" class="btn btn-primary">
                                        <i class="fas fa-file-pdf"></i> View PDF
                                    </a>
                                </div>
                            `).join('');
            }
          },
          {
            placeholder: () => `
                            <div class="newsletter-placeholder" style="
                                background-color: #f8f9fa;
                                border: 2px dashed #dee2e6;
                                border-radius: var(--radius-md);
                                padding: 2rem;
                                text-align: center;
                                color: var(--medium);
                            ">
                                <i class="fas fa-newspaper" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                                <p>Newsletter content will load when scrolled into view</p>
                            </div>
                        `,
            fallbackContent: (error) => `
                            <div class="newsletter-error" style="
                                background-color: #e7f3ff;
                                color: #0066cc;
                                border: 1px solid #b3d9ff;
                                border-radius: var(--radius-md);
                                padding: 1rem;
                                text-align: center;
                            ">
                                <h4><i class="fas fa-newspaper"></i> Newsletter Content Unavailable</h4>
                                <p>Unable to load newsletter content. Please contact us for the latest issues.</p>
                            </div>
                        `,
            maxRetries: 1
          }
        );
      }
    });

    // Contact form specific boundary (additional protection)
    const contactForm = safeQuerySelector('#contact-form');
    if (contactForm) {
      const formMessageContainer = safeQuerySelector('#form-message');
      const contactFormBoundary = new ErrorBoundary({
        componentName: 'Contact Form Component',
        container: formMessageContainer,
        fallbackUI: (error) => `
                    <div class="contact-form-error" style="
                        background-color: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                        border-radius: var(--radius-md);
                        padding: 1rem;
                        text-align: center;
                    ">
                        <h4><i class="fas fa-exclamation-triangle"></i> Contact Form Error</h4>
                        <p>The contact form is experiencing issues. Please email us directly:</p>
                        <p><strong><a href="mailto:loz33@hotmail.com">loz33@hotmail.com</a></strong></p>
                    </div>
                `,
        maxRetries: 2
      });
    }

    // Add boundary to any other containers with dynamic content
    const dynamicContainers = document.querySelectorAll('[id*="schedule"], [id*="events"], [class*="loading"]');
    dynamicContainers.forEach((container, index) => {
      const containerBoundary = new ErrorBoundary({
        componentName: `Dynamic Content ${index + 1}`,
        container: container,
        maxRetries: 1
      });
    });

    // Error boundaries initialized successfully

  } catch (error) {
    console.error('Error setting up dynamic content boundaries:', error);
  }
}

// Cleanup event listeners on page unload
window.addEventListener('beforeunload', cleanupEventListeners);

// Export functions that might be used in the future
export { setupImageGallery, setupContactForm };
