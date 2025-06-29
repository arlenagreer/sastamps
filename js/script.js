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

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuToggle || !navMenu) return;
    
    // Create overlay element if it doesn't exist
    let overlay = document.querySelector('.menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        document.body.appendChild(overlay);
    }
    
    // Helper function to close the menu
    function closeMenu() {
        navMenu.classList.remove('active');
        overlay.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    }
    
    addEventListenerWithCleanup(menuToggle, 'click', function() {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        
        menuToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent scrolling when menu is open
        document.body.classList.toggle('menu-open');
    });
    
    // Handle all mobile menu navigation links
    const allNavLinks = navMenu.querySelectorAll('a');
    allNavLinks.forEach(link => {
        addEventListenerWithCleanup(link, 'click', function(e) {
            const href = this.getAttribute('href');
            
            // For same-page anchors, prevent default and scroll
            if (href && href.startsWith('#') && href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    history.pushState(null, null, href);
                }
                closeMenu();
            } else if (href && !href.startsWith('#')) {
                // For page navigation, use direct navigation
                e.preventDefault();
                closeMenu();
                // Use a short delay to allow menu close animation, then navigate
                setTimeout(() => {
                    window.location.href = href;
                }, 100);
            }
        });
    });
    
    // Close menu when clicking outside
    addEventListenerWithCleanup(document, 'click', function(event) {
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(event.target) && 
            !menuToggle.contains(event.target)) {
            closeMenu();
        }
    });
    
    // Close menu when clicking on overlay
    addEventListenerWithCleanup(overlay, 'click', function() {
        closeMenu();
    });
    
    // Close menu when pressing ESC key
    addEventListenerWithCleanup(document, 'keydown', function(event) {
        if (event.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });
}

/**
 * Back to Top Button Functionality
 */
function setupBackToTopButton() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (!backToTopButton) return;
    
    // Show/hide the button based on scroll position with debouncing
    const scrollHandler = debounce(function() {
        if (window.scrollY > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    }, 100);
    
    addEventListenerWithCleanup(window, 'scroll', scrollHandler);
    
    // Smooth scroll to top when clicked
    addEventListenerWithCleanup(backToTopButton, 'click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Event Countdown Timer Functionality
 */
function setupEventCountdown() {
    const countdownElement = document.getElementById('event-countdown');
    
    if (!countdownElement) return;
    
    const eventDateAttribute = countdownElement.getAttribute('data-event-date');
    
    if (!eventDateAttribute) return;
    
    const eventDate = new Date(eventDateAttribute).getTime();
    
    // Update the countdown every second
    const countdownInterval = setInterval(function() {
        const now = new Date().getTime();
        const distance = eventDate - now;
        
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
    }, 1000);
}

/**
 * Form Validation Functionality
 */
function setupFormValidation() {
    const contactForm = document.getElementById('contact-form');
    
    if (!contactForm) return;
    
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
            
            // Submit to server with validation
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
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
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

/**
 * Theme Toggle Functionality
 */
function setupThemeToggle() {
    // Check for saved theme preference or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply saved theme on page load
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Theme toggle functionality for all toggle buttons
    const themeToggles = document.querySelectorAll('.theme-toggle');
    
    themeToggles.forEach(toggle => {
        addEventListenerWithCleanup(toggle, 'click', function() {
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
            localStorage.setItem('theme', newTheme);
            
            // Update button aria-label for accessibility
            const label = newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
            themeToggles.forEach(t => t.setAttribute('aria-label', label));
        });
        
        // Set initial aria-label
        const initialTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const initialLabel = initialTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        toggle.setAttribute('aria-label', initialLabel);
    });
}

// Cleanup event listeners on page unload
window.addEventListener('beforeunload', cleanupEventListeners);

// Export functions that might be used in the future
export { setupImageGallery };