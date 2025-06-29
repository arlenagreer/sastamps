/**
 * San Antonio Philatelic Association Website
 * Main JavaScript File
 */

// Import calendar library
import { Calendar } from 'vanilla-calendar-pro';
import { calendarAdapter } from './calendar-adapter.js';
import { modal } from './modal.js';
import { reminderSystem } from './reminder-system.js';

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
 * Safe DOM query selector with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (defaults to document)
 * @returns {Element|null} - Found element or null
 */
function safeQuerySelector(selector, context = document) {
    try {
        return context.querySelector(selector);
    } catch (error) {
        console.error(`Failed to query selector "${selector}":`, error);
        return null;
    }
}

/**
 * Safe localStorage getter with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or error occurs
 * @returns {*} - Parsed value or default
 */
function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.warn(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safe localStorage setter with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} - Success status
 */
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Error writing to localStorage key "${key}":`, error);
        return false;
    }
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
    try {
        // Fix mobile viewport height issues
        setupMobileViewportHeight();
        
        // Mobile menu toggle
        setupMobileMenu();
        
        // Back to top button functionality
        setupBackToTopButton();
        
        // Event countdown timer
        setupEventCountdown();
        
        // Form validation
        setupFormValidation();
        
        // Initialize accordion functionality (if needed)
        setupAccordion();
        
        // Initialize theme toggle
        setupThemeToggle();
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
 */
function setupMobileMenu() {
    try {
        const menuToggle = safeQuerySelector('.menu-toggle');
        const navMenu = safeQuerySelector('.nav-menu');
        
        if (!menuToggle || !navMenu) {
            console.warn('Mobile menu elements not found');
            return;
        }
        
        // Create overlay element if it doesn't exist
        let overlay = safeQuerySelector('.menu-overlay');
        if (!overlay) {
            try {
                overlay = document.createElement('div');
                overlay.className = 'menu-overlay';
                document.body.appendChild(overlay);
            } catch (error) {
                console.error('Failed to create menu overlay:', error);
                return;
            }
        }
        
        // Helper function to close the menu
        function closeMenu() {
            try {
                navMenu.classList.remove('active');
                overlay.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('menu-open');
            } catch (error) {
                console.error('Error closing menu:', error);
            }
        }
        
        addEventListenerWithCleanup(menuToggle, 'click', function() {
            try {
                const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
                
                menuToggle.setAttribute('aria-expanded', !isExpanded);
                navMenu.classList.toggle('active');
                overlay.classList.toggle('active');
                
                // Prevent scrolling when menu is open
                document.body.classList.toggle('menu-open');
            } catch (error) {
                console.error('Error toggling menu:', error);
            }
        });
        
        // Handle all mobile menu navigation links
        try {
            const allNavLinks = navMenu.querySelectorAll('a');
            allNavLinks.forEach(link => {
                addEventListenerWithCleanup(link, 'click', function(e) {
                    try {
                        const href = this.getAttribute('href');
                        
                        // For same-page anchors, prevent default and scroll
                        if (href && href.startsWith('#') && href !== '#') {
                            e.preventDefault();
                            const target = safeQuerySelector(href);
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth' });
                                try {
                                    history.pushState(null, null, href);
                                } catch (historyError) {
                                    console.warn('Failed to update history:', historyError);
                                }
                            }
                            closeMenu();
                        } else if (href && !href.startsWith('#')) {
                            // For page navigation, use direct navigation
                            e.preventDefault();
                            closeMenu();
                            // Use a short delay to allow menu close animation, then navigate
                            setTimeout(() => {
                                try {
                                    window.location.href = href;
                                } catch (navError) {
                                    console.error('Failed to navigate:', navError);
                                }
                            }, 100);
                        }
                    } catch (linkError) {
                        console.error('Error handling menu link click:', linkError);
                    }
                });
            });
        } catch (navLinksError) {
            console.error('Error setting up navigation links:', navLinksError);
        }
        
        // Close menu when clicking outside
        addEventListenerWithCleanup(document, 'click', function(event) {
            try {
                if (navMenu.classList.contains('active') && 
                    !navMenu.contains(event.target) && 
                    !menuToggle.contains(event.target)) {
                    closeMenu();
                }
            } catch (error) {
                console.error('Error handling outside click:', error);
            }
        });
        
        // Close menu when clicking on overlay
        addEventListenerWithCleanup(overlay, 'click', function() {
            closeMenu();
        });
        
        // Close menu when pressing ESC key
        addEventListenerWithCleanup(document, 'keydown', function(event) {
            try {
                if (event.key === 'Escape' && navMenu.classList.contains('active')) {
                    closeMenu();
                }
            } catch (error) {
                console.error('Error handling ESC key:', error);
            }
        });
        
    } catch (error) {
        console.error('Error setting up mobile menu:', error);
    }
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
            countdownElement.innerHTML = '<span class="countdown-error">Invalid event date</span>';
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
                    countdownElement.innerHTML = '<span class="countdown-complete">Event is happening now!</span>';
                    return;
                }
                
                // Calculate days, hours, minutes, seconds
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                // Display the countdown
                countdownElement.innerHTML = `
                    <div class="countdown-unit">
                        <span class="countdown-number">${days}</span>
                        <span class="countdown-label">Day${days !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="countdown-unit">
                        <span class="countdown-number">${hours}</span>
                        <span class="countdown-label">Hour${hours !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="countdown-unit">
                        <span class="countdown-number">${minutes}</span>
                        <span class="countdown-label">Minute${minutes !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="countdown-unit">
                        <span class="countdown-number">${seconds}</span>
                        <span class="countdown-label">Second${seconds !== 1 ? 's' : ''}</span>
                    </div>
                `;
            } catch (error) {
                console.error('Error updating countdown display:', error);
                clearInterval(countdownInterval);
                countdownElement.innerHTML = '<span class="countdown-error">Countdown error</span>';
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
                    successMessage.innerHTML = `
                        <h3>Thank you for your message!</h3>
                        <p>${data.message || "We've received your inquiry and will respond as soon as possible."}</p>
                        <button class="btn btn-primary mt-3" id="send-another">Send Another Message</button>
                    `;
                    
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
// eslint-disable-next-line no-unused-vars
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
          console.log('ServiceWorker registration successful');
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

// Cleanup event listeners on page unload
window.addEventListener('beforeunload', cleanupEventListeners);

// Export functions that might be used in the future
export { setupImageGallery };