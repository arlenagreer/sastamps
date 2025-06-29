# Server-Side Form Validation Setup

This document explains how to implement server-side validation for the contact form on the SAPA website.

## Implementation Options

### Option 1: PHP Server (Traditional Hosting)

If hosting on a PHP-enabled server:

1. Upload `contact-handler.php` to your web server
2. Update the email address in line 156 to your actual contact email
3. Ensure PHP mail() function is enabled on your server
4. The form will automatically use this endpoint when detected

**Security Features:**
- Input sanitization
- Email validation
- Phone number validation
- Spam content detection
- Rate limiting (3 submissions per hour per IP)
- CSRF protection headers
- XSS prevention

### Option 2: Netlify Functions (Recommended for Static Hosting)

If hosting on Netlify:

1. The serverless function is already configured in `/netlify/functions/contact-form.js`
2. Deploy your site to Netlify
3. The form will automatically detect Netlify hosting and use the function endpoint
4. Configure environment variables in Netlify dashboard if using email service

**Features:**
- Same validation as PHP version
- Automatic scaling
- No server maintenance required
- Built-in logging

### Option 3: Third-Party Services

For GitHub Pages or other static hosts without serverless support:

1. **Formspree**: Add `action="https://formspree.io/f/YOUR_FORM_ID"` to your form
2. **EmailJS**: Integrate EmailJS SDK for client-side email sending
3. **Netlify Forms**: Add `netlify` attribute to form tag even on GitHub Pages

## Form Field Validation Rules

### Client-Side (Immediate Feedback)
- Required field checking
- Email format validation
- Real-time error messages

### Server-Side (Security & Data Integrity)
- **Name**: 2-100 characters, sanitized
- **Email**: Valid email format, sanitized
- **Phone**: Valid US phone number (10 digits), optional
- **Subject**: 3-200 characters, sanitized
- **Message**: 10-5000 characters, sanitized
- **Spam Check**: Common spam patterns blocked
- **Rate Limiting**: Max 3 submissions per hour per IP

## Testing the Form

1. **Test Valid Submission:**
   - Fill all required fields with valid data
   - Submit and verify success message

2. **Test Validation:**
   - Submit with empty fields
   - Use invalid email format
   - Enter phone with invalid format
   - Submit very short or very long messages

3. **Test Security:**
   - Try submitting spam content
   - Test rate limiting with multiple submissions
   - Verify HTML/script tags are sanitized

## Customization

### Modify Validation Rules

Edit validation functions in:
- PHP: `contact-handler.php` lines 51-62
- Netlify: `netlify/functions/contact-form.js` lines 23-44

### Add Custom Fields

1. Add field to HTML form
2. Add validation in server-side handler
3. Update client-side validation in `script.js`

### Change Rate Limits

- PHP: Modify `$max_submissions` and `$time_window` in `contact-handler.php`
- Netlify: Modify `MAX_SUBMISSIONS` and `RATE_LIMIT_WINDOW` constants

## Security Considerations

1. **Never trust client-side validation alone** - always validate on server
2. **Sanitize all inputs** to prevent XSS attacks
3. **Use HTTPS** in production to protect form data in transit
4. **Implement CAPTCHA** for additional bot protection if needed
5. **Log submissions** for audit trail and debugging

## Troubleshooting

### Form Not Submitting
- Check browser console for JavaScript errors
- Verify endpoint URL is correct
- Check server logs for PHP errors
- Ensure CORS headers are properly configured

### Validation Not Working
- Confirm server-side handler is accessible
- Check for JavaScript syntax errors
- Verify form field names match validation code

### Email Not Sending (PHP)
- Verify mail() function is enabled
- Check spam folder
- Consider using SMTP service instead of mail()
- Verify 'From' domain matches hosting domain

## Future Enhancements

1. Add CAPTCHA integration (reCAPTCHA or hCaptcha)
2. Implement database logging of submissions
3. Add email notification templates
4. Create admin dashboard for viewing submissions
5. Add file upload capability with validation