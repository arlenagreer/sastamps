/**
 * San Antonio Philatelic Association Website
 * Main JavaScript File
 */

// Import calendar library
import { Calendar } from 'vanilla-calendar-pro';
import { calendarAdapter } from './calendar-adapter.js';
import { testCalendarAdapter, testModal, testCalendarComponent } from './calendar-test.js';
import { modal } from './modal.js';

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
    
    // Test calendar functionality (development only)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        testCalendarAdapter();
        testModal();
        testCalendarComponent();
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
    
    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function() {
        setTimeout(setViewportHeight, 100); // Small delay for iOS
    });
    
    // For iOS Safari - handle viewport changes more aggressively
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        let timer;
        window.addEventListener('scroll', function() {
            clearTimeout(timer);
            timer = setTimeout(setViewportHeight, 150);
        });
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
    
    menuToggle.addEventListener('click', function() {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        
        menuToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent scrolling when menu is open
        document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking on a link - simplified for better mobile compatibility
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        // Use a single, reliable event handler
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Close the menu immediately
            closeMenu();
            
            // For same-page anchors, prevent default and scroll
            if (href && href.startsWith('#') && href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    history.pushState(null, null, href);
                }
            }
            // For external links, let the browser handle navigation naturally
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(event.target) && 
            !menuToggle.contains(event.target)) {
            closeMenu();
        }
    });
    
    // Close menu when clicking on overlay
    overlay.addEventListener('click', function() {
        closeMenu();
    });
    
    // Close menu when pressing ESC key
    document.addEventListener('keydown', function(event) {
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
    
    // Show/hide the button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });
    
    // Smooth scroll to top when clicked
    backToTopButton.addEventListener('click', function(e) {
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
    
    contactForm.addEventListener('submit', function(e) {
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
        
        // If form is valid, show success message
        if (isValid) {
            // In a real application, you would submit the form data here
            // For this example, we'll just show a success message
            
            // Hide the form
            contactForm.style.display = 'none';
            
            // Create and show success message
            const successMessage = document.createElement('div');
            successMessage.classList.add('success-message');
            successMessage.innerHTML = `
                <h3>Thank you for your message!</h3>
                <p>We've received your inquiry and will respond as soon as possible.</p>
                <button class="btn btn-primary mt-3" id="send-another">Send Another Message</button>
            `;
            
            contactForm.parentNode.appendChild(successMessage);
            
            // Allow sending another message
            document.getElementById('send-another').addEventListener('click', function() {
                contactForm.reset();
                successMessage.remove();
                contactForm.style.display = 'block';
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
        header.addEventListener('click', function() {
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
 */
function setupImageGallery() {
    const galleryImages = document.querySelectorAll('.gallery-image');
    const lightbox = document.querySelector('.lightbox');
    
    if (!galleryImages.length || !lightbox) return;
    
    galleryImages.forEach(image => {
        image.addEventListener('click', function() {
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
        closeButton.addEventListener('click', function() {
            lightbox.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    }
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });
    
    // Close lightbox when pressing ESC
    document.addEventListener('keydown', function(e) {
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
    anchor.addEventListener('click', function(e) {
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
      .then(registration => {
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
        toggle.addEventListener('click', function() {
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