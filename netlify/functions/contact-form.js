/**
 * Netlify Serverless Function for Contact Form
 * With server-side validation and CSRF protection
 */

const crypto = require('crypto');

// CSRF secret (in production, use environment variable)
const CSRF_SECRET = process.env.CSRF_SECRET || 'fallback-secret-key-change-in-production';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation for US numbers
const PHONE_REGEX = /^\d{10}$/;

// Spam patterns to check
const SPAM_PATTERNS = [
    /\b(viagra|cialis|casino|lottery|prize|winner)\b/i,
    /\b(click here|buy now|limited offer)\b/i,
    /<a\s+href/i,
    /\[url\]/i
];

// Rate limiting using in-memory store (resets on function cold start)
const submissionTracker = new Map();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const MAX_SUBMISSIONS = 3;

function validateEmail(email) {
    return EMAIL_REGEX.test(email);
}

function validatePhone(phone) {
    const cleaned = phone.replace(/[\s\-\(\)\.]+/g, '');
    return PHONE_REGEX.test(cleaned);
}

function sanitize(input) {
    return String(input).trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function checkSpam(text) {
    return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

function checkRateLimit(ip) {
    const now = Date.now();
    const userSubmissions = submissionTracker.get(ip) || [];
    
    // Clean old submissions
    const recentSubmissions = userSubmissions.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );
    
    if (recentSubmissions.length >= MAX_SUBMISSIONS) {
        return false;
    }
    
    // Add new submission
    recentSubmissions.push(now);
    submissionTracker.set(ip, recentSubmissions);
    return true;
}

function generateCSRFToken() {
    const timestamp = Date.now();
    const payload = `${timestamp}`;
    const signature = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(payload)
        .digest('hex');
    
    return `${timestamp}.${signature}`;
}

function validateCSRFToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    const parts = token.split('.');
    if (parts.length !== 2) {
        return false;
    }
    
    const [timestamp, signature] = parts;
    const now = Date.now();
    const tokenTime = parseInt(timestamp, 10);
    
    // Check if token is expired (1 hour)
    if (now - tokenTime > 3600000) {
        return false;
    }
    
    // Verify signature
    const expectedSignature = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(timestamp)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

exports.handler = async (event, context) => {
    // Handle GET requests for CSRF token generation
    if (event.httpMethod === 'GET') {
        const token = generateCSRFToken();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff'
            },
            body: JSON.stringify({ csrf_token: token })
        };
    }
    
    // Only accept POST requests for form submission
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const data = JSON.parse(event.body);
        const errors = {};
        
        // Get client IP for rate limiting
        const clientIp = event.headers['x-forwarded-for'] || 
                        event.headers['client-ip'] || 
                        'unknown';
        
        // CSRF Token Validation
        if (!data.csrf_token) {
            errors.csrf = 'Security token missing. Please refresh the page and try again.';
        } else if (!validateCSRFToken(data.csrf_token)) {
            errors.csrf = 'Invalid security token. Please refresh the page and try again.';
        }
        
        // Check rate limit
        if (!checkRateLimit(clientIp)) {
            errors.rate_limit = 'Too many submissions. Please try again later.';
        }
        
        // Validate required fields
        const requiredFields = ['name', 'email', 'subject', 'message'];
        for (const field of requiredFields) {
            if (!data[field] || !data[field].trim()) {
                errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
            }
        }
        
        // Sanitize and validate individual fields
        let name = '', email = '', phone = '', subject = '', message = '';
        
        if (data.name) {
            name = sanitize(data.name);
            if (name.length < 2) {
                errors.name = 'Name must be at least 2 characters';
            } else if (name.length > 100) {
                errors.name = 'Name must not exceed 100 characters';
            }
        }
        
        if (data.email) {
            email = sanitize(data.email);
            if (!validateEmail(email)) {
                errors.email = 'Please provide a valid email address';
            }
        }
        
        if (data.phone) {
            phone = sanitize(data.phone);
            if (phone && !validatePhone(phone)) {
                errors.phone = 'Please provide a valid US phone number';
            }
        }
        
        if (data.subject) {
            subject = sanitize(data.subject);
            if (subject.length < 3) {
                errors.subject = 'Subject must be at least 3 characters';
            } else if (subject.length > 200) {
                errors.subject = 'Subject must not exceed 200 characters';
            }
        }
        
        if (data.message) {
            message = sanitize(data.message);
            if (message.length < 10) {
                errors.message = 'Message must be at least 10 characters';
            } else if (message.length > 5000) {
                errors.message = 'Message must not exceed 5000 characters';
            }
        }
        
        // Check for spam
        const combinedText = `${name} ${email} ${subject} ${message}`;
        if (checkSpam(combinedText)) {
            errors.spam = 'Your message appears to contain spam content';
        }
        
        // If there are errors, return them
        if (Object.keys(errors).length > 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff'
                },
                body: JSON.stringify({
                    success: false,
                    errors: errors
                })
            };
        }
        
        // If using Netlify Forms, format the submission
        // Otherwise, you would send an email here using a service like SendGrid
        
        // For Netlify Forms integration
        const formData = new URLSearchParams();
        formData.append('form-name', 'contact');
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('subject', subject);
        formData.append('message', message);
        
        // Log successful submission
        console.log(`Contact form submitted by: ${email}`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff'
            },
            body: JSON.stringify({
                success: true,
                message: 'Thank you for your message. We will respond as soon as possible.'
            })
        };
        
    } catch (error) {
        console.error('Contact form error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff'
            },
            body: JSON.stringify({
                success: false,
                errors: { server: 'An error occurred. Please try again later.' }
            })
        };
    }
};